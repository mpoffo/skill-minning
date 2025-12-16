import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COLLABORATORS_URL = "https://gist.githubusercontent.com/mpoffo/44443a4a18d4705a7f219ca7baa0bc5a/raw/afb26ad8fcd9e85654d29151358f9f5c75fe1954/colaboradores.json";

interface Collaborator {
  employee_id: string;
  joposition: string;
  job_description: string;
  responsabilities: string;
  employee_name: string;
  user_name: string;
  seniority: string;
  graduation: string;
  postgraduation: string | null;
  language_proficiency: string;
  certifications: string;
  PDI: string;
  feedbacks: string;
  leader_name: string;
  leader_user_name: string;
  hard_skills: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName } = await req.json();

    if (!userName) {
      return new Response(
        JSON.stringify({ error: "userName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating profile summary for: ${userName}`);

    // Fetch collaborators data
    const collaboratorsResponse = await fetch(COLLABORATORS_URL);
    if (!collaboratorsResponse.ok) {
      throw new Error("Failed to fetch collaborators data");
    }

    const collaboratorsText = await collaboratorsResponse.text();
    // Handle NaN values in JSON (with or without spaces)
    const cleanedJson = collaboratorsText
      .replace(/:\s*NaN\s*,/g, ': null,')
      .replace(/:\s*NaN\s*}/g, ': null}');
    
    let collaborators: Collaborator[];
    try {
      collaborators = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse collaborators data");
    }
    
    console.log(`Parsed ${collaborators.length} collaborators`);
    
    // Log available usernames for debugging
    const userNames = collaborators.map(c => c.user_name).slice(0, 10);
    console.log(`Sample user_names: ${userNames.join(", ")}`);

    // Find collaborator by user_name
    const collaborator = collaborators.find(
      (c) => c.user_name && c.user_name.toLowerCase() === userName.toLowerCase()
    );

    if (!collaborator) {
      console.log(`Collaborator not found for userName: ${userName}`);
      return new Response(
        JSON.stringify({ error: "Collaborator not found", summary: null }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found collaborator: ${collaborator.employee_name}`);

    // Build context from collaborator data
    const context = buildCollaboratorContext(collaborator);

    // Generate summary using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em RH que cria perfis profissionais resumidos.
REGRAS IMPORTANTES:
- Escreva APENAS UM PARÁGRAFO conciso (3-5 frases)
- Use SOMENTE as informações fornecidas - NÃO invente, NÃO infira, NÃO adicione informações
- Se um campo estiver vazio ou nulo, simplesmente não mencione
- Seja objetivo e profissional
- Escreva em português brasileiro
- Mencione cargo, senioridade, formação, certificações relevantes e pontos dos feedbacks quando disponíveis`,
          },
          {
            role: "user",
            content: `Gere um perfil profissional resumido em UM PARÁGRAFO para este colaborador baseado EXCLUSIVAMENTE nos dados abaixo:

${context}

Lembre-se: use APENAS as informações acima. Não invente nem infira nada.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate profile summary");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    console.log("Profile summary generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        summary: summary.trim(),
        collaborator: {
          name: collaborator.employee_name,
          position: collaborator.joposition,
          seniority: collaborator.seniority,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating profile summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildCollaboratorContext(collaborator: Collaborator): string {
  const parts: string[] = [];

  parts.push(`Nome: ${collaborator.employee_name}`);
  parts.push(`Cargo: ${collaborator.joposition}`);
  parts.push(`Senioridade: ${collaborator.seniority}`);
  
  if (collaborator.job_description) {
    parts.push(`Descrição do cargo: ${collaborator.job_description}`);
  }
  
  if (collaborator.responsabilities) {
    parts.push(`Responsabilidades: ${collaborator.responsabilities}`);
  }
  
  if (collaborator.graduation) {
    parts.push(`Formação: ${collaborator.graduation}`);
  }
  
  if (collaborator.postgraduation) {
    parts.push(`Pós-graduação: ${collaborator.postgraduation}`);
  }
  
  if (collaborator.language_proficiency) {
    parts.push(`Idiomas: ${collaborator.language_proficiency}`);
  }
  
  if (collaborator.certifications) {
    parts.push(`Certificações: ${collaborator.certifications}`);
  }
  
  if (collaborator.PDI) {
    const pdiItems = collaborator.PDI.split("|").filter(Boolean);
    if (pdiItems.length > 0) {
      parts.push(`Plano de Desenvolvimento (PDI): ${pdiItems.join(", ")}`);
    }
  }
  
  if (collaborator.feedbacks) {
    const feedbackItems = collaborator.feedbacks.split("|").filter(Boolean);
    if (feedbackItems.length > 0) {
      parts.push(`Feedbacks recebidos: ${feedbackItems.join(" | ")}`);
    }
  }
  
  if (collaborator.leader_name) {
    parts.push(`Líder: ${collaborator.leader_name}`);
  }
  
  if (collaborator.hard_skills) {
    const skills = collaborator.hard_skills.split("|").slice(0, 10).join(", ");
    parts.push(`Principais habilidades técnicas: ${skills}`);
  }

  return parts.join("\n");
}
