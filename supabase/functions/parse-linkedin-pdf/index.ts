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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Lovable AI não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Você está analisando um PDF de perfil do LinkedIn para extrair HABILIDADES TÉCNICAS E COMPORTAMENTAIS que a pessoa POSSUI.

ONDE PROCURAR E CLASSIFICAR (use estes valores exatos para "origin"):
- "competencias" = Seção "Competências" / "Skills" / "Principais competências"
- "tecnologias" = Tecnologias e ferramentas mencionadas que a pessoa UTILIZOU
- "metodologias" = Metodologias que a pessoa APLICOU
- "certificacoes" = Certificações obtidas
- "idiomas" = Idiomas
- "experiencia" = Habilidades mencionadas em experiências profissionais

REGRAS CRÍTICAS DE EXTRAÇÃO:
1. Extraia APENAS habilidades que a pessoa POSSUI ou DOMINA
2. NÃO extraia:
   - Públicos-alvo ou destinatários (ex: "C-level", "clientes", "stakeholders")
   - Nomes de empresas, produtos ou projetos
   - Resultados ou entregas (ex: "aumento de vendas", "redução de custos")
   - Cargos ou títulos (ex: "gerente", "coordenador")
   - Ações genéricas (ex: "desenvolvimento", "planejamento", "execução")
3. Diferencie entre:
   - "Apresentou para C-level" → NÃO é habilidade
   - "Liderança de equipe" → É habilidade
   - "Entregou sistema para clientes" → NÃO é habilidade  
   - "Python" → É habilidade
4. Normalize nomes (ex: "Python programming" → "Python")
5. Remova duplicatas
6. NÃO invente habilidades não mencionadas
7. Classifique cada habilidade com sua ORIGEM (de onde foi extraída no documento)

Responda APENAS com JSON:
{"skills": [{"name": "Nome da Habilidade", "origin": "competencias"}, {"name": "Outra Habilidade", "origin": "tecnologias"}, ...]}`,
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
    let skills: Array<{name: string; origin: string}> = [];
    
    try {
      const content = aiResult.choices?.[0]?.message?.content || '';
      console.log('AI Content:', content);
      
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*"skills"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Handle both old format (string[]) and new format (object[])
        if (Array.isArray(parsed.skills)) {
          skills = parsed.skills.map((s: string | {name: string; origin: string}) => 
            typeof s === 'string' ? { name: s, origin: 'linkedin' } : s
          );
        }
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
