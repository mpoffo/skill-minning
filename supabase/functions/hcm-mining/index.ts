import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações da API Senior iAssist
const AGENT_ID = "298f7b41-265d-4dc2-b6d4-6c3caf4a95f1";
const API_TOKEN = "64bjZ7tMjJecYVgl1cF6QiLxR6zmOQ8f";
const BASE_URL = "https://platform-homologx.senior.com.br/t/senior-x/platform/iassist/api";

const PROMPT_TEMPLATE = `Regras estritas: 
(1) gere no mínimo 20 hard skills; 
(2) hard skills devem ser técnicas (ferramentas, linguagens, frameworks, plataformas, métodos, padrões, conceitos e práticas) e não soft skills; 
(3) adeque profundidade ao seniority (junior/pleno/sênior); 
(4) quando a entrada for user_name, personalize com base nas colunas desse usuário, mas sempre coerente com o cargo; quando a entrada for cargo + senioridade, use registros correspondentes no dataset (ou agregue sinais do cargo) sem criar detalhes pessoais. Se alguma coluna estiver ausente, complete com inferências genéricas e plausíveis do cargo, sem "inventar histórico" do colaborador, caso o user_name passado nao exista retorne json vazio.
(5) Para cada skill, indique a origem (coluna que inspirou): responsibilities, certifications, education, experience, position, ou inferred (quando inferido do contexto geral).

Formato de saída obrigatório (JSON estrito, sem markdown):
{{"hard_skills":[{{"skill":"Python","origin":"responsibilities"}},{{"skill":"SQL","origin":"certifications"}}]}}

As skills devem ser curtas, padronizadas e sem duplicatas óbvias.

Entrada: {input_data}`;

interface ThreadResponse {
  threadId: string;
  runId: string;
}

interface MessageContent {
  type: string;
  text?: {
    value: string;
  };
}

interface Message {
  role: string;
  content: MessageContent[];
}

async function criarThreadComPrompt(prompt: string): Promise<ThreadResponse> {
  const url = `${BASE_URL}/latest/threads`;
  
  console.log("📤 Enviando prompt para API Senior iAssist...");
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_TOKEN}`
    },
    body: JSON.stringify({
      agentId: AGENT_ID,
      content: prompt
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (!data.runId || !data.threadId) {
    throw new Error("Resposta da API não contém runId ou threadId necessários");
  }
  
  console.log(`✅ Thread criada: threadId=${data.threadId}, runId=${data.runId}`);
  return data;
}

async function verificarStatusRun(threadId: string, runId: string, maxTentativas: number = 60): Promise<string> {
  const url = `${BASE_URL}/latest/threads/${threadId}/runs/${runId}`;
  
  console.log(`⏳ Aguardando processamento (máx ${maxTentativas} tentativas)...`);
  
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre tentativas
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no polling: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const status = data.status || "unknown";
    
    console.log(`   Tentativa ${tentativa}/${maxTentativas}: status=${status}`);
    
    if (status === "completed") {
      console.log("✅ Processamento concluído!");
      return status;
    }
    
    if (status === "error") {
      const errorMsg = data.error || "Erro desconhecido";
      throw new Error(`Processamento falhou: ${errorMsg}`);
    }
    
    if (!["queued", "processing"].includes(status)) {
      throw new Error(`Status desconhecido: ${status}`);
    }
  }
  
  throw new Error("Timeout: Processamento demorou mais que o esperado");
}

async function buscarMensagensThread(threadId: string): Promise<string> {
  const url = `${BASE_URL}/latest/threads/${threadId}/messages`;
  
  console.log("📥 Buscando mensagens da thread...");
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao buscar mensagens: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const mensagens: Message[] = data.messages || [];
  
  for (const msg of mensagens) {
    if (msg.role === "assistant") {
      for (const c of msg.content) {
        if (c.type === "text" && c.text?.value) {
          console.log("✅ Resposta do assistente encontrada!");
          return c.text.value;
        }
      }
    }
  }
  
  throw new Error("Nenhuma resposta do assistente encontrada nas mensagens");
}

interface HardSkillItem {
  skill: string;
  origin: string;
}

function extrairJsonDaResposta(texto: string): { hard_skills: HardSkillItem[] } {
  let textoLimpo = texto.trim();
  
  // Remove blocos de markdown
  if (textoLimpo.startsWith("```")) {
    textoLimpo = textoLimpo.replace(/^```\w*\n?/, "").replace(/```$/, "").trim();
  }
  
  try {
    const parsed = JSON.parse(textoLimpo);
    
    // Handle both old format (string[]) and new format ({skill, origin}[])
    if (Array.isArray(parsed.hard_skills)) {
      if (parsed.hard_skills.length > 0 && typeof parsed.hard_skills[0] === 'string') {
        // Old format - convert to new format with 'inferred' origin
        return {
          hard_skills: parsed.hard_skills.map((skill: string) => ({
            skill,
            origin: 'inferred'
          }))
        };
      }
    }
    
    return parsed;
  } catch (e) {
    console.error("⚠️ Erro ao parsear JSON:", e);
    console.error("Texto recebido:", textoLimpo);
    throw new Error(`Resposta não é um JSON válido: ${e}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName } = await req.json();
    
    if (!userName) {
      return new Response(
        JSON.stringify({ error: "userName é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🚀 Iniciando HCM Mining para: ${userName}`);
    
    // 1. Monta o prompt
    const prompt = PROMPT_TEMPLATE.replace("{input_data}", userName);
    
    // 2. Cria thread e envia prompt
    const threadData = await criarThreadComPrompt(prompt);
    
    // 3. Aguarda processamento
    await verificarStatusRun(threadData.threadId, threadData.runId);
    
    // 4. Busca resposta
    const respostaTexto = await buscarMensagensThread(threadData.threadId);
    
    // 5. Extrai JSON
    const skillsData = extrairJsonDaResposta(respostaTexto);
    
    console.log(`🎯 Total de skills geradas: ${skillsData.hard_skills?.length || 0}`);
    
    return new Response(
      JSON.stringify({ 
        skills: skillsData.hard_skills || [],
        userName 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("❌ Erro no HCM Mining:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro ao processar HCM Mining", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
