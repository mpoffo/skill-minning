import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobPositionName, jobPositionDescription } = await req.json();

    if (!jobPositionName || !jobPositionDescription) {
      return new Response(
        JSON.stringify({ error: "jobPositionName and jobPositionDescription are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em recursos humanos e gestão de competências.
Sua tarefa é identificar as habilidades técnicas e comportamentais necessárias para um cargo específico.

REGRAS:
1. Retorne entre 5 e 15 habilidades relevantes
2. Foque em habilidades específicas e mensuráveis
3. Inclua tanto hard skills quanto soft skills
4. Considere o contexto brasileiro de mercado de trabalho
5. Retorne APENAS um array JSON com os nomes das habilidades, sem explicações

Exemplo de resposta válida:
["Liderança de equipe", "Gestão de projetos", "Excel avançado", "Comunicação assertiva", "Análise de dados"]`;

    const userPrompt = `Identifique as habilidades necessárias para o seguinte cargo:

**Cargo:** ${jobPositionName}

**Descrição:** ${jobPositionDescription}

Retorne APENAS o array JSON com as habilidades, sem texto adicional.`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "[]";

    // Parse the JSON array from the response
    let skills: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        skills = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      // Fallback: try to extract skills from text
      skills = content
        .split(/[,\n]/)
        .map((s: string) => s.trim().replace(/^[-•*"\d.]+\s*/, "").replace(/["']/g, ""))
        .filter((s: string) => s.length > 2 && s.length < 100);
    }

    return new Response(
      JSON.stringify({ skills }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in identify-job-skills:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
