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

export const TIER_LABELS = [
  "Altamente aderentes",
  "Boa aderência",
  "Aderência parcial",
  "Aderência complementar",
] as const;

interface RankedUserCardProps {
  rank: number;
  userName: string;
  fullName: string;
  leaderName?: string;
  matchScore: number;
  matchedSkills: MatchedSkill[];
  justification?: string;
  details?: UserDetails;
  tier?: number;
  requiredSkillNames?: string[];
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
  tier = 0,
  requiredSkillNames = [],
}: RankedUserCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const matchedNames = matchedSkills.map((s) => s.skillName);
  const matchedSet = new Set(matchedNames.map(normalize));
  const requiredSet = new Set(requiredSkillNames.map(normalize));

  const gapSkills = requiredSkillNames.filter((name) => !matchedSet.has(normalize(name)));
  const extraSkills = (details?.hardSkills || []).filter(
    (name) => !matchedSet.has(normalize(name)) && !requiredSet.has(normalize(name))
  );

  const tierStyles = [
    { dot: "bg-[#22c55e]", border: "border-[#22c55e]/50", text: "text-[#22c55e]" },
    { dot: "bg-primary", border: "border-primary/40", text: "text-primary" },
    { dot: "bg-feedback-warning", border: "border-feedback-warning/40", text: "text-feedback-warning" },
    { dot: "bg-grayscale-40", border: "border-border", text: "text-muted-foreground" },
  ][Math.min(tier, 3)];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("rounded-lg border bg-card transition-all shadow-sm", tierStyles.border)}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-grayscale-5/50 transition-colors rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-grayscale-10 flex items-center justify-center shrink-0">
                <span className="text-foreground font-semibold text-sm">{rank + 1}</span>
              </div>
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
                <span className={cn("h-2 w-2 rounded-full", tierStyles.dot)} />
                <span className={cn("text-xs font-medium", tierStyles.text)}>
                  {TIER_LABELS[Math.min(tier, 3)]}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {matchedSkills.length}/{requiredSkillNames.length || matchedSkills.length} skills
                </span>
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                  ({Math.round(matchScore)})
                </span>
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
