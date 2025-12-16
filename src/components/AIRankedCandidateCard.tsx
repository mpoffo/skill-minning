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

  const getRankIcon = () => {
    switch (candidate.rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">1</span>
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-grayscale-40 flex items-center justify-center">
            <span className="text-white font-bold text-sm">2</span>
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-feedback-warning flex items-center justify-center">
            <span className="text-white font-bold text-sm">3</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-grayscale-20 flex items-center justify-center">
            <span className="text-foreground font-bold text-sm">{candidate.rank}</span>
          </div>
        );
    }
  };

  const getMatchBadgeColor = () => {
    if (candidate.match_score >= 80) return "border-[#22c55e] text-[#22c55e] bg-transparent";
    if (candidate.match_score >= 60) return "border-feedback-warning text-feedback-warning bg-transparent";
    return "border-feedback-error text-feedback-error bg-transparent";
  };

  const getMatchBarColor = () => {
    if (candidate.match_score >= 80) return "bg-[#22c55e]";
    if (candidate.match_score >= 60) return "bg-feedback-warning";
    return "bg-feedback-error";
  };

  const getMatchLabel = () => {
    if (candidate.match_score >= 80) return "Alta";
    if (candidate.match_score >= 60) return "Média";
    return "Baixa";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border bg-card transition-all shadow-sm",
          candidate.rank === 1 && "border-primary",
          candidate.rank === 2 && "border-grayscale-40",
          candidate.rank === 3 && "border-feedback-warning",
          candidate.rank > 3 && "border-border"
        )}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-grayscale-5/50 transition-colors rounded-lg">
            <div className="flex items-center gap-3">
              {getRankIcon()}
              <div className="text-left">
                <h4 className="text-sm font-semibold text-foreground">
                  {displayName}
                </h4>
                {position && (
                  <span className="text-xs text-muted-foreground">
                    {position}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">
                    {Math.round(candidate.match_score)}
                  </span>
                  <p className="text-xs text-muted-foreground">Match</p>
                </div>
                <div className={cn("h-10 w-1 rounded-full", getMatchBarColor())} />
                <Badge variant="outline" className={cn("font-medium", getMatchBadgeColor())}>
                  {getMatchLabel()}
                </Badge>
              </div>
              <FontAwesomeIcon
                icon={isOpen ? faChevronUp : faChevronDown}
                className="text-muted-foreground"
              />
            </div>
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