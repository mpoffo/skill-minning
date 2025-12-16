import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/contexts/PlatformContext";
import { useCheckAccess } from "@/hooks/useCheckAccess";
import { AccessDenied } from "@/components/AccessDenied";
import { Play, Pause, Square, CheckCircle, XCircle, Clock, Users, Zap, Database, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageFooter } from "@/components/PageFooter";
import { toast } from "sonner";

const BATCH_PROCESSING_RESOURCE = "res://senior.com.br/analytics/hcm/myAnalytics";
const BATCH_PROCESSING_PERMISSION = "Visualizar";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface BatchJob {
  id: string;
  tenant_name: string;
  status: string;
  total_collaborators: number;
  processed_collaborators: number;
  current_batch: number;
  total_batches: number;
  skills_extracted: number;
  skills_created: number;
  users_created: number;
  errors: number;
  logs: LogEntry[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const BatchProcessing = () => {
  const { userName } = usePlatform();
  const tenantName = "senior.com.br";

  // Permission check
  const { hasAccess, isChecking } = useCheckAccess({
    resource: BATCH_PROCESSING_RESOURCE,
    permission: BATCH_PROCESSING_PERMISSION,
  });

  const [job, setJob] = useState<BatchJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current job status
  const fetchJobStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('background-batch-processing', {
        body: { action: 'status', tenantName },
      });
      if (error) throw error;
      setJob(data.job || null);
    } catch (error) {
      console.error('Error fetching job status:', error);
    }
  }, [tenantName]);

  // Initial fetch
  useEffect(() => {
    fetchJobStatus();
  }, [fetchJobStatus]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('batch_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_jobs',
          filter: `tenant_name=eq.${tenantName}`,
        },
        (payload) => {
          console.log('Realtime update:', payload);
          if (payload.new) {
            setJob(payload.new as BatchJob);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantName]);

  const startProcessing = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('background-batch-processing', {
        body: { action: 'start', tenantName },
      });
      
      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        if (data.jobId) {
          await fetchJobStatus();
        }
        return;
      }
      
      toast.success("Processamento iniciado em background!");
      await fetchJobStatus();
    } catch (error) {
      console.error('Error starting processing:', error);
      toast.error('Erro ao iniciar processamento');
    } finally {
      setIsLoading(false);
    }
  };

  const pauseProcessing = async () => {
    if (!job) return;
    try {
      await supabase.functions.invoke('background-batch-processing', {
        body: { action: 'pause', jobId: job.id },
      });
      toast.info("Processamento pausado");
    } catch (error) {
      console.error('Error pausing:', error);
      toast.error('Erro ao pausar');
    }
  };

  const resumeProcessing = async () => {
    if (!job) return;
    try {
      await supabase.functions.invoke('background-batch-processing', {
        body: { action: 'resume', jobId: job.id },
      });
      toast.success("Processamento retomado");
    } catch (error) {
      console.error('Error resuming:', error);
      toast.error('Erro ao retomar');
    }
  };

  const cancelProcessing = async () => {
    if (!job) return;
    try {
      await supabase.functions.invoke('background-batch-processing', {
        body: { action: 'cancel', jobId: job.id },
      });
      toast.warning("Processamento cancelado");
    } catch (error) {
      console.error('Error cancelling:', error);
      toast.error('Erro ao cancelar');
    }
  };

  const resetView = () => {
    setJob(null);
  };

  const progressPercent = job && job.total_batches > 0 
    ? ((job.current_batch + (job.status === "completed" ? 0 : 0)) / job.total_batches) * 100 
    : 0;

  const getLogIcon = (type: string) => {
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

  const getStatusBadge = () => {
    if (!job) return null;
    switch (job.status) {
      case 'running':
        return <Badge className="bg-blue-500 animate-pulse">Processando...</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausado</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{job.status}</Badge>;
    }
  };

  // Show loading while checking permissions
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-small" />
          <p className="text-label text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (hasAccess === false) {
    return (
      <AccessDenied 
        resource={BATCH_PROCESSING_RESOURCE} 
        permission={BATCH_PROCESSING_PERMISSION} 
      />
    );
  }

  const canStart = !job || ['completed', 'cancelled', 'error'].includes(job.status);
  const isRunning = job?.status === 'running';
  const isPaused = job?.status === 'paused';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Processamento em Lote" />

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Extração de Habilidades em Lote
              </CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              O processamento é executado <strong>em segundo plano no servidor</strong>. 
              Você pode navegar para outras páginas ou até fechar o navegador - o processamento continuará.
            </p>

            {isPaused && job && (
              <div className="p-3 bg-feedback-warning/10 border border-feedback-warning/20 rounded-big">
                <p className="text-small text-foreground">
                  Processamento pausado no lote {job.current_batch + 1}/{job.total_batches}. 
                  Clique em "Continuar" para retomar.
                </p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {canStart && (
                <Button onClick={startProcessing} disabled={isLoading} className="gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Iniciar Processamento
                </Button>
              )}
              {isRunning && (
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
              {isPaused && (
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
              <Button onClick={fetchJobStatus} variant="ghost" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
              {job && ['completed', 'cancelled', 'error'].includes(job.status) && (
                <Button onClick={resetView} variant="outline" className="gap-2">
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Section */}
        {job && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Lote {Math.min(job.current_batch + 1, job.total_batches)} de {job.total_batches || "?"}
                  </span>
                  <span>{job.status === "completed" ? "100" : progressPercent.toFixed(1)}%</span>
                </div>
                <Progress value={job.status === "completed" ? 100 : progressPercent} className="h-3" />
              </div>

              {job.started_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Iniciado: {new Date(job.started_at).toLocaleString()}</span>
                </div>
              )}

              {job.completed_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Concluído: {new Date(job.completed_at).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {job && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{job.processed_collaborators}</p>
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
                    <p className="text-2xl font-bold">{job.skills_extracted}</p>
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
                    <p className="text-2xl font-bold">{job.skills_created}</p>
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
                    <p className="text-2xl font-bold">{job.users_created}</p>
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
                    <p className="text-2xl font-bold">{job.errors}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Log */}
        {job && job.logs && job.logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Log de Atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full rounded border p-4">
                <div className="space-y-2">
                  {job.logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {getLogIcon(log.type)}
                      <span className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {!job && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum processamento em andamento.</p>
                <p className="text-sm">Clique em "Iniciar Processamento" para começar.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <PageFooter 
        userName={userName || "admin"} 
        resource={BATCH_PROCESSING_RESOURCE} 
        authorized={hasAccess === true} 
      />
    </div>
  );
};

export default BatchProcessing;
