import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faGraduationCap,
  faGlobe,
  faCertificate,
  faCode,
  faComment,
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
          <div className="w-10 h-10 rounded-full bg-feedback-warning flex items-center justify-center">
            <span className="text-white font-bold text-label">1</span>
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-full bg-grayscale-40 flex items-center justify-center">
            <span className="text-white font-bold text-label">2</span>
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-label">3</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-grayscale-20 flex items-center justify-center">
            <span className="text-foreground font-bold text-label">{candidate.rank}</span>
          </div>
        );
    }
  };

  const getMatchBadge = () => {
    if (candidate.match_score >= 80) {
      return <Badge className="bg-feedback-success text-white">Alta</Badge>;
    } else if (candidate.match_score >= 60) {
      return <Badge className="bg-feedback-warning text-white">Média</Badge>;
    } else {
      return <Badge className="bg-feedback-error text-white">Baixa</Badge>;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-big border bg-card transition-all",
          candidate.rank === 1 && "border-feedback-warning",
          candidate.rank === 2 && "border-grayscale-40",
          candidate.rank === 3 && "border-primary",
          candidate.rank > 3 && "border-border"
        )}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-default cursor-pointer hover:bg-grayscale-5/50 transition-colors rounded-big">
            <div className="flex items-center gap-medium">
              {getRankIcon()}
              <div className="text-left">
                <h4 className="text-label font-semibold text-foreground">
                  {displayName}
                </h4>
                {position && (
                  <span className="text-small text-muted-foreground">
                    {position}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-sml">
              <div className="flex items-center gap-xsmall">
                <div className="text-right mr-sml">
                  <span className="text-h3 font-bold text-foreground">
                    {Math.round(candidate.match_score)}
                  </span>
                  <p className="text-small text-muted-foreground">Match</p>
                </div>
                <div className="h-8 w-1 bg-feedback-success rounded-full" />
                {getMatchBadge()}
              </div>
              <FontAwesomeIcon
                icon={isOpen ? faChevronUp : faChevronDown}
                className="text-muted-foreground ml-sml"
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-default pb-default pt-0 border-t border-border mt-0">
            {/* Summary */}
            {candidate.summary && (
              <p className="text-body text-muted-foreground mt-medium mb-medium">
                {candidate.summary}
              </p>
            )}

            {/* Hard Skills */}
            {candidate.evidence.hard_skills.length > 0 && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faCode} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Hard Skills</span>
                </div>
                <div className="flex flex-wrap gap-xsmall">
                  {candidate.evidence.hard_skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="bg-grayscale-5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {candidate.evidence.certifications.length > 0 && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faCertificate} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Certificações</span>
                </div>
                <div className="flex flex-wrap gap-xsmall">
                  {candidate.evidence.certifications.map((cert, idx) => (
                    <Badge key={idx} variant="outline" className="bg-grayscale-5">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {candidate.evidence.graduation_postgraduation.length > 0 && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Formação</span>
                </div>
                <ul className="text-small text-muted-foreground space-y-xsmall pl-medium list-disc">
                  {candidate.evidence.graduation_postgraduation.map((edu, idx) => (
                    <li key={idx}>{edu}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Languages */}
            {candidate.evidence.language_proficiency && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faGlobe} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Idiomas</span>
                </div>
                <p className="text-small text-muted-foreground">{candidate.evidence.language_proficiency}</p>
              </div>
            )}

            {/* PDI / Feedbacks */}
            {candidate.evidence.pdi_feedbacks.length > 0 && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faComment} className="text-muted-foreground" />
                  <span className="text-label font-semibold">PDI / Feedbacks</span>
                </div>
                <div className="space-y-xsmall">
                  {candidate.evidence.pdi_feedbacks.map((pdi, idx) => (
                    <div key={idx} className="p-sml bg-grayscale-5 rounded-medium">
                      <p className="text-small text-muted-foreground">{pdi}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {candidate.gaps.length > 0 && (
              <div className="mt-medium p-default bg-warning/10 border border-warning/30 rounded-big">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-warning" />
                  <span className="text-label font-semibold text-warning">Gaps Identificados</span>
                </div>
                <ul className="text-small text-muted-foreground space-y-xsmall pl-medium list-disc">
                  {candidate.gaps.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
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
