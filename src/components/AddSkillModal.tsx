import { useState, useMemo } from "react";
import { Search, X, Plus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";

interface SuggestedSkill {
  id: string;
  name: string;
  isNew?: boolean;
  alreadyOwned?: boolean;
  currentProficiency?: number;
  similarTo?: string;
}

interface AddSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkills: Array<{ id: string; name: string; proficiency: number }>;
  onAddSkill: (skillName: string, proficiency: number) => void;
}

// Simulated skill database for semantic search
const skillDatabase = [
  "React", "Angular", "Vue.js", "TypeScript", "JavaScript",
  "Node.js", "Python", "Java", "Spring Boot", "SQL Server",
  "PostgreSQL", "MongoDB", "AWS", "Azure", "Docker",
  "Kubernetes", "Git", "CI/CD", "Agile", "Scrum",
  "Gestão de Pessoas", "Liderança", "Comunicação", "Negociação",
  "Excel Avançado", "Power BI", "Tableau", "Machine Learning",
  "Data Science", "UX Design", "UI Design", "Figma",
];

export function AddSkillModal({
  open,
  onOpenChange,
  existingSkills,
  onAddSkill,
}: AddSkillModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmSimilar, setConfirmSimilar] = useState<{
    skill: SuggestedSkill;
    proficiency: number;
  } | null>(null);

  const suggestions = useMemo((): SuggestedSkill[] => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase().trim();
    const results: SuggestedSkill[] = [];

    // First item is always the typed term
    const existingExact = existingSkills.find(
      (s) => s.name.toLowerCase() === term
    );
    
    if (existingExact) {
      results.push({
        id: existingExact.id,
        name: existingExact.name,
        alreadyOwned: true,
        currentProficiency: existingExact.proficiency,
      });
    } else {
      results.push({
        id: `new-${term}`,
        name: searchTerm.trim(),
        isNew: true,
      });
    }

    // Add matching skills from database
    skillDatabase.forEach((skill) => {
      if (skill.toLowerCase().includes(term) && skill.toLowerCase() !== term) {
        const existing = existingSkills.find(
          (s) => s.name.toLowerCase() === skill.toLowerCase()
        );
        
        if (existing) {
          results.push({
            id: existing.id,
            name: existing.name,
            alreadyOwned: true,
            currentProficiency: existing.proficiency,
          });
        } else {
          // Check for similarity with existing skills
          const similar = existingSkills.find(
            (s) =>
              s.name.toLowerCase().includes(skill.toLowerCase().slice(0, 4)) ||
              skill.toLowerCase().includes(s.name.toLowerCase().slice(0, 4))
          );
          
          results.push({
            id: `db-${skill}`,
            name: skill,
            similarTo: similar?.name,
          });
        }
      }
    });

    return results.slice(0, 8);
  }, [searchTerm, existingSkills]);

  const handleAddSkill = (skill: SuggestedSkill, proficiency: number) => {
    if (skill.alreadyOwned) return;

    if (skill.similarTo) {
      setConfirmSimilar({ skill, proficiency });
      return;
    }

    onAddSkill(skill.name, proficiency);
    setSearchTerm("");
  };

  const handleConfirmSimilar = () => {
    if (confirmSimilar) {
      onAddSkill(confirmSimilar.skill.name, confirmSimilar.proficiency);
      setConfirmSimilar(null);
      setSearchTerm("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card p-0 gap-0">
        <DialogHeader className="p-xmedium border-b border-border">
          <DialogTitle className="text-h3-caps text-foreground">
            Adicionar Habilidades
          </DialogTitle>
        </DialogHeader>

        <div className="p-xmedium">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-sml top-1/2 -translate-y-1/2 w-5 h-5 text-grayscale-50" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite ou busque pela lupa"
              className="pl-xbig pr-default"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-sml top-1/2 -translate-y-1/2 text-grayscale-50 hover:text-grayscale-70"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          <div className="mt-default space-y-xsmall max-h-[400px] overflow-y-auto">
            {searchTerm && suggestions.length === 0 && (
              <div className="text-center py-big text-muted-foreground text-label">
                Nada sobre essa habilidade
              </div>
            )}

            {suggestions.map((skill) => (
              <SkillSuggestionItem
                key={skill.id}
                skill={skill}
                onAdd={handleAddSkill}
              />
            ))}
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
      </DialogContent>
    </Dialog>
  );
}

interface SkillSuggestionItemProps {
  skill: SuggestedSkill;
  onAdd: (skill: SuggestedSkill, proficiency: number) => void;
}

function SkillSuggestionItem({ skill, onAdd }: SkillSuggestionItemProps) {
  const [hoverProficiency, setHoverProficiency] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "flex items-center justify-between p-sml rounded-medium border border-border",
        "transition-all duration-150",
        skill.alreadyOwned
          ? "bg-grayscale-5"
          : "hover:bg-grayscale-5 hover:border-primary/30"
      )}
    >
      <div className="flex items-center gap-xsmall flex-1 min-w-0">
        <span className="text-label text-foreground truncate">{skill.name}</span>
        {skill.isNew && (
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

      <div className="flex items-center gap-xsmall">
        {skill.alreadyOwned ? (
          <StarRating value={skill.currentProficiency || 0} readonly size="sm" />
        ) : (
          <div className="flex gap-xxsmall">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onAdd(skill, star)}
                onMouseEnter={() => setHoverProficiency(star)}
                onMouseLeave={() => setHoverProficiency(null)}
                className="p-xxsmall rounded-small hover:bg-primary/10 transition-colors"
              >
                <Plus
                  className={cn(
                    "w-4 h-4 transition-colors",
                    hoverProficiency && star <= hoverProficiency
                      ? "text-primary"
                      : "text-grayscale-50"
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
