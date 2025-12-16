import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faTrophy,
  faMedal,
  faAward,
  faGraduationCap,
  faCertificate,
  faLanguage,
  faBriefcase,
  faCode,
  faTriangleExclamation,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  const getRankIcon = () => {
    switch (candidate.rank) {
      case 1:
        return <FontAwesomeIcon icon={faTrophy} className="text-yellow-500 text-xl" />;
      case 2:
        return <FontAwesomeIcon icon={faMedal} className="text-gray-400 text-xl" />;
      case 3:
        return <FontAwesomeIcon icon={faAward} className="text-orange-600 text-xl" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{candidate.rank}</span>;
    }
  };

  const getConfidenceBadge = () => {
    switch (candidate.confidence) {
      case "high":
        return <Badge className="bg-success/20 text-success border-success/30">Alta</Badge>;
      case "medium":
        return <Badge className="bg-warning/20 text-warning border-warning/30">Média</Badge>;
      case "low":
        return <Badge className="bg-error/20 text-error border-error/30">Baixa</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = () => {
    if (candidate.match_score >= 80) return "text-success";
    if (candidate.match_score >= 60) return "text-warning";
    return "text-error";
  };

  // Extract name from person_identifier (format: "Cargo - Nome Completo")
  const parts = candidate.person_identifier.split(" - ");
  const displayName = parts.length > 1 ? parts.slice(1).join(" - ") : candidate.person_identifier;
  const position = parts.length > 1 ? parts[0] : "";

  return (
    <Card className="overflow-hidden transition-all hover:shadow-dp08">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-default hover:bg-grayscale-5 transition-colors">
            <div className="flex items-center gap-sml">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {getRankIcon()}
              </div>
              <div className="text-left">
                <h3 className="text-label font-semibold text-foreground">{displayName}</h3>
                {position && (
                  <p className="text-small text-muted-foreground">{position}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-sml">
              <span className={`text-h4 font-bold ${getScoreColor()}`}>
                {candidate.match_score}%
              </span>
              {getConfidenceBadge()}
              <FontAwesomeIcon
                icon={isOpen ? faChevronUp : faChevronDown}
                className="text-muted-foreground ml-sml"
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-default space-y-medium">
            {/* Summary */}
            <div className="bg-grayscale-5 p-default rounded-big">
              <p className="text-label text-foreground">{candidate.summary}</p>
            </div>

            {/* Evidence sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-medium">
              {/* Hard Skills */}
              {candidate.evidence.hard_skills.length > 0 && (
                <div className="space-y-xsmall">
                  <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
                    <FontAwesomeIcon icon={faCode} className="text-primary" />
                    Hard Skills
                  </h4>
                  <div className="flex flex-wrap gap-xsmall">
                    {candidate.evidence.hard_skills.slice(0, 10).map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-small">
                        {skill}
                      </Badge>
                    ))}
                    {candidate.evidence.hard_skills.length > 10 && (
                      <Badge variant="outline" className="text-small">
                        +{candidate.evidence.hard_skills.length - 10}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {candidate.evidence.certifications.length > 0 && (
                <div className="space-y-xsmall">
                  <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
                    <FontAwesomeIcon icon={faCertificate} className="text-primary" />
                    Certificações
                  </h4>
                  <ul className="text-small text-muted-foreground space-y-xsmall">
                    {candidate.evidence.certifications.map((cert, idx) => (
                      <li key={idx} className="truncate">• {cert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Education */}
              {candidate.evidence.graduation_postgraduation.length > 0 && (
                <div className="space-y-xsmall">
                  <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-primary" />
                    Formação
                  </h4>
                  <ul className="text-small text-muted-foreground space-y-xsmall">
                    {candidate.evidence.graduation_postgraduation.map((edu, idx) => (
                      <li key={idx} className="truncate">• {edu}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Languages */}
              {candidate.evidence.language_proficiency && (
                <div className="space-y-xsmall">
                  <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
                    <FontAwesomeIcon icon={faLanguage} className="text-primary" />
                    Idiomas
                  </h4>
                  <p className="text-small text-muted-foreground">
                    {candidate.evidence.language_proficiency}
                  </p>
                </div>
              )}

              {/* Seniority */}
              {candidate.evidence.seniority && (
                <div className="space-y-xsmall">
                  <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
                    <FontAwesomeIcon icon={faBriefcase} className="text-primary" />
                    Senioridade
                  </h4>
                  <p className="text-small text-muted-foreground">
                    {candidate.evidence.seniority}
                  </p>
                </div>
              )}

              {/* PDI/Feedbacks */}
              {candidate.evidence.pdi_feedbacks.length > 0 && (
                <div className="space-y-xsmall">
                  <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
                    <FontAwesomeIcon icon={faClipboardList} className="text-primary" />
                    PDI / Feedbacks
                  </h4>
                  <ul className="text-small text-muted-foreground space-y-xsmall">
                    {candidate.evidence.pdi_feedbacks.slice(0, 3).map((pdi, idx) => (
                      <li key={idx} className="truncate">• {pdi}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Gaps */}
            {candidate.gaps.length > 0 && (
              <div className="mt-medium p-default bg-warning/10 border border-warning/30 rounded-big">
                <h4 className="text-label font-semibold flex items-center gap-xsmall text-warning mb-xsmall">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                  Gaps Identificados
                </h4>
                <ul className="text-small text-muted-foreground space-y-xsmall">
                  {candidate.gaps.map((gap, idx) => (
                    <li key={idx}>• {gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
