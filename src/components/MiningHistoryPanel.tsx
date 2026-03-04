import { useState } from "react";
import { MiningHistoryEntry } from "@/hooks/useMiningHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory, faTrash, faRotateLeft, faBriefcase, faRobot, faTimes, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface MiningHistoryPanelProps {
  history: MiningHistoryEntry[];
  onRestore: (entry: MiningHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MiningHistoryPanel({ history, onRestore, onRemove, onClear }: MiningHistoryPanelProps) {
  const [open, setOpen] = useState(false);

  const handleRestore = (entry: MiningHistoryEntry) => {
    onRestore(entry);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-sml relative" title="Histórico de minerações">
          <FontAwesomeIcon icon={faHistory} />
          Histórico
          {history.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {history.length > 9 ? "9+" : history.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-big pt-big pb-medium border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-sml text-h3-bold">
              <FontAwesomeIcon icon={faHistory} className="text-primary" />
              Histórico de Minerações
            </SheetTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-small gap-xsmall"
              >
                <FontAwesomeIcon icon={faTrash} />
                Limpar tudo
              </Button>
            )}
          </div>
          <p className="text-small text-muted-foreground">
            {history.length === 0
              ? "Nenhuma mineração realizada ainda"
              : `${history.length} mineraç${history.length === 1 ? "ão" : "ões"} salva${history.length === 1 ? "" : "s"}`}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-medium space-y-sml">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xxbig text-center text-muted-foreground gap-sml">
              <FontAwesomeIcon icon={faHistory} className="text-4xl opacity-20" />
              <p className="text-label">Execute uma mineração para criar seu primeiro registro de histórico.</p>
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="group relative border border-border rounded-big p-default bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-sml mb-sml">
                  <div className="flex items-center gap-xsmall flex-1 min-w-0">
                    <div className={`w-7 h-7 rounded-medium flex items-center justify-center flex-shrink-0 ${entry.mode === "ai" ? "bg-primary/10" : "bg-success/10"}`}>
                      <FontAwesomeIcon
                        icon={entry.mode === "ai" ? faRobot : faBriefcase}
                        className={entry.mode === "ai" ? "text-primary text-xs" : "text-success text-xs"}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-label font-semibold text-foreground truncate">
                        {entry.mode === "traditional"
                          ? (entry.jobName || "Mineração por Cargo")
                          : "Busca com IA"}
                      </p>
                      <p className="text-small text-muted-foreground">{formatDate(entry.createdAt)}</p>
                    </div>
                  </div>
                  <Badge
                    className={`flex-shrink-0 text-small border-0 ${
                      entry.mode === "ai"
                        ? "bg-primary/10 text-primary"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {entry.mode === "ai" ? "IA" : "Cargo"}
                  </Badge>
                </div>

                {/* Summary */}
                {entry.mode === "traditional" && entry.requiredSkills && (
                  <div className="flex flex-wrap gap-xxsmall mb-sml">
                    {entry.requiredSkills.slice(0, 4).map((s) => (
                      <span key={s.name} className="text-small bg-muted text-muted-foreground rounded px-xsmall py-xxsmall">
                        {s.name}
                      </span>
                    ))}
                    {entry.requiredSkills.length > 4 && (
                      <span className="text-small bg-muted text-muted-foreground rounded px-xsmall py-xxsmall">
                        +{entry.requiredSkills.length - 4}
                      </span>
                    )}
                  </div>
                )}
                {entry.mode === "ai" && entry.aiQuery && (
                  <p className="text-small text-muted-foreground line-clamp-2 mb-sml">
                    {entry.aiQuery}
                  </p>
                )}

                {/* Candidates count */}
                <div className="flex items-center justify-between">
                  <span className="text-small text-muted-foreground">
                    {entry.mode === "traditional"
                      ? `${entry.rankedUsers?.length || 0} candidato${(entry.rankedUsers?.length || 0) !== 1 ? "s" : ""} encontrado${(entry.rankedUsers?.length || 0) !== 1 ? "s" : ""}`
                      : `${entry.aiResult?.top_3?.length || 0} candidato${(entry.aiResult?.top_3?.length || 0) !== 1 ? "s" : ""} no ranking`}
                  </span>

                  <div className="flex items-center gap-xsmall">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(entry.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover do histórico"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRestore(entry)}
                      className="h-7 gap-xsmall text-small"
                    >
                      <FontAwesomeIcon icon={faRotateLeft} />
                      Restaurar
                      <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
