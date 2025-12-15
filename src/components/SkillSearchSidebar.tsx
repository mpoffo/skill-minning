import { useState, useCallback } from "react";
import { Search, X, AlertTriangle, Loader2 } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { LinkedInImport } from "@/components/LinkedInImport";
import { HCMImport } from "@/components/HCMImport";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/contexts/PlatformContext";
import { UserSkill } from "@/hooks/useSkills";
import { useDebounce } from "@/hooks/useDebounce";

interface SuggestedSkill {
  id: string;
  name: string;
  isNew?: boolean;
  alreadyOwned?: boolean;
  currentProficiency?: number;
  similarTo?: string;
  origin?: string;
}

interface SkillSearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  existingSkills: UserSkill[];
  onAddSkill: (skillName: string, proficiency: number) => Promise<boolean>;
}

export function SkillSearchSidebar({
  isOpen,
  onClose,
  existingSkills,
  onAddSkill,
}: SkillSearchSidebarProps) {
  const { tenantName } = usePlatform();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedSkill[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmSimilar, setConfirmSimilar] = useState<{
    skill: SuggestedSkill;
    proficiency: number;
  } | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch semantic suggestions when search term changes
  const fetchSuggestions = useCallback(async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      const existingSkillNames = existingSkills.map(s => s.skillName);
      
      const { data, error } = await supabase.functions.invoke('semantic-skills', {
        body: { 
          searchTerm: term,
          existingSkillNames,
        },
      });

      if (error) {
        console.error('Error fetching suggestions:', error);
        // Fallback to just the search term
        setSuggestions([{
          id: `new-${term}`,
          name: term.trim(),
          isNew: true,
        }]);
        return;
      }

      const aiSuggestions: string[] = data.suggestions || [term.trim()];
      
      // Map suggestions with ownership and similarity info
      const mappedSuggestions: SuggestedSkill[] = aiSuggestions.map((skillName, index) => {
        const existing = existingSkills.find(
          s => s.skillName.toLowerCase() === skillName.toLowerCase()
        );

        if (existing) {
          return {
            id: existing.id,
            name: existing.skillName,
            alreadyOwned: true,
            currentProficiency: existing.proficiency,
          };
        }

        // Check for similarity with existing skills
        const similar = existingSkills.find(
          s => 
            s.skillName.toLowerCase().includes(skillName.toLowerCase().slice(0, 4)) ||
            skillName.toLowerCase().includes(s.skillName.toLowerCase().slice(0, 4))
        );

        return {
          id: `suggestion-${index}-${skillName}`,
          name: skillName,
          isNew: index === 0 && skillName.toLowerCase() === term.trim().toLowerCase(),
          similarTo: similar?.skillName,
        };
      });

      setSuggestions(mappedSuggestions);
    } catch (err) {
      console.error('Error in semantic search:', err);
      setSuggestions([{
        id: `new-${term}`,
        name: term.trim(),
        isNew: true,
      }]);
    } finally {
      setIsSearching(false);
    }
  }, [existingSkills]);

  // Trigger search when debounced term changes
  useState(() => {
    fetchSuggestions(debouncedSearch);
  });

  // Manual search trigger
  const handleSearch = () => {
    fetchSuggestions(searchTerm);
  };

  const handleAddSkill = async (skill: SuggestedSkill, proficiency: number) => {
    if (skill.alreadyOwned) return;

    if (skill.similarTo) {
      setConfirmSimilar({ skill, proficiency });
      return;
    }

    const success = await onAddSkill(skill.name, proficiency);
    if (success) {
      // Remove added skill from suggestions
      setSuggestions(prev => prev.filter(s => s.name !== skill.name));
    }
  };

  const handleConfirmSimilar = async () => {
    if (confirmSimilar) {
      const success = await onAddSkill(confirmSimilar.skill.name, confirmSimilar.proficiency);
      if (success) {
        setSuggestions(prev => prev.filter(s => s.name !== confirmSimilar.skill.name));
      }
      setConfirmSimilar(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-grayscale-100/30 z-40 lg:hidden"
        onClick={onClose}
      />
      
      <aside className={cn(
        "fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-dp16 z-50",
        "transform transition-transform duration-300",
        "lg:relative lg:transform-none lg:shadow-none lg:z-auto",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-xmedium border-b border-border flex items-center justify-between">
            <h2 className="text-h3-caps text-foreground">
              Buscar Habilidades
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* LinkedIn Import */}
          <div className="p-xmedium border-b border-border">
            <LinkedInImport
              existingSkillNames={existingSkills.map(s => s.skillName)}
              onSkillsExtracted={(skills) => {
                const newSuggestions = skills.map((name, index) => ({
                  id: `linkedin-${index}-${name}`,
                  name,
                  isNew: true,
                }));
                setSuggestions(prev => [...newSuggestions, ...prev]);
              }}
            />
          </div>

          {/* HCM-Mining Import */}
          <div className="p-xmedium border-b border-border">
            <HCMImport
              existingSkillNames={existingSkills.map(s => s.skillName)}
              onSkillsExtracted={(skills) => {
                const newSuggestions = skills.map((skill, index) => ({
                  id: `hcm-${index}-${skill.name}`,
                  name: skill.name,
                  origin: skill.origin,
                }));
                setSuggestions(prev => [...newSuggestions, ...prev]);
              }}
            />
          </div>

          {/* Search Input */}
          <div className="p-xmedium border-b border-border">
            <div className="relative">
              <Search className="absolute left-sml top-1/2 -translate-y-1/2 w-5 h-5 text-grayscale-50" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Digite ou busque pela lupa"
                className="pl-xbig pr-default"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSuggestions([]);
                  }}
                  className="absolute right-sml top-1/2 -translate-y-1/2 text-grayscale-50 hover:text-grayscale-70"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-small text-muted-foreground mt-xsmall">
              Busca semântica: digite termos, assuntos ou habilidades específicas
            </p>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-xmedium">
            {isSearching && (
              <div className="flex items-center justify-center py-big">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-sml text-label text-muted-foreground">Buscando...</span>
              </div>
            )}

            {!isSearching && searchTerm && suggestions.length === 0 && (
              <div className="text-center py-big text-muted-foreground text-label">
                Nada sobre essa habilidade
              </div>
            )}

            {!isSearching && (
              <div className="grid grid-cols-1 gap-sml">
                {suggestions.map((skill) => (
                  <SkillSuggestionCard
                    key={skill.id}
                    skill={skill}
                    onAdd={handleAddSkill}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Similarity Confirmation Dialog */}
        {confirmSimilar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-grayscale-100/60"
              onClick={() => setConfirmSimilar(null)}
            />
            <div className="relative bg-card rounded-big shadow-dp16 p-xmedium max-w-md w-full mx-default animate-fade-in">
              <div className="flex items-start gap-sml">
                <AlertTriangle className="w-6 h-6 text-feedback-warning flex-shrink-0 mt-xxsmall" />
                <div>
                  <h3 className="text-h3-bold text-foreground mb-xsmall">
                    Habilidade similar encontrada
                  </h3>
                  <p className="text-label text-muted-foreground">
                    Você já possui "{confirmSimilar.skill.similarTo}" cadastrada.
                    Deseja incluir "{confirmSimilar.skill.name}" mesmo assim?
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-sml mt-xmedium">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmSimilar(null)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleConfirmSimilar}>
                  Incluir mesmo assim
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

interface SkillSuggestionCardProps {
  skill: SuggestedSkill;
  onAdd: (skill: SuggestedSkill, proficiency: number) => void;
}

function SkillSuggestionCard({ skill, onAdd }: SkillSuggestionCardProps) {
  const [hoverProficiency, setHoverProficiency] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "flex flex-col p-default rounded-big border border-border",
        "transition-all duration-150",
        skill.alreadyOwned
          ? "bg-grayscale-5"
          : "hover:bg-grayscale-5 hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-xsmall mb-sml">
        <span className="text-label text-foreground flex-1">{skill.name}</span>
        {skill.origin && (
          <span className={cn(
            "text-small px-xsmall py-xxsmall rounded-small flex-shrink-0",
            skill.origin === 'responsibilities' && "bg-blue-500/10 text-blue-600",
            skill.origin === 'certifications' && "bg-green-500/10 text-green-600",
            skill.origin === 'education' && "bg-purple-500/10 text-purple-600",
            skill.origin === 'experience' && "bg-orange-500/10 text-orange-600",
            skill.origin === 'position' && "bg-cyan-500/10 text-cyan-600",
            skill.origin === 'inferred' && "bg-gray-500/10 text-gray-600",
            !['responsibilities', 'certifications', 'education', 'experience', 'position', 'inferred'].includes(skill.origin) && "bg-primary/10 text-primary"
          )}>
            {skill.origin === 'responsibilities' ? 'Responsabilidades' :
             skill.origin === 'certifications' ? 'Certificações' :
             skill.origin === 'education' ? 'Formação' :
             skill.origin === 'experience' ? 'Experiência' :
             skill.origin === 'position' ? 'Cargo' :
             skill.origin === 'inferred' ? 'Inferido' : skill.origin}
          </span>
        )}
        {skill.isNew && !skill.origin && (
          <span className="text-small px-xsmall py-xxsmall bg-primary/10 text-primary rounded-small flex-shrink-0">
            Novo
          </span>
        )}
        {skill.alreadyOwned && (
          <span className="text-small text-feedback-success flex-shrink-0">
            Já possuo
          </span>
        )}
        {skill.similarTo && (
          <span className="text-small text-feedback-warning flex-shrink-0">
            Similar a: {skill.similarTo}
          </span>
        )}
      </div>

      {skill.alreadyOwned ? (
        <StarRating value={skill.currentProficiency || 0} readonly size="md" />
      ) : (
        <div className="flex gap-xsmall">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onAdd(skill, star)}
              onMouseEnter={() => setHoverProficiency(star)}
              onMouseLeave={() => setHoverProficiency(null)}
              className="p-xsmall rounded-medium hover:bg-primary/10 transition-colors"
            >
              <FontAwesomeIcon
                icon={hoverProficiency && star <= hoverProficiency ? faStarSolid : faStarRegular}
                className={cn(
                  "text-lg transition-colors",
                  hoverProficiency && star <= hoverProficiency
                    ? "text-primary"
                    : "text-grayscale-40"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
