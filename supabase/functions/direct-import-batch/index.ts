import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL padrão - pode ser sobrescrita via parâmetro sourceUrl
const DEFAULT_COLLABORATORS_URL = "https://gist.githubusercontent.com/diegof-silva/49b4879dddee2e1b75d5216cf5cc7af9/raw";
const BATCH_SIZE = 50; // Pode ser maior porque não usa IA
const DELAY_BETWEEN_BATCHES = 500;

interface Collaborator {
  employee_id: string;
  joposition: string;
  job_description: string;
  responsabilities: string;
  employee_name: string;
  user_name: string;
  seniority: string;
  graduation: string;
  postgraduation: string;
  language_proficiency: string;
  certifications: string;
  PDI: string;
  feedbacks: string;
  leader_name: string;
  leader_user_name: string;
  hard_skills: string;
}

// Background processing function
async function processInBackground(jobId: string, tenantName: string, limit?: number, sourceUrl?: string) {
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
    let collaboratorsUrl = sourceUrl || DEFAULT_COLLABORATORS_URL;
    
    // Auto-convert gist page URLs to raw URLs
    if (collaboratorsUrl.includes('gist.github.com') && !collaboratorsUrl.includes('gist.githubusercontent.com')) {
      // Convert https://gist.github.com/user/id to https://gist.githubusercontent.com/user/id/raw
      collaboratorsUrl = collaboratorsUrl
        .replace('gist.github.com', 'gist.githubusercontent.com')
        .replace(/\/?$/, '/raw');
      await addLog(`URL convertida para raw: ${collaboratorsUrl}`, "info");
    }
    
    await addLog(`Carregando colaboradores de: ${collaboratorsUrl}`, "info");
    const response = await fetch(collaboratorsUrl);
    if (!response.ok) throw new Error(`Failed to fetch collaborators: ${response.status}`);
    
    let collaborators: Collaborator[] = await response.json();
    const totalAvailable = collaborators.length;
    
    // Apply limit if specified
    if (limit && limit > 0) {
      if (limit > totalAvailable) {
        await addLog(`Limite solicitado (${limit}) é maior que o disponível. JSON possui ${totalAvailable} colaboradores.`, "warning");
      } else {
        collaborators = collaborators.slice(0, limit);
        await addLog(`Limitando a ${limit} colaboradores (de ${totalAvailable} disponíveis)`, "info");
      }
    }
    
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

    let totalSkillsExtracted = 0;
    let totalSkillsCreated = 0;
    let totalUsersCreated = 0;
    let totalErrors = 0;

    for (let i = 0; i < batches.length; i++) {
      // Check if job was cancelled or paused
      const { data: currentJob } = await supabase.from('batch_jobs').select('status').eq('id', jobId).single();
      if (currentJob?.status === 'cancelled') {
        await addLog("Processamento cancelado pelo usuário", "warning");
        return;
      }
      if (currentJob?.status === 'paused') {
        await addLog("Processamento pausado - aguardando retomada", "warning");
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
          if (waitCount > 300) {
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

      // Process batch directly (no AI needed)
      const result = await processBatchDirectly(supabase, batch, tenantName);
      
      totalSkillsExtracted += result.skillsExtracted;
      totalSkillsCreated += result.skillsCreated;
      totalUsersCreated += result.usersCreated;
      totalErrors += result.errors;

      // Update stats
      await supabase.from('batch_jobs').update({
        processed_collaborators: (i + 1) * BATCH_SIZE > collaborators.length 
          ? collaborators.length 
          : (i + 1) * BATCH_SIZE,
        skills_extracted: totalSkillsExtracted,
        skills_created: totalSkillsCreated,
        users_created: totalUsersCreated,
        errors: totalErrors,
      }).eq('id', jobId);

      await addLog(
        `Lote ${i + 1} concluído: ${result.skillsExtracted} skills importadas, ${result.skillsCreated} novas`,
        result.errors > 0 ? "warning" : "success"
      );

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
    
    await addLog(`Importação concluída! ${totalSkillsExtracted} skills, ${totalUsersCreated} usuários criados`, "success");
    
  } catch (error) {
    console.error('Background processing error:', error);
    await addLog(`Erro fatal: ${error}`, "error");
    await supabase.from('batch_jobs').update({ status: 'error' }).eq('id', jobId);
  }
}

async function processBatchDirectly(
  supabase: any,
  batch: Collaborator[],
  tenantName: string
): Promise<{ skillsExtracted: number; skillsCreated: number; usersCreated: number; errors: number }> {
  let skillsExtracted = 0;
  let skillsCreated = 0;
  let usersCreated = 0;
  let errors = 0;

  for (const collaborator of batch) {
    try {
      // Skip if no user_name or hard_skills
      if (!collaborator.user_name || !collaborator.hard_skills) {
        console.log(`Skipping collaborator without user_name or hard_skills: ${collaborator.employee_name}`);
        continue;
      }

      // Upsert tenant_user
      const { data: existingUser } = await supabase
        .from("tenant_users")
        .select("id")
        .eq("user_name", collaborator.user_name)
        .eq("tenant_name", tenantName)
        .maybeSingle();

      if (!existingUser) {
        const { error: userError } = await supabase.from("tenant_users").insert({
          user_name: collaborator.user_name,
          full_name: collaborator.employee_name,
          email: `${collaborator.user_name}@${tenantName}`,
          tenant_name: tenantName,
        });
        if (!userError) usersCreated++;
      }

      // Parse hard_skills (separated by |)
      const skills = collaborator.hard_skills
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Determine proficiency based on seniority
      const seniorityLower = (collaborator.seniority || '').toLowerCase();
      let proficiency = 3;
      if (seniorityLower.includes('junior') || seniorityLower.includes('júnior') || seniorityLower.includes('trainee') || seniorityLower.includes('estagiário')) {
        proficiency = 2;
      } else if (seniorityLower.includes('pleno')) {
        proficiency = 3;
      } else if (seniorityLower.includes('senior') || seniorityLower.includes('sênior') || seniorityLower.includes('especialista') || seniorityLower.includes('líder') || seniorityLower.includes('gerente')) {
        proficiency = 4;
      }

      // Process each skill
      for (const skillName of skills) {
        skillsExtracted++;

        // Check if skill exists
        const { data: existingSkill } = await supabase
          .from("skills")
          .select("id")
          .eq("name", skillName)
          .eq("tenant_name", tenantName)
          .maybeSingle();

        let skillId: string;

        if (existingSkill) {
          skillId = existingSkill.id;
        } else {
          // Create new skill
          const { data: newSkill, error: skillError } = await supabase
            .from("skills")
            .insert({ name: skillName, tenant_name: tenantName, validated: false })
            .select("id")
            .single();

          if (skillError || !newSkill) {
            console.error(`Error creating skill ${skillName}:`, skillError);
            errors++;
            continue;
          }
          skillId = newSkill.id;
          skillsCreated++;
        }

        // Check if user_skill exists
        const { data: existingUserSkill } = await supabase
          .from("user_skills")
          .select("id")
          .eq("user_id", collaborator.user_name)
          .eq("skill_id", skillId)
          .eq("tenant_name", tenantName)
          .maybeSingle();

        if (!existingUserSkill) {
          const { error: userSkillError } = await supabase.from("user_skills").insert({
            user_id: collaborator.user_name,
            skill_id: skillId,
            tenant_name: tenantName,
            proficiency: proficiency,
          });
          if (userSkillError) {
            console.error(`Error creating user_skill:`, userSkillError);
            errors++;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing collaborator ${collaborator.user_name}:`, error);
      errors++;
    }
  }

  return { skillsExtracted, skillsCreated, usersCreated, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, jobId, tenantName, limit, sourceUrl } = await req.json();
    
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
        .maybeSingle();

      if (existingJob) {
        return new Response(
          JSON.stringify({ error: 'Um job já está em execução', jobId: existingJob.id }),
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

      console.log(`Starting direct import batch job: ${newJob.id}, sourceUrl: ${sourceUrl || 'default'}`);

      // Start background processing using waitUntil
      EdgeRuntime.waitUntil(processInBackground(newJob.id, tenantName, limit, sourceUrl));

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
        .maybeSingle();

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
