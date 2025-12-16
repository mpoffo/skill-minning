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
} from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MatchedSkill {
  skillName: string;
  requiredProficiency: number;
  userProficiency: number;
  similarity: number;
}

interface UserDetails {
  certifications?: string[];
  graduation?: string[];
  languages?: string;
  pdi?: string;
  feedbacks?: string[];
  hardSkills?: string[];
}

interface RankedUserCardProps {
  rank: number;
  userName: string;
  fullName: string;
  leaderName?: string;
  matchScore: number;
  matchedSkills: MatchedSkill[];
  justification?: string;
  details?: UserDetails;
}

export function RankedUserCard({
  rank,
  userName,
  fullName,
  leaderName,
  matchScore,
  matchedSkills,
  justification,
  details,
}: RankedUserCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getRankIcon = () => {
    switch (rank) {
      case 0:
        return (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">1</span>
          </div>
        );
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-grayscale-40 flex items-center justify-center">
            <span className="text-white font-bold text-sm">2</span>
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-feedback-warning flex items-center justify-center">
            <span className="text-white font-bold text-sm">3</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-grayscale-20 flex items-center justify-center">
            <span className="text-foreground font-bold text-sm">{rank + 1}</span>
          </div>
        );
    }
  };

  const getMatchBadgeColor = () => {
    if (matchScore >= 80) return "border-[#22c55e] text-[#22c55e] bg-transparent";
    if (matchScore >= 60) return "border-feedback-warning text-feedback-warning bg-transparent";
    return "border-feedback-error text-feedback-error bg-transparent";
  };

  const getMatchBarColor = () => {
    if (matchScore >= 80) return "bg-[#22c55e]";
    if (matchScore >= 60) return "bg-feedback-warning";
    return "bg-feedback-error";
  };

  const getMatchLabel = () => {
    if (matchScore >= 80) return "Alta";
    if (matchScore >= 60) return "Média";
    return "Baixa";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border bg-card transition-all shadow-sm",
          rank === 0 && "border-primary",
          rank === 1 && "border-grayscale-40",
          rank === 2 && "border-feedback-warning",
          rank > 2 && "border-border"
        )}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-grayscale-5/50 transition-colors rounded-lg">
            <div className="flex items-center gap-3">
              {getRankIcon()}
              <div className="text-left">
                <h4 className="text-sm font-semibold text-foreground">
                  {fullName || userName}
                </h4>
                {leaderName && (
                  <span className="text-xs text-muted-foreground">
                    {leaderName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">
                    {Math.round(matchScore)}
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
            {/* Justification/Summary */}
            {justification && (
              <p className="text-sm text-muted-foreground mt-3 mb-4">
                {justification}
              </p>
            )}

            {/* Skills */}
            {(details?.hardSkills && details.hardSkills.length > 0) || matchedSkills.length > 0 ? (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGrip} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(details?.hardSkills || matchedSkills.map(s => s.skillName)).map((skill, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="bg-[#e8f4fc] text-[#1e3a5f] border-0 font-normal"
                    >
                      {typeof skill === 'string' ? skill : skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Certifications */}
            {details?.certifications && details.certifications.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faAward} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Certificações</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.certifications.map((cert, idx) => (
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
            {details?.graduation && details.graduation.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Formação</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 pl-1">
                  {details.graduation.map((edu, idx) => (
                    <li key={idx}>• {edu}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Languages */}
            {details?.languages && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faAsterisk} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">Idiomas</span>
                </div>
                <p className="text-sm text-muted-foreground">{details.languages}</p>
              </div>
            )}

            {/* PDI / Feedbacks */}
            {(details?.pdi || (details?.feedbacks && details.feedbacks.length > 0)) && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faClipboardList} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">PDI / Feedbacks</span>
                </div>
                <div className="space-y-2">
                  {details.pdi && (
                    <div className="p-3 bg-grayscale-5 rounded-md">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{details.pdi}</p>
                    </div>
                  )}
                  {details.feedbacks?.map((feedback, idx) => (
                    <div key={idx} className="p-3 bg-grayscale-5 rounded-md">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
