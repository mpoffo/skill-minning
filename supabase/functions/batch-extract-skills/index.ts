import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Collaborator {
  employee_id: string;
  user_name: string;
  employee_name: string;
  joposition: string; // Note: typo in source JSON
  job_description: string;
  seniority: string;
  responsabilities: string;
  graduation: string;
  postgraduation: string;
  certifications: string;
  language_proficiency: string;
  PDI: string;
  feedbacks: string;
  leader_name: string;
  leader_user_name: string;
  hard_skills?: string;
}

interface ExtractedSkill {
  name: string;
  proficiency: number;
  origin: string;
}

interface BatchResult {
  [userName: string]: ExtractedSkill[];
}

function getProficiencyFromSeniority(seniority: string): { min: number; max: number } {
  const seniorityLower = seniority?.toLowerCase() || "";
  
  if (seniorityLower.includes("sênior") || seniorityLower.includes("senior") || 
      seniorityLower.includes("especialista") || seniorityLower.includes("líder") ||
      seniorityLower.includes("gerente") || seniorityLower.includes("diretor")) {
    return { min: 4, max: 5 };
  }
  if (seniorityLower.includes("pleno") || seniorityLower.includes("mid")) {
    return { min: 3, max: 4 };
  }
  if (seniorityLower.includes("júnior") || seniorityLower.includes("junior") || 
      seniorityLower.includes("trainee") || seniorityLower.includes("estagiário")) {
    return { min: 2, max: 3 };
  }
  return { min: 3, max: 4 }; // Default to mid-level
}

// Helper function to check if a value is valid (not NaN, null, undefined, or invalid string)
function isValidValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number' && isNaN(value)) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'nan' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'n/a' || trimmed === 'none') {
      return false;
    }
  }
  return true;
}

// Helper function to sanitize and return valid string or empty string
function sanitizeValue(value: any): string {
  if (!isValidValue(value)) return "";
  return String(value).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { collaborators, tenantName } = await req.json();

    if (!collaborators || !Array.isArray(collaborators) || collaborators.length === 0) {
      return new Response(
        JSON.stringify({ error: "collaborators array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing batch of ${collaborators.length} collaborators for tenant: ${tenantName}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt with all collaborators data, filtering invalid values
    const collaboratorsData = collaborators
      .filter((c: Collaborator) => isValidValue(c.user_name)) // Skip collaborators without valid user_name
      .map((c: Collaborator) => {
        const profRange = getProficiencyFromSeniority(c.seniority || "");
        
        // Only include fields that have valid values
        const data: Record<string, string> = {};
        
        const responsabilities = sanitizeValue(c.responsabilities);
        const graduation = sanitizeValue(c.graduation);
        const postgraduation = sanitizeValue(c.postgraduation);
        const certifications = sanitizeValue(c.certifications);
        const language_proficiency = sanitizeValue(c.language_proficiency);
        const PDI = sanitizeValue(c.PDI);
        
        if (responsabilities) data.responsabilities = responsabilities;
        if (graduation) data.graduation = graduation;
        if (postgraduation) data.postgraduation = postgraduation;
        if (certifications) data.certifications = certifications;
        if (language_proficiency) data.language_proficiency = language_proficiency;
        if (PDI) data.PDI = PDI;
        
        return {
          user_name: c.user_name,
          employee_name: sanitizeValue(c.employee_name) || c.user_name,
          job_position: sanitizeValue(c.joposition) || "não informado",
          seniority: sanitizeValue(c.seniority) || "não informado",
          proficiency_range: profRange,
          data
        };
      })
      .filter((c: any) => Object.keys(c.data).length > 0); // Skip collaborators with no valid data fields

    // If all collaborators were filtered out, return empty results
    if (collaboratorsData.length === 0) {
      console.log("No valid collaborator data to process after filtering");
      return new Response(
        JSON.stringify({ 
          results: {},
          processedCount: 0,
          skippedCount: collaborators.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Valid collaborators after filtering: ${collaboratorsData.length}/${collaborators.length}`);

    const systemPrompt = `Você é um especialista em extração de habilidades profissionais.
Analise os dados de múltiplos colaboradores e extraia habilidades técnicas (hard skills) de cada um.

REGRAS IMPORTANTES:
1. Extraia APENAS habilidades técnicas concretas (tecnologias, ferramentas, metodologias, idiomas, certificações)
2. NÃO extraia: soft skills, características pessoais, cargos, resultados de negócio
3. Normalize os nomes das skills (ex: "Python" não "python", "Machine Learning" não "ML")
4. Para cada skill, classifique a origem: "responsabilidades", "formacao", "certificacoes", "idiomas", "pdi"
5. Atribua proficiência baseada no seniority do colaborador (range fornecido)
6. Idiomas devem ter proficiência baseada no nível declarado (básico=2, intermediário=3, avançado=4, fluente=5)
7. Máximo de 15 skills por colaborador

Retorne um JSON válido com a estrutura:
{
  "results": {
    "user_name_1": [
      {"name": "Skill Name", "proficiency": 4, "origin": "responsabilidades"},
      ...
    ],
    "user_name_2": [...]
  }
}`;

    const userPrompt = `Extraia as habilidades técnicas dos seguintes ${collaborators.length} colaboradores:

${JSON.stringify(collaboratorsData, null, 2)}

Lembre-se: 
- Use o range de proficiência fornecido para cada colaborador baseado no seniority
- Classifique cada skill pela sua origem nos dados
- Retorne APENAS o JSON, sem explicações`;

    console.log("Calling Lovable AI for skill extraction...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the response
    let parsedResult: { results: BatchResult };
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate and clean the results
    const cleanedResults: BatchResult = {};
    for (const [userName, skills] of Object.entries(parsedResult.results || {})) {
      if (Array.isArray(skills)) {
        cleanedResults[userName] = skills
          .filter((s: any) => s.name && typeof s.name === "string")
          .map((s: any) => ({
            name: s.name.trim(),
            proficiency: Math.min(5, Math.max(1, Number(s.proficiency) || 3)),
            origin: s.origin || "inferido"
          }))
          .slice(0, 15); // Max 15 skills per user
      }
    }

    const skippedCount = collaborators.length - collaboratorsData.length;
    console.log(`Extracted skills for ${Object.keys(cleanedResults).length} collaborators, skipped ${skippedCount} due to invalid data`);

    return new Response(
      JSON.stringify({ 
        results: cleanedResults,
        processedCount: Object.keys(cleanedResults).length,
        skippedCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in batch-extract-skills:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
