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
  "Melhores correspondências",
  "Demais resultados",
  "Demais resultados",
  "Demais resultados",
] as const;

const getPositionLabel = (rank: number) =>
  rank === 0 ? "Melhor correspondência encontrada" : `${rank + 1}º resultado`;

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

  const totalRequired = requiredSkillNames.length || matchedSkills.length;
  const isTop = rank === 0;

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
                <span className={cn("font-semibold text-sm", isTop ? "text-white" : "text-foreground")}>
                  {rank + 1}
                </span>
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wide",
                      isTop ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {isTop ? "🥇 " : ""}
                    {getPositionLabel(rank)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  {fullName || userName}
                </h4>
                {leaderName && (
                  <span className="text-xs text-muted-foreground">{leaderName}</span>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <span className="text-xs font-medium text-[#166534]">
                    Atende {matchedSkills.length} de {totalRequired} requisitos
                  </span>
                  {gapSkills.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {gapSkills.length} {gapSkills.length === 1 ? "gap identificado" : "gaps identificados"}
                    </span>
                  )}
                  {extraSkills.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {extraSkills.length} {extraSkills.length === 1 ? "habilidade adicional" : "habilidades adicionais"}
                    </span>
                  )}
                </div>
                <span className="block text-[11px] text-muted-foreground/70 tabular-nums mt-1">
                  Compatibilidade calculada: {Math.round(matchScore)}%
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
            {/* Justification/Summary */}
            {justification && (
              <p className="text-sm text-muted-foreground mt-3 mb-4">
                {justification}
              </p>
            )}

            {/* Skills — matched / gaps / extras */}
            {matchedSkills.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGrip} className="text-[#22c55e] text-sm" />
                  <span className="text-sm font-semibold text-foreground">
                    Habilidades que atendem ao pedido ({matchedSkills.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchedSkills.map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-[#22c55e]/10 text-[#166534] border-0 font-normal"
                    >
                      {skill.skillName}
                      {skill.userProficiency ? ` · ${skill.userProficiency}★` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {gapSkills.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGrip} className="text-muted-foreground text-sm" />
                  <span className="text-sm font-semibold text-foreground">
                    Gaps em relação ao pedido ({gapSkills.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gapSkills.map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-dashed text-muted-foreground font-normal"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {extraSkills.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faGrip} className="text-primary text-sm" />
                  <span className="text-sm font-semibold text-foreground">
                    Habilidades adicionais ({extraSkills.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extraSkills.map((skill, idx) => (
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
