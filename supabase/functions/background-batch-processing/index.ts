import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COLLABORATORS_URL = "https://gist.githubusercontent.com/mpoffo/76cb8872843cfd03ff3b44c29ba1f485/raw/69460f00cfa5177ab5ddddcb067e807885b54808/gistfile1.txt";
const BATCH_SIZE = 25;
const DELAY_BETWEEN_BATCHES = 1500;

interface Collaborator {
  employee_id: string;
  user_name: string;
  employee_name: string;
  job_position: string;
  seniority: string;
  responsabilities: string;
  graduation: string;
  postgraduation: string;
  certifications: string;
  language_proficiency: string;
  PDI: string;
  feedback: string;
  hard_skills?: string;
}

interface ExtractedSkill {
  name: string;
  proficiency: number;
  origin: string;
}

// Background processing function
async function processInBackground(jobId: string, tenantName: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const addLog = async (message: string, type: string) => {
    const { data: job } = await supabase.from('batch_jobs').select('logs').eq('id', jobId).single();
    const logs = job?.logs || [];
    logs.unshift({ timestamp: new Date().toISOString(), message, type });
    await supabase.from('batch_jobs').update({ logs: logs.slice(0, 100) }).eq('id', jobId);
  };

  try {
    // Load collaborators
    await addLog("Carregando lista de colaboradores...", "info");
    const response = await fetch(COLLABORATORS_URL);
    if (!response.ok) throw new Error("Failed to fetch collaborators");
    
    const collaborators: Collaborator[] = await response.json();
    const totalBatches = Math.ceil(collaborators.length / BATCH_SIZE);
    
    await supabase.from('batch_jobs').update({
      status: 'running',
      total_collaborators: collaborators.length,
      total_batches: totalBatches,
      started_at: new Date().toISOString(),
    }).eq('id', jobId);
    
    await addLog(`${collaborators.length} colaboradores carregados (${totalBatches} lotes)`, "success");

    // Process batches
    const batches: Collaborator[][] = [];
    for (let i = 0; i < collaborators.length; i += BATCH_SIZE) {
      batches.push(collaborators.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      // Check if job was cancelled or paused
      const { data: currentJob } = await supabase.from('batch_jobs').select('status').eq('id', jobId).single();
      if (currentJob?.status === 'cancelled') {
        await addLog("Processamento cancelado pelo usuário", "warning");
        return;
      }
      if (currentJob?.status === 'paused') {
        await addLog("Processamento pausado - aguardando retomada", "warning");
        // Wait for resume or cancel
        let waitCount = 0;
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: checkJob } = await supabase.from('batch_jobs').select('status').eq('id', jobId).single();
          if (checkJob?.status === 'running') break;
          if (checkJob?.status === 'cancelled') {
            await addLog("Processamento cancelado", "warning");
            return;
          }
          waitCount++;
          if (waitCount > 300) { // 10 minutes timeout
            await addLog("Timeout aguardando retomada", "error");
            await supabase.from('batch_jobs').update({ status: 'error' }).eq('id', jobId);
            return;
          }
        }
        await addLog("Processamento retomado", "info");
      }

      const batch = batches[i];
      await addLog(`Processando lote ${i + 1}/${batches.length} (${batch.length} colaboradores)...`, "info");
      
      await supabase.from('batch_jobs').update({ current_batch: i }).eq('id', jobId);

      // Process batch with AI
      const result = await processBatchWithAI(batch, tenantName);
      
      if (result) {
        const dbResults = await saveResultsToDatabase(supabase, result.results, batch, tenantName);
        
        // Update stats
        const { data: stats } = await supabase.from('batch_jobs').select('processed_collaborators, skills_extracted, skills_created, users_created').eq('id', jobId).single();
        await supabase.from('batch_jobs').update({
          processed_collaborators: (stats?.processed_collaborators || 0) + batch.length,
          skills_extracted: (stats?.skills_extracted || 0) + dbResults.totalSkillsExtracted,
          skills_created: (stats?.skills_created || 0) + dbResults.skillsCreated,
          users_created: (stats?.users_created || 0) + dbResults.usersCreated,
        }).eq('id', jobId);

        await addLog(
          `Lote ${i + 1} concluído: ${dbResults.totalSkillsExtracted} skills extraídas, ${dbResults.skillsCreated} novas skills criadas`,
          "success"
        );
      } else {
        const { data: stats } = await supabase.from('batch_jobs').select('processed_collaborators, errors').eq('id', jobId).single();
        await supabase.from('batch_jobs').update({
          processed_collaborators: (stats?.processed_collaborators || 0) + batch.length,
          errors: (stats?.errors || 0) + 1,
        }).eq('id', jobId);
        await addLog(`Erro no lote ${i + 1}`, "error");
      }

      // Delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Mark as completed
    await supabase.from('batch_jobs').update({
      status: 'completed',
      current_batch: batches.length,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    
    await addLog("Processamento concluído!", "success");
    
  } catch (error) {
    console.error('Background processing error:', error);
    await addLog(`Erro fatal: ${error}`, "error");
    await supabase.from('batch_jobs').update({ status: 'error' }).eq('id', jobId);
  }
}

async function processBatchWithAI(batch: Collaborator[], tenantName: string): Promise<{ results: Record<string, ExtractedSkill[]> } | null> {
  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const collaboratorsData = batch.map(c => {
      const seniorityLower = (c.seniority || '').toLowerCase();
      let proficiencyRange = '3-4';
      if (seniorityLower.includes('junior') || seniorityLower.includes('trainee') || seniorityLower.includes('estagiário')) {
        proficiencyRange = '2-3';
      } else if (seniorityLower.includes('senior') || seniorityLower.includes('sênior') || seniorityLower.includes('especialista') || seniorityLower.includes('líder') || seniorityLower.includes('gerente')) {
        proficiencyRange = '4-5';
      }
      return {
        user_name: c.user_name,
        proficiency_range: proficiencyRange,
        data: {
          responsabilities: c.responsabilities || '',
          graduation: c.graduation || '',
          postgraduation: c.postgraduation || '',
          certifications: c.certifications || '',
          language_proficiency: c.language_proficiency || '',
          PDI: c.PDI || '',
        }
      };
    });

    const systemPrompt = `Você é um especialista em extração de habilidades técnicas (hard skills).
Analise os dados de cada colaborador e extraia APENAS habilidades técnicas concretas.

REGRAS:
1. Extraia APENAS hard skills técnicas (tecnologias, ferramentas, metodologias, idiomas, certificações)
2. NÃO extraia soft skills (comunicação, liderança, trabalho em equipe)
3. Normalize os nomes das skills (ex: "JavaScript" não "JS", "Python" não "python")
4. Classifique cada skill por origem: responsabilidades, certificacoes, formacao, idiomas, PDI
5. Use proficiency no range indicado para cada colaborador
6. Máximo de 15 skills por colaborador

FORMATO DE RESPOSTA:
- Retorne APENAS JSON puro, sem markdown, sem \`\`\`json
- Comece diretamente com { e termine com }

Estrutura: {"results":{"user_name_1":[{"name":"Skill","proficiency":4,"origin":"responsabilidades"}]}}`;

    const userPrompt = `Extraia as habilidades técnicas:
${JSON.stringify(collaboratorsData, null, 2)}

Responda APENAS com JSON puro.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    // Clean markdown if present
    content = content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    const jsonMatch = content.match(/^\s*(\{[\s\S]*\})\s*$/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    const fallbackMatch = content.match(/\{[\s\S]*\}/);
    if (fallbackMatch) {
      return JSON.parse(fallbackMatch[0]);
    }
    
    throw new Error("No JSON found in AI response");
  } catch (error) {
    console.error('AI processing error:', error);
    return null;
  }
}

async function saveResultsToDatabase(
  supabase: any,
  results: Record<string, ExtractedSkill[]>,
  batch: Collaborator[],
  tenantName: string
) {
  let skillsCreated = 0;
  let usersCreated = 0;
  let totalSkillsExtracted = 0;

  for (const collaborator of batch) {
    const skills = results[collaborator.user_name];
    if (!skills || skills.length === 0) continue;

    totalSkillsExtracted += skills.length;

    // Upsert tenant_user
    const { data: existingUser } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("user_name", collaborator.user_name)
      .eq("tenant_name", tenantName)
      .single();

    if (!existingUser) {
      const { error: userError } = await supabase.from("tenant_users").insert({
        user_name: collaborator.user_name,
        full_name: collaborator.employee_name,
        email: `${collaborator.user_name}@senior.com.br`,
        tenant_name: tenantName,
      });
      if (!userError) usersCreated++;
    }

    // Process each skill
    for (const skill of skills) {
      const { data: existingSkill } = await supabase
        .from("skills")
        .select("id")
        .eq("name", skill.name)
        .eq("tenant_name", tenantName)
        .single();

      let skillId: string;

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const { data: newSkill, error: skillError } = await supabase
          .from("skills")
          .insert({ name: skill.name, tenant_name: tenantName, validated: false })
          .select("id")
          .single();

        if (skillError || !newSkill) continue;
        skillId = newSkill.id;
        skillsCreated++;
      }

      const { data: existingUserSkill } = await supabase
        .from("user_skills")
        .select("id")
        .eq("user_id", collaborator.user_name)
        .eq("skill_id", skillId)
        .eq("tenant_name", tenantName)
        .single();

      if (!existingUserSkill) {
        await supabase.from("user_skills").insert({
          user_id: collaborator.user_name,
          skill_id: skillId,
          tenant_name: tenantName,
          proficiency: skill.proficiency,
        });
      }
    }
  }

  return { skillsCreated, usersCreated, totalSkillsExtracted };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, jobId, tenantName } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'start') {
      // Check for existing running job
      const { data: existingJob } = await supabase
        .from('batch_jobs')
        .select('id, status')
        .eq('tenant_name', tenantName)
        .in('status', ['pending', 'running', 'paused'])
        .single();

      if (existingJob) {
        return new Response(
          JSON.stringify({ error: 'A job is already running', jobId: existingJob.id }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new job
      const { data: newJob, error } = await supabase
        .from('batch_jobs')
        .insert({ tenant_name: tenantName, status: 'pending' })
        .select('id')
        .single();

      if (error || !newJob) {
        throw new Error('Failed to create job');
      }

      console.log(`Starting background batch job: ${newJob.id}`);

      // Start background processing using waitUntil
      EdgeRuntime.waitUntil(processInBackground(newJob.id, tenantName));

      return new Response(
        JSON.stringify({ jobId: newJob.id, status: 'started' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'pause') {
      await supabase.from('batch_jobs').update({ status: 'paused' }).eq('id', jobId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'resume') {
      await supabase.from('batch_jobs').update({ status: 'running' }).eq('id', jobId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel') {
      await supabase.from('batch_jobs').update({ status: 'cancelled' }).eq('id', jobId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: job } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('tenant_name', tenantName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return new Response(
        JSON.stringify({ job }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
