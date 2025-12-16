import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Senior iAssist Configuration
const AGENT_ID = "b7b682f1-002e-4c75-bc8b-546cb5e7fb04";
const API_TOKEN = "khYzKIbhrXHOsRlkc0tPRWMQp7sxD8ZW";
const BASE_URL = "https://platform-homologx.senior.com.br/t/senior-x/platform/iassist/api";

// Prompt template for talent ranking
const PROMPT_TEMPLATE = `{job_requirements}

Saída obrigatória: responda SOMENTE com um JSON válido (sem texto extra, sem markdown, sem comentários). Use exatamente este schema e preencha todos os campos:

{
  "understood_request": {
    "role": "",
    "seniority": "",
    "must_have": [],
    "nice_to_have": [],
    "context": ""
  },
  "clarifying_questions": [],
  "top_3": [
    {
      "rank": 1,
      "person_identifier": "",
      "match_score": 0,
      "summary": "",
      "evidence": {
        "hard_skills": [],
        "joposition_job_description": [],
        "responsabilities": [],
        "seniority": "",
        "certifications": [],
        "language_proficiency": "",
        "graduation_postgraduation": [],
        "pdi_feedbacks": []
      },
      "confidence": "high|medium|low",
      "gaps": []
    }
  ],
  "risks_and_gaps_overall": [],
  "assumptions_made": [],
  "next_steps": {
    "suggested_interview_checks": [],
    "suggested_filters_to_refine": []
  }
}

Regras adicionais:
(1) Sempre retornar exatamente 3 pessoas no array "top_3".
(2) Se algum dado não existir no dataset, registre em "gaps" e ajuste "confidence" e "match_score" (0–100) sem inventar informações.
(3) Não use leader_name/leader_user_name como critério de pontuação; apenas como referência se necessário.
(4) O "person_identifier" deve seguir o formato: "Cargo - Nome Completo" (ex: "Desenvolvedor de Software - João Silva Santos").
(5) O "match_score" deve ser um número inteiro de 0 a 100.
(6) A "confidence" deve ser exatamente uma destas strings: "high", "medium" ou "low".
(7) Todos os arrays devem ser preenchidos (mesmo que vazios []).
`;

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

async function createThreadWithPrompt(prompt: string): Promise<ThreadResponse> {
  const url = `${BASE_URL}/latest/threads`;
  
  console.log("📤 Sending prompt to Senior iAssist API...");
  
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
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (!data.runId || !data.threadId) {
    throw new Error("API response missing runId or threadId");
  }
  
  console.log(`✅ Thread created: threadId=${data.threadId}, runId=${data.runId}`);
  return data;
}

async function checkRunStatus(threadId: string, runId: string, maxAttempts: number = 120): Promise<string> {
  const url = `${BASE_URL}/latest/threads/${threadId}/runs/${runId}`;
  
  console.log(`⏳ Waiting for processing (max ${maxAttempts} attempts)...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 4000)); // 4 seconds between attempts
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Polling error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const status = data.status || "unknown";
    
    console.log(`   Attempt ${attempt}/${maxAttempts}: status=${status}`);
    
    if (status === "completed") {
      console.log("✅ Processing completed!");
      return status;
    }
    
    if (status === "error") {
      const errorMsg = data.error || "Unknown error";
      throw new Error(`Processing failed: ${errorMsg}`);
    }
    
    if (!["queued", "processing"].includes(status)) {
      throw new Error(`Unknown status: ${status}`);
    }
  }
  
  throw new Error("Timeout: Processing took too long");
}

async function getThreadMessages(threadId: string): Promise<string> {
  const url = `${BASE_URL}/latest/threads/${threadId}/messages`;
  
  console.log("📥 Fetching thread messages...");
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error fetching messages: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const messages: Message[] = data.messages || [];
  
  for (const msg of messages) {
    if (msg.role === "assistant") {
      for (const c of msg.content) {
        if (c.type === "text" && c.text?.value) {
          console.log("✅ Assistant response found!");
          return c.text.value;
        }
      }
    }
  }
  
  throw new Error("No assistant response found in messages");
}

function extractJsonFromResponse(text: string): any {
  let cleanText = text.trim();
  
  // Remove markdown blocks
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\w*\n?/, "").replace(/```$/, "").trim();
  }
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("⚠️ Error parsing JSON:", e);
    console.error("Received text:", cleanText.substring(0, 500));
    throw new Error(`Response is not valid JSON: ${e}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobRequirements } = await req.json();
    
    if (!jobRequirements) {
      return new Response(
        JSON.stringify({ error: "jobRequirements is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🚀 Starting AI Talent Mining for: ${jobRequirements.substring(0, 100)}...`);
    
    // 1. Build the prompt
    const prompt = PROMPT_TEMPLATE.replace("{job_requirements}", jobRequirements);
    
    // 2. Create thread and send prompt
    const threadData = await createThreadWithPrompt(prompt);
    
    // 3. Wait for processing
    await checkRunStatus(threadData.threadId, threadData.runId);
    
    // 4. Get response
    const responseText = await getThreadMessages(threadData.threadId);
    
    // 5. Extract JSON
    const rankingData = extractJsonFromResponse(responseText);
    
    console.log(`🎯 Total candidates returned: ${rankingData.top_3?.length || 0}`);
    
    return new Response(
      JSON.stringify(rankingData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("❌ Error in AI Talent Mining:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error processing AI Talent Mining", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
