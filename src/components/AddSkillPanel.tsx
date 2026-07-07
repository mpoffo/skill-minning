import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, AlertTriangle, Loader2, ChevronDown, ChevronUp, Upload, Linkedin, HelpCircle } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { UserSkill } from "@/hooks/useSkills";
import { useDebounce } from "@/hooks/useDebounce";
import { SKILL_CATEGORIES } from "@/data/skillSuggestions";
import { toast } from "@/hooks/use-toast";

interface SuggestedSkill {
  id: string;
  name: string;
  isNew?: boolean;
  alreadyOwned?: boolean;
  currentProficiency?: number;
  similarTo?: string;
  origin?: string;
}

interface AddSkillPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkills: UserSkill[];
  onAddSkill: (skillName: string, proficiency: number) => Promise<boolean>;
}

export function AddSkillPanel({
  isOpen,
  onOpenChange,
  existingSkills,
  onAddSkill,
}: AddSkillPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedSkill[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmSimilar, setConfirmSimilar] = useState<{
    skill: SuggestedSkill;
    proficiency: number;
  } | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const existingSkillNames = existingSkills.map((s) => s.skillName);
      const { data, error } = await supabase.functions.invoke("semantic-skills", {
        body: { searchTerm: term, existingSkillNames },
      });
      if (error) {
        setSuggestions([{ id: `new-${term}`, name: term.trim(), isNew: true }]);
        return;
      }
      const aiSuggestions: string[] = data.suggestions || [term.trim()];
      const mapped: SuggestedSkill[] = aiSuggestions.map((skillName, index) => {
        const existing = existingSkills.find(
          (s) => s.skillName.toLowerCase() === skillName.toLowerCase()
        );
        if (existing) {
          return {
            id: existing.id,
            name: existing.skillName,
            alreadyOwned: true,
            currentProficiency: existing.proficiency,
          };
        }
        const similar = existingSkills.find(
          (s) =>
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
      setSuggestions(mapped);
    } catch {
      setSuggestions([{ id: `new-${term}`, name: term.trim(), isNew: true }]);
    } finally {
      setIsSearching(false);
    }
  }, [existingSkills]);

  useEffect(() => {
    fetchSuggestions(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleAddSkill = async (skill: SuggestedSkill, proficiency: number) => {
    if (skill.alreadyOwned) return;
    if (skill.similarTo) {
      setConfirmSimilar({ skill, proficiency });
      return;
    }
    const success = await onAddSkill(skill.name, proficiency);
    if (success) {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.name === skill.name
            ? { ...s, alreadyOwned: true, currentProficiency: proficiency }
            : s
        )
      );
    }
  };

  const handleConfirmSimilar = async () => {
    if (!confirmSimilar) return;
    const success = await onAddSkill(confirmSimilar.skill.name, confirmSimilar.proficiency);
    if (success) {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.name === confirmSimilar.skill.name
            ? {
                ...s,
                alreadyOwned: true,
                currentProficiency: confirmSimilar.proficiency,
                similarTo: undefined,
              }
            : s
        )
      );
    }
    setConfirmSimilar(null);
  };

  const handleLinkedInFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({
        title: "Formato inválido",
        description: "Selecione um arquivo PDF do LinkedIn.",
        variant: "destructive",
      });
      return;
    }
    setIsImportingLinkedIn(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-linkedin-pdf", {
        body: formData,
      });
      if (error) {
        toast({
          title: "Erro ao processar",
          description: "Não foi possível processar o PDF.",
          variant: "destructive",
        });
        return;
      }
      const skills: { name: string; origin: string }[] = data.skills || [];
      const existingNames = existingSkills.map((s) => s.skillName.toLowerCase());
      const newSkills = skills.filter(
        (s) => !existingNames.includes(s.name.toLowerCase())
      );
      if (skills.length === 0) {
        toast({
          title: "Nenhuma habilidade encontrada",
          description: "O arquivo não contém habilidades identificáveis.",
        });
        return;
      }
      if (newSkills.length === 0) {
        toast({
          title: "Todas já cadastradas",
          description: "Você já possui todas as habilidades do perfil.",
        });
        return;
      }
      const linkedinSuggestions: SuggestedSkill[] = newSkills.map((s, i) => ({
        id: `linkedin-${i}-${s.name}`,
        name: s.name,
        origin: s.origin,
      }));
      setSuggestions((prev) => [...linkedinSuggestions, ...prev]);
      toast({
        title: "Habilidades encontradas!",
        description: `${newSkills.length} nova(s) habilidade(s) extraída(s).`,
      });
    } finally {
      setIsImportingLinkedIn(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="bg-card rounded-big shadow-dp02 mb-default overflow-hidden border border-border">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-default py-sml hover:bg-grayscale-5 transition-colors"
          >
            <div className="flex items-center gap-sml">
              <h2 className="text-label font-semibold text-foreground">
                Adicionar habilidade
              </h2>
              {!isOpen && (
                <span className="text-small text-muted-foreground">
                  Digite, importe do LinkedIn ou explore sugestões
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-default pb-default pt-xsmall border-t border-border">
            {/* Primary row: search input + LinkedIn button */}
            <div className="flex flex-col md:flex-row gap-sml md:items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-sml top-1/2 -translate-y-1/2 w-5 h-5 text-grayscale-50" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite uma habilidade (busca semântica com IA)..."
                  className="pl-xbig pr-xbig h-11"
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

              <div className="hidden md:flex items-center px-xsmall text-small text-muted-foreground font-medium">
                ou
              </div>

              <div className="flex items-center gap-xsmall">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleLinkedInFile}
                  className="hidden"
                  disabled={isImportingLinkedIn}
                />
                <Button
                  variant="outline"
                  className="h-11 flex-1 md:flex-none"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImportingLinkedIn}
                >
                  {isImportingLinkedIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-xsmall animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Linkedin className="w-4 h-4 mr-xsmall" />
                      Importar do LinkedIn
                    </>
                  )}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="p-xsmall text-muted-foreground hover:text-foreground"
                      aria-label="Como obter o PDF do LinkedIn"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-xxsmall">Como obter o PDF do LinkedIn:</p>
                    <ol className="list-decimal list-inside space-y-xxsmall text-small">
                      <li>Acesse seu perfil no LinkedIn</li>
                      <li>Clique em "Recursos" (abaixo da foto)</li>
                      <li>Selecione "Salvar como PDF"</li>
                    </ol>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Search results */}
            {(isSearching || suggestions.length > 0) && (
              <div className="mt-default">
                {isSearching && (
                  <div className="flex items-center justify-center py-default">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="ml-sml text-small text-muted-foreground">
                      Buscando...
                    </span>
                  </div>
                )}
                {!isSearching && suggestions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-sml auto-rows-fr">
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
            )}
            {!isSearching && searchTerm && suggestions.length === 0 && (
              <div className="mt-default text-center py-sml text-muted-foreground text-small">
                Nada sobre essa habilidade
              </div>
            )}

            {/* Secondary: category suggestions (collapsible) */}
            <div className="mt-default pt-default border-t border-border">
              <Collapsible open={showCategories} onOpenChange={setShowCategories}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div>
                      <span className="text-label font-medium text-foreground">
                        Explorar por categoria
                      </span>
                      <p className="text-small text-muted-foreground mt-xxsmall">
                        Sugestões prontas agrupadas por área
                      </p>
                    </div>
                    {showCategories ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-sml">
                  <CategorySuggestions
                    existingSkills={existingSkills}
                    onAddSkill={handleAddSkill}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CollapsibleContent>
      </div>

      {/* Similarity Confirmation Dialog */}
      {confirmSimilar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-grayscale-100/60"
            onClick={() => setConfirmSimilar(null)}
          />
          <div className="relative bg-card rounded-big shadow-dp16 p-xmedium max-w-md w-full mx-default">
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
              <Button variant="ghost" onClick={() => setConfirmSimilar(null)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmSimilar}>Incluir mesmo assim</Button>
            </div>
          </div>
        </div>
      )}
    </Collapsible>
  );
}

