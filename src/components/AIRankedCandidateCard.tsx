import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faGraduationCap,
  faAsterisk,
  faAward,
  faGrip,
  faClipboardList,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CandidateEvidence {
  hard_skills: string[];
  joposition_job_description: string[];
  responsabilities: string[];
  seniority: string;
  certifications: string[];
  language_proficiency: string;
  graduation_postgraduation: string[];
  pdi_feedbacks: string[];
}

interface AICandidate {
  rank: number;
  person_identifier: string;
  match_score: number;
  summary: string;
  evidence: CandidateEvidence;
  confidence: "high" | "medium" | "low";
  gaps: string[];
}

interface AIRankedCandidateCardProps {
  candidate: AICandidate;
}

export function AIRankedCandidateCard({ candidate }: AIRankedCandidateCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract name from person_identifier (format: "Cargo - Nome Completo")
  const parts = candidate.person_identifier.split(" - ");
  const displayName = parts.length > 1 ? parts.slice(1).join(" - ") : candidate.person_identifier;
  const position = parts.length > 1 ? parts[0] : "";

  const isTop = candidate.rank === 1;
  const positionLabel = isTop
    ? "🥇 Melhor correspondência encontrada"
    : `${candidate.rank}º resultado`;

  const skillsCount = candidate.evidence.hard_skills.length;
  const gapsCount = candidate.gaps.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border bg-card transition-all shadow-sm",
          isTop ? "border-primary/60" : "border-border"
        )}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-grayscale-5/50 transition-colors rounded-lg">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isTop ? "bg-primary" : "bg-grayscale-10"
                )}
              >
                <span className={cn("font-bold text-sm", isTop ? "text-white" : "text-foreground")}>
                  {candidate.rank}
                </span>
              </div>
              <div className="text-left min-w-0">
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    isTop ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {positionLabel}
                </span>
                <h4 className="text-sm font-semibold text-foreground">{displayName}</h4>
                {position && (
                  <span className="text-xs text-muted-foreground">{position}</span>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  {skillsCount > 0 && (
                    <span className="text-xs font-medium text-[#166534]">
                      {skillsCount} {skillsCount === 1 ? "habilidade evidenciada" : "habilidades evidenciadas"}
                    </span>
                  )}
                  {gapsCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {gapsCount} {gapsCount === 1 ? "gap identificado" : "gaps identificados"}
                    </span>
                  )}
                </div>
                <span className="block text-[11px] text-muted-foreground/70 tabular-nums mt-1">
                  Compatibilidade calculada: {Math.round(candidate.match_score)}%
                </span>
              </div>
            </div>
            <FontAwesomeIcon
              icon={isOpen ? faChevronUp : faChevronDown}
              className="text-muted-foreground mt-1"
            />
          </div>
        </CollapsibleTrigger>


        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-border">
            {/* Summary */}
            {candidate.summary && (
              <p className="text-sm text-muted-foreground mt-3 mb-4">
                {candidate.summary}
              </p>
            )}

            {/* Hard Skills */}
            {candidate.evidence.hard_skills.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGrip} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidate.evidence.hard_skills.map((skill, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="bg-[#e8f4fc] text-[#1e3a5f] border-0 font-normal"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {candidate.evidence.certifications.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faAward} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Certificações</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidate.evidence.certifications.map((cert, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="bg-[#e8f4fc] text-[#1e3a5f] border-0 font-normal"
                    >
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {candidate.evidence.graduation_postgraduation.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Formação</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 pl-1">
                  {candidate.evidence.graduation_postgraduation.map((edu, idx) => (
                    <li key={idx}>• {edu}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Languages */}
            {candidate.evidence.language_proficiency && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faAsterisk} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Idiomas</span>
                </div>
                <p className="text-sm text-muted-foreground">{candidate.evidence.language_proficiency}</p>
              </div>
            )}

            {/* PDI / Feedbacks */}
            {candidate.evidence.pdi_feedbacks.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faClipboardList} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">PDI / Feedbacks</span>
                </div>
                <div className="space-y-2">
                  {candidate.evidence.pdi_feedbacks.map((pdi, idx) => (
                    <div key={idx} className="p-3 bg-grayscale-5 rounded-md">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pdi}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {candidate.gaps.length > 0 && (
              <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-warning text-sm" />
                  <span className="text-sm font-semibold text-warning">Gaps Identificados</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 pl-1">
                  {candidate.gaps.map((gap, idx) => (
                    <li key={idx}>• {gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}