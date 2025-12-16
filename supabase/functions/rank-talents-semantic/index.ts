import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequiredSkill {
  name: string;
  proficiency: number;
}

interface UserSkillMatch {
  skillName: string;
  requiredProficiency: number;
  userProficiency: number;
  similarity: number;
}

interface UserDetails {
  certifications?: string[];
  graduation?: string[];
  languages?: string;
  pdi?: string;
  feedbacks?: string[];
  hardSkills?: string[];
}

interface RankedUser {
  userId: string;
  userName: string;
  fullName: string;
  leaderName?: string;
  matchScore: number;
  matchedSkills: UserSkillMatch[];
  justification?: string;
  details?: UserDetails;
}

interface Collaborator {
  user_name: string;
  employee_name: string;
  leader_name?: string;
  certifications?: string;
  graduation?: string;
  postgraduation?: string;
  language_proficiency?: string;
  PDI?: string;
  feedbacks?: string;
  hard_skills?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantName, requiredSkills } = await req.json();

    if (!tenantName || !requiredSkills || requiredSkills.length === 0) {
      return new Response(
        JSON.stringify({ error: "tenantName and requiredSkills are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting semantic talent search for tenant: ${tenantName}`);
    console.log(`Required skills: ${requiredSkills.map((s: RequiredSkill) => s.name).join(", ")}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users for the tenant
    const { data: users, error: usersError } = await supabase
      .from("tenant_users")
      .select("id, user_name, full_name")
      .eq("tenant_name", tenantName);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log("No users found for tenant");
      return new Response(
        JSON.stringify({ rankedUsers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${users.length} users`);

    // Fetch collaborators data from external source for additional details
    let collaboratorsMapByUserName: Record<string, Collaborator> = {};
    let collaboratorsMapByName: Record<string, Collaborator> = {};
    try {
      const collabResponse = await fetch(
        "https://gist.githubusercontent.com/mpoffo/76cb8872843cfd03ff3b44c29ba1f485/raw/69460f00cfa5177ab5ddddcb067e807885b54808/gistfile1.txt"
      );
      if (collabResponse.ok) {
        const collaborators: Collaborator[] = await collabResponse.json();
        for (const collab of collaborators) {
          if (collab.user_name) {
            // Map by user_name (normalized)
            const normalizedUserName = collab.user_name.trim().toLowerCase();
            collaboratorsMapByUserName[normalizedUserName] = collab;
          }
          if (collab.employee_name) {
            // Map by employee_name (normalized) for fallback matching
            const normalizedName = collab.employee_name.trim().toLowerCase();
            collaboratorsMapByName[normalizedName] = collab;
          }
        }
        console.log(`Loaded ${Object.keys(collaboratorsMapByUserName).length} collaborators by user_name`);
        console.log(`Loaded ${Object.keys(collaboratorsMapByName).length} collaborators by employee_name`);
      }
    } catch (collabErr) {
      console.error("Error fetching collaborators data:", collabErr);
    }

    // Get all skills for the tenant
    const { data: allSkills, error: skillsError } = await supabase
      .from("skills")
      .select("id, name")
      .eq("tenant_name", tenantName);

    if (skillsError) throw skillsError;

    console.log(`Found ${allSkills?.length || 0} skills in tenant`);

    if (!allSkills || allSkills.length === 0) {
      return new Response(
        JSON.stringify({ rankedUsers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to calculate semantic similarity between required skills and existing skills
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const existingSkillNames = allSkills.map((s) => s.name);
    const requiredSkillNames = requiredSkills.map((s: RequiredSkill) => s.name);

    // Build similarity matrix using AI
    const similarityPrompt = `Você é um especialista em recursos humanos. Analise a similaridade semântica entre habilidades requeridas e habilidades existentes.

HABILIDADES REQUERIDAS:
${requiredSkillNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}

HABILIDADES EXISTENTES NO BANCO:
${existingSkillNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}

Para cada habilidade requerida, identifique as habilidades existentes que são similares (mesmo conceito, sinônimos, variações, ou relacionadas diretamente).
Retorne APENAS um JSON no formato:
{
  "matches": [
    {
      "required": "nome da habilidade requerida",
      "matches": [
        { "existing": "nome exato da habilidade existente", "similarity": 0.95 }
      ]
    }
  ]
}

REGRAS:
- similarity deve ser entre 0 e 1 (1 = idêntico ou sinônimo perfeito, 0.8+ = muito similar, 0.5-0.8 = relacionado)
- Inclua apenas matches com similarity >= 0.5
- Use os nomes EXATOS das habilidades existentes
- Considere sinônimos em português e inglês (ex: "Liderança" e "Leadership" = 1.0)
- Considere variações (ex: "Excel" e "Microsoft Excel" = 0.95)
- Considere habilidades relacionadas (ex: "Python" e "Programação" = 0.7)`;

    console.log("Calling AI for semantic similarity...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: similarityPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";

    console.log("AI response received, parsing...");

    // Parse similarity matrix
    let similarityMatrix: Record<string, Array<{ skillId: string; skillName: string; similarity: number }>> = {};
    
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        for (const match of parsed.matches || []) {
          const requiredName = match.required?.toLowerCase();
          if (!requiredName) continue;
          
          similarityMatrix[requiredName] = [];
          
          for (const m of match.matches || []) {
            const existingSkill = allSkills.find(
              (s) => s.name.toLowerCase() === m.existing?.toLowerCase()
            );
            if (existingSkill && m.similarity >= 0.5) {
              similarityMatrix[requiredName].push({
                skillId: existingSkill.id,
                skillName: existingSkill.name,
                similarity: m.similarity,
              });
            }
          }
        }
      }
    } catch (parseError) {
      console.error("Error parsing AI similarity response:", parseError);
    }

    console.log("Similarity matrix built:", Object.keys(similarityMatrix).length, "required skills mapped");

    // Get all user_skills
    const { data: userSkills, error: userSkillsError } = await supabase
      .from("user_skills")
      .select("user_id, skill_id, proficiency")
      .eq("tenant_name", tenantName);

    if (userSkillsError) throw userSkillsError;

    console.log(`Found ${userSkills?.length || 0} user_skills records`);

    // Build user skill map: userId -> skillId -> proficiency
    const userSkillMap: Record<string, Record<string, number>> = {};
    (userSkills || []).forEach((us) => {
      if (!userSkillMap[us.user_id]) {
        userSkillMap[us.user_id] = {};
      }
      userSkillMap[us.user_id][us.skill_id] = us.proficiency;
    });

    // Calculate scores for each user
    const rankedUsers: RankedUser[] = [];

    for (const user of users) {
      // Use user_name instead of UUID id since user_skills.user_id stores the username
      const userSkillData = userSkillMap[user.user_name] || {};
      const matchedSkills: UserSkillMatch[] = [];
      let totalWeightedScore = 0;
      let maxPossibleScore = 0;
      
      // Track which user skills have been used to avoid counting the same skill multiple times
      const usedUserSkillIds = new Set<string>();

      for (const required of requiredSkills as RequiredSkill[]) {
        const requiredNameLower = required.name.toLowerCase();
        const matchingSkills = similarityMatrix[requiredNameLower] || [];
        
        // Find the best matching skill the user has (that hasn't been used yet)
        let bestMatch: { skillId: string; skillName: string; userProficiency: number; similarity: number } | null = null;
        
        for (const match of matchingSkills) {
          // Skip if this user skill was already matched to another required skill
          if (usedUserSkillIds.has(match.skillId)) continue;
          
          const userProficiency = userSkillData[match.skillId];
          if (userProficiency !== undefined) {
            if (!bestMatch || 
                (match.similarity * userProficiency) > (bestMatch.similarity * bestMatch.userProficiency)) {
              bestMatch = {
                skillId: match.skillId,
                skillName: match.skillName,
                userProficiency,
                similarity: match.similarity,
              };
            }
          }
        }

        // Weight by required proficiency
        const weight = required.proficiency;
        maxPossibleScore += weight * 5; // Max 5 stars

        if (bestMatch) {
          // Mark this user skill as used
          usedUserSkillIds.add(bestMatch.skillId);
          
          matchedSkills.push({
            skillName: required.name, // Show the REQUIRED skill name, not the user's
            requiredProficiency: required.proficiency,
            userProficiency: bestMatch.userProficiency,
            similarity: bestMatch.similarity,
          });
          
          // Score = similarity * userProficiency * weight
          // Higher proficiency and higher similarity = higher score
          totalWeightedScore += bestMatch.similarity * bestMatch.userProficiency * weight;
        }
      }

      // Only include users who have at least one matching skill
      if (matchedSkills.length > 0 && maxPossibleScore > 0) {
        const matchScore = (totalWeightedScore / maxPossibleScore) * 100;
        
        // Get collaborator details - try matching by user_name first, then by full_name/employee_name
        const normalizedUserName = user.user_name.trim().toLowerCase();
        const normalizedFullName = (user.full_name || "").trim().toLowerCase();
        
        let collab = collaboratorsMapByUserName[normalizedUserName];
        if (!collab && normalizedFullName) {
          collab = collaboratorsMapByName[normalizedFullName];
        }
        
        if (!collab) {
          console.log(`No collaborator found for user: ${user.user_name} / ${user.full_name}`);
        }
        
        // Parse details from collaborator data
        const details: UserDetails | undefined = collab ? {
          certifications: collab.certifications ? collab.certifications.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
          graduation: [
            ...(collab.graduation ? collab.graduation.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
            ...(collab.postgraduation ? collab.postgraduation.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
          ].filter(Boolean).length > 0 
            ? [
                ...(collab.graduation ? collab.graduation.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
                ...(collab.postgraduation ? collab.postgraduation.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
              ]
            : undefined,
          languages: collab.language_proficiency || undefined,
          pdi: collab.PDI || undefined,
          feedbacks: collab.feedbacks ? collab.feedbacks.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
          hardSkills: collab.hard_skills ? collab.hard_skills.split('|').map((s: string) => s.trim()).filter(Boolean) : undefined,
        } : undefined;
        
        rankedUsers.push({
          userId: user.id,
          userName: user.user_name,
          fullName: user.full_name || user.user_name,
          leaderName: collab?.leader_name,
          matchScore,
          matchedSkills,
          details,
        });
      }
    }

    // Sort by match score descending
    rankedUsers.sort((a, b) => b.matchScore - a.matchScore);

    // Generate AI justifications for top 3
    const top3 = rankedUsers.slice(0, 3);
    if (top3.length > 0) {
      const requiredSkillNames = requiredSkills.map((s: RequiredSkill) => s.name).join(", ");
      
      const justificationPrompt = `Você é um especialista em recrutamento e RH. Analise o ranking de candidatos e forneça uma justificativa CURTA (máximo 2 frases) para cada um dos top 3 candidatos.

HABILIDADES REQUERIDAS PARA A VAGA:
${requiredSkillNames}

TOP 3 CANDIDATOS:
${top3.map((u, i) => `${i + 1}. ${u.fullName} (${Math.round(u.matchScore)}% aderência)
   Habilidades correspondentes: ${u.matchedSkills.map(s => `${s.skillName} (${s.userProficiency}★)`).join(", ")}`).join("\n\n")}

Retorne APENAS um JSON no formato:
{
  "justifications": [
    { "userName": "nome_usuario", "text": "Justificativa curta explicando por que este candidato é adequado." }
  ]
}

REGRAS:
- Seja objetivo e específico
- Mencione as principais habilidades que destacam cada candidato
- Destaque pontos fortes e diferenciais
- Use linguagem profissional em português`;

      try {
        const justResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: justificationPrompt },
            ],
          }),
        });

        if (justResponse.ok) {
          const justData = await justResponse.json();
          const justContent = justData.choices?.[0]?.message?.content || "{}";
          
          try {
            const jsonMatch = justContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              for (const just of parsed.justifications || []) {
                const user = rankedUsers.find(u => u.userName === just.userName);
                if (user) {
                  user.justification = just.text;
                }
              }
            }
          } catch (parseErr) {
            console.error("Error parsing justifications:", parseErr);
          }
        }
      } catch (justErr) {
        console.error("Error generating justifications:", justErr);
      }
    }

    console.log(`Returning ${rankedUsers.length} ranked users`);

    return new Response(
      JSON.stringify({ rankedUsers: rankedUsers.slice(0, 20) }), // Top 20
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in rank-talents-semantic:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