interface SkillSuggestionCardProps {
  skill: SuggestedSkill;
  onAdd: (skill: SuggestedSkill, proficiency: number) => Promise<void>;
}

function SkillSuggestionCard({ skill, onAdd }: SkillSuggestionCardProps) {
  const [hoverProficiency, setHoverProficiency] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAdd = async (proficiency: number) => {
    setIsAdding(true);
    try {
      await onAdd(skill, proficiency);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col p-default rounded-big border border-border",
        "transition-all duration-150",
        skill.alreadyOwned
          ? "bg-grayscale-5"
          : "hover:bg-grayscale-5 hover:border-primary/30"
      )}
    >
      {isAdding && (
        <div className="absolute inset-0 bg-card/80 rounded-big flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {showSuccess && (
        <div className="absolute inset-0 bg-feedback-success/10 rounded-big flex items-center justify-center z-10 animate-fade-out">
          <span className="text-label text-feedback-success font-medium">
            Inserido!
          </span>
        </div>
      )}
      <div className="flex items-start gap-xsmall mb-sml">
        <span className="text-label text-foreground flex-1">{skill.name}</span>
        {skill.origin && (
          <span className="text-small px-xsmall py-xxsmall bg-primary/10 text-primary rounded-small flex-shrink-0">
            {skill.origin}
          </span>
        )}
        {skill.isNew && !skill.origin && (
          <span className="text-small px-xsmall py-xxsmall bg-primary/10 text-primary rounded-small flex-shrink-0">
            Novo
          </span>
        )}
        {skill.similarTo && (
          <span className="text-small text-feedback-warning flex-shrink-0">
            Similar: {skill.similarTo}
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
              onClick={() => handleAdd(star)}
              onMouseEnter={() => setHoverProficiency(star)}
              onMouseLeave={() => setHoverProficiency(null)}
              disabled={isAdding}
              className="p-xsmall rounded-medium hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <FontAwesomeIcon
                icon={
                  hoverProficiency && star <= hoverProficiency
                    ? faStarSolid
                    : faStarRegular
                }
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

interface CategorySuggestionsProps {
  existingSkills: UserSkill[];
  onAddSkill: (skill: SuggestedSkill, proficiency: number) => Promise<void>;
}

function CategorySuggestions({ existingSkills, onAddSkill }: CategorySuggestionsProps) {
  const [activeCategory, setActiveCategory] = useState(SKILL_CATEGORIES[0]?.id);
  const category =
    SKILL_CATEGORIES.find((c) => c.id === activeCategory) ?? SKILL_CATEGORIES[0];

  const suggestionsForCategory: SuggestedSkill[] = category.skills.map((name, index) => {
    const existing = existingSkills.find(
      (s) => s.skillName.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return {
        id: `cat-${category.id}-${existing.id}`,
        name: existing.skillName,
        alreadyOwned: true,
        currentProficiency: existing.proficiency,
      };
    }
    return { id: `cat-${category.id}-${index}-${name}`, name };
  });

  return (
    <div>
      <div className="flex flex-wrap gap-xsmall mb-sml">
        {SKILL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-sml py-xsmall rounded-full text-small transition-colors border",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-grayscale-5"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-sml auto-rows-fr">
        {suggestionsForCategory.map((skill) => (
          <SkillSuggestionCard key={skill.id} skill={skill} onAdd={onAddSkill} />
        ))}
      </div>
    </div>
  );
}
