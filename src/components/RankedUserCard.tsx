import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faMedal, faAward, faChevronDown, faChevronUp, faGraduationCap, faGlobe, faCertificate, faCode, faComment } from "@fortawesome/free-solid-svg-icons";
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
          <div className="w-10 h-10 rounded-full bg-feedback-warning flex items-center justify-center">
            <span className="text-white font-bold text-label">1</span>
          </div>
        );
      case 1:
        return (
          <div className="w-10 h-10 rounded-full bg-grayscale-40 flex items-center justify-center">
            <span className="text-white font-bold text-label">2</span>
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-label">3</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-grayscale-20 flex items-center justify-center">
            <span className="text-foreground font-bold text-label">{rank + 1}</span>
          </div>
        );
    }
  };

  const getMatchBadge = () => {
    if (matchScore >= 80) {
      return <Badge className="bg-feedback-success text-white">Alta</Badge>;
    } else if (matchScore >= 60) {
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
          rank === 0 && "border-feedback-warning",
          rank === 1 && "border-grayscale-40",
          rank === 2 && "border-primary",
          rank > 2 && "border-border"
        )}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-default cursor-pointer hover:bg-grayscale-5/50 transition-colors rounded-big">
            <div className="flex items-center gap-medium">
              {getRankIcon()}
              <div className="text-left">
                <h4 className="text-label font-semibold text-foreground">
                  {fullName || userName}
                </h4>
                {leaderName && (
                  <span className="text-small text-muted-foreground">
                    {leaderName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-sml">
              <div className="flex items-center gap-xsmall">
                <div className="text-right mr-sml">
                  <span className="text-h3 font-bold text-foreground">
                    {Math.round(matchScore)}
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
            {/* Justification/Summary */}
            {justification && (
              <p className="text-body text-muted-foreground mt-medium mb-medium">
                {justification}
              </p>
            )}

            {/* Hard Skills */}
            {(details?.hardSkills && details.hardSkills.length > 0) || matchedSkills.length > 0 ? (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faCode} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Hard Skills</span>
                </div>
                <div className="flex flex-wrap gap-xsmall">
                  {(details?.hardSkills || matchedSkills.map(s => s.skillName)).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="bg-grayscale-5">
                      {typeof skill === 'string' ? skill : skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Certifications */}
            {details?.certifications && details.certifications.length > 0 && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faCertificate} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Certificações</span>
                </div>
                <div className="flex flex-wrap gap-xsmall">
                  {details.certifications.map((cert, idx) => (
                    <Badge key={idx} variant="outline" className="bg-grayscale-5">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {details?.graduation && details.graduation.length > 0 && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Formação</span>
                </div>
                <ul className="text-small text-muted-foreground space-y-xsmall pl-medium list-disc">
                  {details.graduation.map((edu, idx) => (
                    <li key={idx}>{edu}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Languages */}
            {details?.languages && (
              <div className="mb-medium">
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faGlobe} className="text-muted-foreground" />
                  <span className="text-label font-semibold">Idiomas</span>
                </div>
                <p className="text-small text-muted-foreground">{details.languages}</p>
              </div>
            )}

            {/* PDI / Feedbacks */}
            {(details?.pdi || (details?.feedbacks && details.feedbacks.length > 0)) && (
              <div>
                <div className="flex items-center gap-xsmall mb-sml">
                  <FontAwesomeIcon icon={faComment} className="text-muted-foreground" />
                  <span className="text-label font-semibold">PDI / Feedbacks</span>
                </div>
                <div className="space-y-xsmall">
                  {details.pdi && (
                    <div className="p-sml bg-grayscale-5 rounded-medium">
                      <p className="text-small text-muted-foreground">{details.pdi}</p>
                    </div>
                  )}
                  {details.feedbacks?.map((feedback, idx) => (
                    <div key={idx} className="p-sml bg-grayscale-5 rounded-medium">
                      <p className="text-small text-muted-foreground">{feedback}</p>
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
