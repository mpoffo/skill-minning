import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, existingSkillNames } = await req.json();
    
    console.log('Semantic search for:', searchTerm);
    console.log('Existing skills:', existingSkillNames);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Você é um assistente de RH especializado em habilidades profissionais.
O usuário está buscando por: "${searchTerm}"

Gere uma lista de 5-8 habilidades profissionais relevantes baseadas nessa busca.
Considere:
- O termo exato digitado deve ser a primeira sugestão se for uma habilidade válida
- Sinônimos e variações do termo
- Habilidades relacionadas ao tema/assunto
- Habilidades técnicas e comportamentais relacionadas

Por exemplo:
- Se buscar "backend": sugerir "Node.js", "Java", "Python", "APIs REST", "Banco de Dados"
- Se buscar "liderança": sugerir "Gestão de Pessoas", "Comunicação", "Delegação", "Feedback"
- Se buscar "Spring": sugerir "Spring Boot", "Spring MVC", "Java", "Microserviços"

As habilidades existentes do usuário são: ${existingSkillNames.join(', ') || 'nenhuma'}

Responda APENAS com um JSON array de strings com os nomes das habilidades sugeridas, sem explicações.
Exemplo: ["React", "JavaScript", "TypeScript", "Frontend", "UI/UX"]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um assistente que responde APENAS com JSON válido, sem markdown ou explicações." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", suggestions: [searchTerm] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required", suggestions: [searchTerm] }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    console.log('AI response:', content);
    
    // Parse the JSON response, handle markdown code blocks if present
    let suggestions: string[] = [];
    try {
      let jsonContent = content.trim();
      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      suggestions = JSON.parse(jsonContent);
      
      // Ensure the search term is always first if it's a valid skill name
      if (searchTerm.trim() && !suggestions.some(s => s.toLowerCase() === searchTerm.toLowerCase())) {
        suggestions.unshift(searchTerm.trim());
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to just the search term
      suggestions = [searchTerm.trim()];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in semantic-skills function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
