import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/contexts/PlatformContext";
import { Play, Pause, Square, CheckCircle, XCircle, Clock, Users, Zap, Database } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageFooter } from "@/components/PageFooter";

const COLLABORATORS_URL = "https://gist.githubusercontent.com/mpoffo/76cb8872843cfd03ff3b44c29ba1f485/raw/69460f00cfa5177ab5ddddcb067e807885b54808/gistfile1.txt";
const BATCH_SIZE = 25;
const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds

interface Collaborator {
  employee_id: string;
  user_name: string;
  employee_name: string;
  job_position: string;
  seniority: string;
  responsabilities: string;
  graduation: string;
  postgraduation: string;
  certifications: string;
  language_proficiency: string;
  PDI: string;
  feedback: string;
  hard_skills?: string;
}

interface ExtractedSkill {
  name: string;
  proficiency: number;
  origin: string;
}

interface LogEntry {
  timestamp: Date;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface ProcessingStats {
  collaboratorsProcessed: number;
  skillsExtracted: number;
  skillsCreated: number;
  usersCreated: number;
  errors: number;
}

type ProcessingStatus = "idle" | "loading" | "running" | "paused" | "completed" | "error";

const BatchProcessing = () => {
  const { token } = usePlatform();
  const tenantName = "senior.com.br"; // Default tenant for batch processing

  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [stats, setStats] = useState<ProcessingStats>({
    collaboratorsProcessed: 0,
    skillsExtracted: 0,
    skillsCreated: 0,
    usersCreated: 0,
    errors: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [batchTimes, setBatchTimes] = useState<number[]>([]);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>("");

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      { timestamp: new Date(), message, type },
      ...prev.slice(0, 99), // Keep last 100 logs
    ]);
  }, []);

  const calculateEstimatedTime = useCallback((completedBatches: number, totalBatches: number, avgTimePerBatch: number) => {
    const remainingBatches = totalBatches - completedBatches;
    const remainingMs = remainingBatches * avgTimePerBatch;
    
    if (remainingMs < 60000) {
      return `${Math.ceil(remainingMs / 1000)}s`;
    }
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.ceil((remainingMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, []);

  const loadCollaborators = async () => {
    setStatus("loading");
    addLog("Carregando lista de colaboradores...", "info");

    try {
      const response = await fetch(COLLABORATORS_URL);
      if (!response.ok) throw new Error("Failed to fetch collaborators");
      
      const data: Collaborator[] = await response.json();
      setCollaborators(data);
      setTotalBatches(Math.ceil(data.length / BATCH_SIZE));
      addLog(`${data.length} colaboradores carregados (${Math.ceil(data.length / BATCH_SIZE)} lotes)`, "success");
      setStatus("idle");
      return data;
    } catch (error) {
      addLog(`Erro ao carregar colaboradores: ${error}`, "error");
      setStatus("error");
      return [];
    }
  };

  const processBatch = async (batch: Collaborator[], batchIndex: number): Promise<{ results: Record<string, ExtractedSkill[]>; processedCount: number } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("batch-extract-skills", {
        body: { collaborators: batch, tenantName },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      addLog(`Erro no lote ${batchIndex + 1}: ${error}`, "error");
      return null;
    }
  };

  const saveResultsToDatabase = async (results: Record<string, ExtractedSkill[]>, batch: Collaborator[]) => {
    let skillsCreated = 0;
    let usersCreated = 0;
    let totalSkillsExtracted = 0;

    for (const collaborator of batch) {
      const skills = results[collaborator.user_name];
      if (!skills || skills.length === 0) continue;

      totalSkillsExtracted += skills.length;

      // Upsert tenant_user
      const { data: existingUser } = await supabase
        .from("tenant_users")
        .select("id")
        .eq("user_name", collaborator.user_name)
        .eq("tenant_name", tenantName)
        .single();

      if (!existingUser) {
        const { error: userError } = await supabase.from("tenant_users").insert({
          user_name: collaborator.user_name,
          full_name: collaborator.employee_name,
          email: `${collaborator.user_name}@senior.com.br`,
          tenant_name: tenantName,
        });
        if (!userError) usersCreated++;
      }

      // Process each skill
      for (const skill of skills) {
        // Upsert skill
        const { data: existingSkill } = await supabase
          .from("skills")
          .select("id")
          .eq("name", skill.name)
          .eq("tenant_name", tenantName)
          .single();

        let skillId: string;

        if (existingSkill) {
          skillId = existingSkill.id;
        } else {
          const { data: newSkill, error: skillError } = await supabase
            .from("skills")
            .insert({
              name: skill.name,
              tenant_name: tenantName,
              validated: false,
            })
            .select("id")
            .single();

          if (skillError || !newSkill) continue;
          skillId = newSkill.id;
          skillsCreated++;
        }

        // Upsert user_skill
        const { data: existingUserSkill } = await supabase
          .from("user_skills")
          .select("id")
          .eq("user_id", collaborator.user_name)
          .eq("skill_id", skillId)
          .eq("tenant_name", tenantName)
          .single();

        if (!existingUserSkill) {
          await supabase.from("user_skills").insert({
            user_id: collaborator.user_name,
            skill_id: skillId,
            tenant_name: tenantName,
            proficiency: skill.proficiency,
          });
        }
      }
    }

    return { skillsCreated, usersCreated, totalSkillsExtracted };
  };

  const startProcessing = async () => {
    let data = collaborators;
    
    if (data.length === 0) {
      data = await loadCollaborators();
      if (data.length === 0) return;
    }

    setStatus("running");
    setStartTime(new Date());
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setBatchTimes([]);
    setStats({
      collaboratorsProcessed: 0,
      skillsExtracted: 0,
      skillsCreated: 0,
      usersCreated: 0,
      errors: 0,
    });

    addLog("Iniciando processamento em lote...", "info");

    const batches: Collaborator[][] = [];
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      batches.push(data.slice(i, i + BATCH_SIZE));
    }

    for (let i = currentBatch; i < batches.length; i++) {
      if (isCancelledRef.current) {
        addLog("Processamento cancelado pelo usuário", "warning");
        setStatus("idle");
        return;
      }

      while (isPausedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (isCancelledRef.current) {
          setStatus("idle");
          return;
        }
      }

      const batchStartTime = Date.now();
      const batch = batches[i];
      
      addLog(`Processando lote ${i + 1}/${batches.length} (${batch.length} colaboradores)...`, "info");
      setCurrentBatch(i);

      const result = await processBatch(batch, i);

      if (result) {
        const dbResults = await saveResultsToDatabase(result.results, batch);
        
        setStats((prev) => ({
          collaboratorsProcessed: prev.collaboratorsProcessed + batch.length,
          skillsExtracted: prev.skillsExtracted + dbResults.totalSkillsExtracted,
          skillsCreated: prev.skillsCreated + dbResults.skillsCreated,
          usersCreated: prev.usersCreated + dbResults.usersCreated,
          errors: prev.errors,
        }));

        addLog(
          `Lote ${i + 1} concluído: ${dbResults.totalSkillsExtracted} skills extraídas, ${dbResults.skillsCreated} novas skills criadas`,
          "success"
        );
      } else {
        setStats((prev) => ({
          ...prev,
          collaboratorsProcessed: prev.collaboratorsProcessed + batch.length,
          errors: prev.errors + 1,
        }));
      }

      const batchTime = Date.now() - batchStartTime;
      setBatchTimes((prev) => {
        const newTimes = [...prev, batchTime].slice(-10); // Keep last 10 times
        const avgTime = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
        setEstimatedTimeRemaining(calculateEstimatedTime(i + 1, batches.length, avgTime + DELAY_BETWEEN_BATCHES));
        return newTimes;
      });

      // Delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    setStatus("completed");
    setCurrentBatch(batches.length);
    addLog("Processamento concluído!", "success");
  };

  const pauseProcessing = () => {
    isPausedRef.current = true;
    setStatus("paused");
    addLog("Processamento pausado", "warning");
  };

  const resumeProcessing = () => {
    isPausedRef.current = false;
    setStatus("running");
    addLog("Processamento retomado", "info");
  };

  const cancelProcessing = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setStatus("idle");
    setCurrentBatch(0);
    addLog("Processamento cancelado", "warning");
  };

  const resetProcessing = () => {
    setStatus("idle");
    setCurrentBatch(0);
    setStats({
      collaboratorsProcessed: 0,
      skillsExtracted: 0,
      skillsCreated: 0,
      usersCreated: 0,
      errors: 0,
    });
    setLogs([]);
    setEstimatedTimeRemaining("");
    setBatchTimes([]);
  };

  const progressPercent = totalBatches > 0 ? ((currentBatch + (status === "completed" ? 0 : 0)) / totalBatches) * 100 : 0;

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Zap className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Processamento em Lote" />

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Extração de Habilidades em Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Processa o arquivo de colaboradores e extrai habilidades usando IA, salvando no banco de dados.
              O processamento é feito em lotes de {BATCH_SIZE} colaboradores para otimizar performance e custo.
            </p>

            <div className="flex gap-2">
              {status === "idle" && (
                <Button onClick={startProcessing} className="gap-2">
                  <Play className="h-4 w-4" />
                  Iniciar Processamento
                </Button>
              )}
              {status === "loading" && (
                <Button disabled className="gap-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  Carregando...
                </Button>
              )}
              {status === "running" && (
                <>
                  <Button onClick={pauseProcessing} variant="outline" className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                  <Button onClick={cancelProcessing} variant="destructive" className="gap-2">
                    <Square className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
              {status === "paused" && (
                <>
                  <Button onClick={resumeProcessing} className="gap-2">
                    <Play className="h-4 w-4" />
                    Continuar
                  </Button>
                  <Button onClick={cancelProcessing} variant="destructive" className="gap-2">
                    <Square className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
              {(status === "completed" || status === "error") && (
                <Button onClick={resetProcessing} variant="outline" className="gap-2">
                  Reiniciar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Lote {Math.min(currentBatch + 1, totalBatches)} de {totalBatches || "?"}
                </span>
                <span>{progressPercent.toFixed(1)}%</span>
              </div>
              <Progress value={status === "completed" ? 100 : progressPercent} className="h-3" />
            </div>

            {estimatedTimeRemaining && status === "running" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Tempo estimado restante: {estimatedTimeRemaining}</span>
              </div>
            )}

            {status === "completed" && (
              <Badge variant="default" className="bg-green-500">
                Processamento Concluído!
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.collaboratorsProcessed}</p>
                  <p className="text-xs text-muted-foreground">Colaboradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.skillsExtracted}</p>
                  <p className="text-xs text-muted-foreground">Skills Extraídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.skillsCreated}</p>
                  <p className="text-xs text-muted-foreground">Skills Criadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.usersCreated}</p>
                  <p className="text-xs text-muted-foreground">Usuários Criados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log de Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 w-full rounded border p-4">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {getLogIcon(log.type)}
                      <span className="text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      <PageFooter 
        userName="admin" 
        resource="batch-processing" 
        authorized={true} 
      />
    </div>
  );
};

export default BatchProcessing;
