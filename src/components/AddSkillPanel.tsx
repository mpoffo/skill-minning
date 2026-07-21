import { useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  X,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  Lightbulb,
  Lock,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const ORIGIN_LABELS: Record<string, string> = {
  competencias: "Competências",
  tecnologias: "Tecnologias",
  metodologias: "Metodologias",
  certificacoes: "Certificações",
  idiomas: "Idiomas",
  experiencia: "Experiência",
  linkedin: "LinkedIn",
};

export function AddSkillPanel({
  isOpen,
  onOpenChange,
  existingSkills,
  onAddSkill,
}: AddSkillPanelProps) {
  const [activeTab, setActiveTab] = useState<"search" | "categories" | "file">("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedSkill[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmSimilar, setConfirmSimilar] = useState<{
    skill: SuggestedSkill;
    proficiency: number;
  } | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [fileSkills, setFileSkills] = useState<SuggestedSkill[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchSuggestions = useCallback(
    async (term: string) => {
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
    },
    [existingSkills]
  );

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
      setFileSkills((prev) =>
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
      const update = (s: SuggestedSkill) =>
        s.name === confirmSimilar.skill.name
          ? {
              ...s,
              alreadyOwned: true,
              currentProficiency: confirmSimilar.proficiency,
              similarTo: undefined,
            }
          : s;
      setSuggestions((prev) => prev.map(update));
      setFileSkills((prev) => prev.map(update));
    }
    setConfirmSimilar(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({
        title: "Formato inválido",
        description: "Selecione um arquivo PDF (perfil do LinkedIn ou currículo).",
        variant: "destructive",
      });
      return;
    }
    setIsImportingFile(true);
    setFileName(file.name);
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
      if (skills.length === 0) {
        toast({
          title: "Nenhuma habilidade encontrada",
          description: "O arquivo não contém habilidades identificáveis.",
        });
        setFileSkills([]);
        return;
      }
      const mapped: SuggestedSkill[] = skills.map((s, i) => {
        const existing = existingSkills.find(
          (e) => e.skillName.toLowerCase() === s.name.toLowerCase()
        );
        if (existing) {
          return {
            id: `file-${i}-${s.name}`,
            name: existing.skillName,
            origin: s.origin,
            alreadyOwned: true,
            currentProficiency: existing.proficiency,
          };
        }
        return { id: `file-${i}-${s.name}`, name: s.name, origin: s.origin };
      });
      setFileSkills(mapped);
      toast({
        title: "Habilidades encontradas!",
        description: `${skills.length} habilidade(s) extraída(s).`,
      });
    } finally {
      setIsImportingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="bg-card rounded-big shadow-dp02 mb-default overflow-hidden border border-border">
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
                  Buscar, explorar categorias ou importar um arquivo
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid grid-cols-3 w-full max-w-xl">
                <TabsTrigger value="search">
                  <Search className="w-4 h-4 mr-xsmall" />
                  Buscar
                </TabsTrigger>
                <TabsTrigger value="categories">
                  <Lightbulb className="w-4 h-4 mr-xsmall" />
                  Categorias
                </TabsTrigger>
                <TabsTrigger value="file">
                  <FileText className="w-4 h-4 mr-xsmall" />
                  Importar arquivo
                </TabsTrigger>
              </TabsList>

              {/* ============ TAB: SEARCH ============ */}
              <TabsContent value="search" className="mt-default">
                <div className="relative">
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
              </TabsContent>

              {/* ============ TAB: CATEGORIES ============ */}
              <TabsContent value="categories" className="mt-default">
                <GroupedSuggestions
                  groups={SKILL_CATEGORIES.map((c) => ({
                    id: c.id,
                    label: c.name,
                    skills: c.skills.map((name, i) => {
                      const existing = existingSkills.find(
                        (s) => s.skillName.toLowerCase() === name.toLowerCase()
                      );
                      return existing
                        ? {
                            id: `cat-${c.id}-${existing.id}`,
                            name: existing.skillName,
                            alreadyOwned: true,
                            currentProficiency: existing.proficiency,
                          }
                        : { id: `cat-${c.id}-${i}-${name}`, name };
                    }),
                  }))}
                  onAddSkill={handleAddSkill}
                  emptyMessage="Nenhuma categoria disponível."
                />
              </TabsContent>

              {/* ============ TAB: FILE ============ */}
              <TabsContent value="file" className="mt-default">
                <FileImportTab
                  fileInputRef={fileInputRef}
                  isImporting={isImportingFile}
                  onFileChange={handleFileChange}
                  fileName={fileName}
                  fileSkills={fileSkills}
                  onAddSkill={handleAddSkill}
                />
              </TabsContent>
            </Tabs>
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
                  Você já possui "{confirmSimilar.skill.similarTo}" cadastrada. Deseja
                  incluir "{confirmSimilar.skill.name}" mesmo assim?
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

// ============================================================
// File import tab
// ============================================================

interface FileImportTabProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  isImporting: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string | null;
  fileSkills: SuggestedSkill[];
  onAddSkill: (skill: SuggestedSkill, proficiency: number) => Promise<void>;
}

function FileImportTab({
  fileInputRef,
  isImporting,
  onFileChange,
  fileName,
  fileSkills,
  onAddSkill,
}: FileImportTabProps) {
  const groups = groupByOrigin(fileSkills);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-default">
      {/* Instructions */}
      <aside className="space-y-default">
        <div className="border border-border rounded-big p-default bg-grayscale-5">
          <div className="flex items-center gap-xsmall mb-sml">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-label font-semibold text-foreground">
              Perfil do LinkedIn (PDF)
            </span>
          </div>
          <ol className="text-small text-muted-foreground space-y-xsmall list-decimal list-inside">
            <li>
              Acesse seu perfil em{" "}
              <code className="text-foreground bg-card px-xxsmall rounded-small">
                linkedin.com/in/seu-perfil
              </code>
              .
            </li>
            <li>
              Clique em <strong className="text-foreground">Mais</strong> (ícone …),
              logo abaixo da foto de capa.
            </li>
            <li>
              Selecione <strong className="text-foreground">Salvar como PDF</strong>.
            </li>
            <li>
              Aguarde o download (padrão:{" "}
              <code className="text-foreground bg-card px-xxsmall rounded-small">
                Perfil-Nome-Sobrenome.pdf
              </code>
              ).
            </li>
            <li>Envie esse PDF aqui.</li>
          </ol>
          <div className="mt-sml flex items-start gap-xsmall p-xsmall rounded-small bg-primary/5 text-small text-foreground">
            <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-xxsmall" />
            <span>
              Quanto mais completo o perfil — seção "Competências", experiências
              detalhadas, certificações — melhor a extração.
            </span>
          </div>
        </div>

        <div className="border border-border rounded-big p-default bg-grayscale-5">
          <div className="flex items-center gap-xsmall mb-sml">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-label font-semibold text-foreground">
              Currículo (PDF)
            </span>
          </div>
          <p className="text-small text-muted-foreground mb-xsmall">
            Para uma boa extração, o currículo deve conter, preferencialmente:
          </p>
          <ul className="text-small text-muted-foreground list-disc list-inside space-y-xxsmall">
            <li>Experiência profissional (atividades e ferramentas usadas)</li>
            <li>Formação acadêmica</li>
            <li>Habilidades / competências</li>
            <li>Idiomas</li>
            <li>Certificações / cursos</li>
          </ul>
          <div className="mt-sml space-y-xsmall">
            <div className="flex items-start gap-xsmall p-xsmall rounded-small bg-grayscale-10 text-small text-foreground">
              <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-xxsmall" />
              <span>
                Dados pessoais (nome, telefone, e-mail, endereço) são ignorados pela
                extração.
              </span>
            </div>
            <div className="flex items-start gap-xsmall p-xsmall rounded-small bg-primary/5 text-small text-foreground">
              <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-xxsmall" />
              <span>
                Currículos com uma seção explícita de "Habilidades" geram extrações
                mais precisas. Aceito apenas em PDF.
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Upload area + results */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={onFileChange}
          className="hidden"
          disabled={isImporting}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className={cn(
            "w-full border-2 border-dashed border-border rounded-big p-xmedium",
            "flex flex-col items-center justify-center gap-xsmall",
            "hover:border-primary/40 hover:bg-primary/5 transition-colors",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-label text-foreground">Analisando com IA...</span>
              {fileName && (
                <span className="text-small text-muted-foreground">{fileName}</span>
              )}
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-primary" />
              <span className="text-label text-foreground font-medium">
                {fileName ? "Enviar outro PDF" : "Selecionar PDF"}
              </span>
              <span className="text-small text-muted-foreground text-center">
                Perfil do LinkedIn ou currículo — arraste ou clique para escolher
              </span>
            </>
          )}
        </button>

        {fileSkills.length > 0 && (
          <div className="mt-default">
            <GroupedSuggestions
              groups={groups}
              onAddSkill={onAddSkill}
              emptyMessage="Nenhuma habilidade extraída."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function groupByOrigin(skills: SuggestedSkill[]) {
  const map = new Map<string, SuggestedSkill[]>();
  for (const s of skills) {
    const origin = s.origin || "linkedin";
    if (!map.has(origin)) map.set(origin, []);
    map.get(origin)!.push(s);
  }
  return Array.from(map.entries()).map(([id, skills]) => ({
    id,
    label: `${ORIGIN_LABELS[id] || id} (${skills.length})`,
    skills,
  }));
}

// ============================================================
// Grouped suggestions (shared by categories + file origin)
// ============================================================

interface Group {
  id: string;
  label: string;
  skills: SuggestedSkill[];
}

interface GroupedSuggestionsProps {
  groups: Group[];
  onAddSkill: (skill: SuggestedSkill, proficiency: number) => Promise<void>;
  emptyMessage: string;
}

function GroupedSuggestions({ groups, onAddSkill, emptyMessage }: GroupedSuggestionsProps) {
  const [activeGroup, setActiveGroup] = useState<string | undefined>(groups[0]?.id);

  useEffect(() => {
    if (activeGroup && !groups.some((g) => g.id === activeGroup)) {
      setActiveGroup(groups[0]?.id);
    } else if (!activeGroup && groups[0]) {
      setActiveGroup(groups[0].id);
    }
  }, [groups, activeGroup]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-default text-muted-foreground text-small">
        {emptyMessage}
      </div>
    );
  }

  const active = groups.find((g) => g.id === activeGroup) ?? groups[0];

  return (
    <div>
      <div className="flex flex-wrap gap-xsmall mb-sml">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActiveGroup(g.id)}
            className={cn(
              "px-sml py-xsmall rounded-full text-small transition-colors border",
              active.id === g.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-grayscale-5"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-sml auto-rows-fr">
        {active.skills.map((skill) => (
          <SkillSuggestionCard key={skill.id} skill={skill} onAdd={onAddSkill} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Skill card (unchanged)
// ============================================================

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
          <span className="text-label text-feedback-success font-medium">Inserido!</span>
        </div>
      )}
      <div className="flex items-start gap-xsmall mb-sml">
        <span className="text-label text-foreground flex-1">{skill.name}</span>
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
