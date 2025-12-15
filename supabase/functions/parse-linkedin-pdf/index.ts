import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file provided');
      return new Response(
        JSON.stringify({ error: 'Arquivo PDF não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received file:', file.name, 'Size:', file.size);

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    console.log('File converted to base64, length:', base64Content.length);

    // Use Lovable AI Gateway to analyze the PDF
    const response = await fetch('https://jqelupfwkjgxjulediwf.supabase.co/functions/v1/ai-gateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Você está analisando um arquivo PDF de perfil do LinkedIn. 
                
Extraia TODAS as habilidades mencionadas no perfil. Procure em seções como:
- "Competências" ou "Skills"
- "Principais competências" ou "Top skills"
- Habilidades mencionadas nas experiências de trabalho
- Habilidades mencionadas na formação
- Certificações e cursos
- Qualquer outra menção a tecnologias, ferramentas, metodologias ou soft skills

REGRAS IMPORTANTES:
1. NÃO invente habilidades que não estão no documento
2. Extraia apenas o que está explicitamente escrito
3. Normalize os nomes (ex: "Python programming" → "Python")
4. Remova duplicatas
5. Inclua tanto hard skills quanto soft skills

Responda APENAS com um JSON válido no formato:
{
  "skills": ["Skill 1", "Skill 2", "Skill 3", ...]
}

Se não encontrar habilidades, retorne: {"skills": []}`,
              },
              {
                type: 'file',
                file: {
                  filename: file.name,
                  file_data: `data:application/pdf;base64,${base64Content}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar PDF com IA', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    console.log('AI Response:', JSON.stringify(aiResult));

    // Extract skills from AI response
    let skills: string[] = [];
    
    try {
      const content = aiResult.choices?.[0]?.message?.content || '';
      console.log('AI Content:', content);
      
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*"skills"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        skills = parsed.skills || [];
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    console.log('Extracted skills:', skills);

    return new Response(
      JSON.stringify({ skills }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error processing LinkedIn PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao processar arquivo';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
