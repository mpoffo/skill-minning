import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { PageFooter } from "@/components/PageFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RequiredSkillCard } from "@/components/RequiredSkillCard";
import { RankedUserCard } from "@/components/RankedUserCard";
import { AIRankedCandidateCard } from "@/components/AIRankedCandidateCard";
import { AISearchResults } from "@/components/AISearchResults";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { usePlatform } from "@/contexts/PlatformContext";
import { useCheckAccess } from "@/hooks/useCheckAccess";
import { AccessDenied } from "@/components/AccessDenied";
import { supabase } from "@/integrations/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBriefcase, faUsers, faSpinner, faPlus, faUserGroup, faRobot } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TALENT_MINING_RESOURCE = "res://senior.com.br/analytics/hcm/myAnalytics";
const TALENT_MINING_PERMISSION = "Visualizar";

interface JobPosition {
  id: string;
  jobPositionName: string;
  jobPositionDescription: string;
}

interface RequiredSkill {
  name: string;
  proficiency: number;
}

interface UserDetails {
  certifications?: string[];
  graduation?: string[];
  languages?: string;
  pdi?: string;
  feedbacks?: string[];
  hardSkills?: string[];
}

interface RankedUser {
  userId: string;
  userName: string;
  fullName: string;
  leaderName?: string;
  matchScore: number;
  matchedSkills: {
    skillName: string;
    requiredProficiency: number;
    userProficiency: number;
    similarity: number;
  }[];
  justification?: string;
  details?: UserDetails;
}

// AI Search types
interface AICandidate {
  rank: number;
  person_identifier: string;
  match_score: number;
  summary: string;
  evidence: {
    hard_skills: string[];
    joposition_job_description: string[];
    responsabilities: string[];
    seniority: string;
    certifications: string[];
    language_proficiency: string;
    graduation_postgraduation: string[];
    pdi_feedbacks: string[];
  };
  confidence: "high" | "medium" | "low";
  gaps: string[];
}

interface AISearchResult {
  understood_request: {
    role: string;
    seniority: string;
    must_have: string[];
    nice_to_have: string[];
    context: string;
  };
  clarifying_questions: string[];
  top_3: AICandidate[];
  risks_and_gaps_overall: string[];
  assumptions_made: string[];
  next_steps: {
    suggested_interview_checks: string[];
    suggested_filters_to_refine: string[];
  };
}

const TALENT_MINING_STATE_KEY = "talent-mining-state";

interface TalentMiningState {
  selectedJob: JobPosition | null;
  searchTerm: string;
  requiredSkills: RequiredSkill[];
  rankedUsers: RankedUser[];
}

export default function TalentMining() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantName, userName, isLoaded, permission, setPermission, isPermissionValid } = usePlatform();

  // Permission check
  const { hasAccess, isChecking } = useCheckAccess({
    resource: TALENT_MINING_RESOURCE,
    permission: TALENT_MINING_PERMISSION,
  });

  // Search mode toggle
  const [isAISearchMode, setIsAISearchMode] = useState(false);

  // Job position search (traditional mode)
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Required skills (traditional mode)
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  // Add skill manually
  const [newSkillName, setNewSkillName] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Talent ranking (traditional mode)
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  // AI Search state
  const [aiSearchQuery, setAISearchQuery] = useState("");
  const [aiSearchResult, setAISearchResult] = useState<AISearchResult | null>(null);
  const [isLoadingAISearch, setIsLoadingAISearch] = useState(false);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const restored = searchParams.get("restored");
    if (restored === "true") {
      const savedState = sessionStorage.getItem(TALENT_MINING_STATE_KEY);
      if (savedState) {
        try {
          const state: TalentMiningState = JSON.parse(savedState);
          setSelectedJob(state.selectedJob);
          setSearchTerm(state.searchTerm);
          setRequiredSkills(state.requiredSkills);
          setRankedUsers(state.rankedUsers);
          sessionStorage.removeItem(TALENT_MINING_STATE_KEY);
        } catch (e) {
          console.error("Error restoring state:", e);
        }
      }
      // Clean URL
      navigate("/talent-mining", { replace: true });
    }
  }, [searchParams, navigate]);

  // Load job positions from gist
  useEffect(() => {
    const fetchJobPositions = async () => {
      try {
        const response = await fetch(
          "https://gist.githubusercontent.com/mpoffo/408eac5a3e8d97477f004d3ad2631a56/raw/6b57ec6cce610f7da2f02fb32a6c43c4b6968e4a/cargos.json"
        );
        const data = await response.json();
        setJobPositions(data);
      } catch (error) {
        console.error("Error loading job positions:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os cargos",
          variant: "destructive",
        });
      }
    };
    fetchJobPositions();
  }, []);

  // Filter job positions based on search
  const filteredPositions = useMemo(() => {
    if (!debouncedSearch) return [];
    return jobPositions.filter((job) =>
      job.jobPositionName.toLowerCase().includes(debouncedSearch.toLowerCase())
    ).slice(0, 10);
  }, [jobPositions, debouncedSearch]);

  // Select job and identify skills via AI
  const handleSelectJob = async (job: JobPosition) => {
    setSelectedJob(job);
    setSearchTerm(job.jobPositionName);
    setShowDropdown(false);
    setRequiredSkills([]);
    setRankedUsers([]);
    setIsLoadingSkills(true);

    try {
      const { data, error } = await supabase.functions.invoke("identify-job-skills", {
        body: {
          jobPositionName: job.jobPositionName,
          jobPositionDescription: job.jobPositionDescription,
        },
      });

      if (error) throw error;

      const skills = (data.skills || []).map((name: string) => ({
        name,
        proficiency: 3, // Default proficiency
      }));
      setRequiredSkills(skills);
    } catch (error) {
      console.error("Error identifying skills:", error);
      toast({
        title: "Erro",
        description: "Não foi possível identificar as habilidades do cargo",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSkills(false);
    }
  };

  // Update skill proficiency
  const updateSkillProficiency = (skillName: string, proficiency: number) => {
    setRequiredSkills((prev) =>
      prev.map((skill) =>
        skill.name === skillName ? { ...skill, proficiency } : skill
      )
    );
  };

  // Remove skill
  const removeSkill = (skillName: string) => {
    setRequiredSkills((prev) => prev.filter((skill) => skill.name !== skillName));
  };

  // Add skill manually
  const handleAddSkill = () => {
    const trimmedName = newSkillName.trim();
    if (!trimmedName) return;

    // Check if skill already exists
    if (requiredSkills.some((s) => s.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({
        title: "Habilidade já existe",
        description: "Esta habilidade já está na lista",
        variant: "destructive",
      });
      return;
    }

    setRequiredSkills((prev) => [...prev, { name: trimmedName, proficiency: 3 }]);
    setNewSkillName("");
    setIsAddingSkill(false);
  };

  // Mine talents with semantic search (traditional mode)
  const handleMineTalents = async () => {
    if (!tenantName || requiredSkills.length === 0) return;

    setIsLoadingRanking(true);
    setRankedUsers([]);

    try {
      const { data, error } = await supabase.functions.invoke("rank-talents-semantic", {
        body: {
          tenantName,
          requiredSkills: requiredSkills.map((s) => ({
            name: s.name,
            proficiency: s.proficiency,
          })),
        },
      });

      if (error) throw error;

      setRankedUsers(data.rankedUsers || []);

      if ((data.rankedUsers || []).length === 0) {
        toast({
          title: "Nenhum resultado",
          description: "Não foram encontrados colaboradores com habilidades similares",
        });
      }
    } catch (error) {
      console.error("Error ranking talents:", error);
      toast({
        title: "Erro",
        description: "Não foi possível minerar os talentos",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRanking(false);
    }
  };

  // AI Search - Mine talents via AI agent
  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, descreva os requisitos da vaga",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAISearch(true);
    setAISearchResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("talent-mining-ai", {
        body: {
          jobRequirements: aiSearchQuery,
        },
      });

      if (error) throw error;

      setAISearchResult(data);

      if (!data.top_3 || data.top_3.length === 0) {
        toast({
          title: "Nenhum resultado",
          description: "A IA não encontrou candidatos para os requisitos informados",
        });
      }
    } catch (error) {
      console.error("Error in AI search:", error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar a busca com IA. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAISearch(false);
    }
  };

  // Show loading while checking permissions or platform context
  if (!isLoaded || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-small" />
          <p className="text-label text-muted-foreground">
            {isChecking ? "Verificando permissões..." : "Carregando..."}
          </p>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (hasAccess === false) {
    return (
      <AccessDenied 
        resource={TALENT_MINING_RESOURCE} 
        permission={TALENT_MINING_PERMISSION} 
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader title="Talent Mining" />

      <main className="flex-1 p-xlarge">
        <div className="max-w-6xl mx-auto space-y-xlarge">
          {/* Search Mode Toggle */}
          <Card>
            <CardHeader className="pb-small">
              <div className="flex items-center justify-between">
                <CardTitle>Modo de Busca</CardTitle>
                <div className="flex items-center gap-sml">
                  <Label htmlFor="search-mode" className={`text-small ${!isAISearchMode ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    Seleção de Cargo
                  </Label>
                  <Switch
                    id="search-mode"
                    checked={isAISearchMode}
                    onCheckedChange={setIsAISearchMode}
                  />
                  <Label htmlFor="search-mode" className={`text-small flex items-center gap-xsmall ${isAISearchMode ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    <FontAwesomeIcon icon={faRobot} className="text-primary" />
                    Busca com IA
                  </Label>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Traditional Mode: Job Position Search */}
          {!isAISearchMode && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-sml">
                    <FontAwesomeIcon icon={faBriefcase} className="text-primary" />
                    Seleção de Cargo
                  </CardTitle>
                  <CardDescription>
                    Busque e selecione um cargo para identificar as habilidades necessárias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="relative">
                      <FontAwesomeIcon
                        icon={faSearch}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        placeholder="Digite o nome do cargo..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowDropdown(true);
                          if (!e.target.value) {
                            setSelectedJob(null);
                            setRequiredSkills([]);
                            setRankedUsers([]);
                          }
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="pl-10"
                      />
                    </div>

                    {/* Autocomplete dropdown */}
                    {showDropdown && filteredPositions.length > 0 && (
                      <div className="absolute z-20 w-full mt-xsmall bg-card border border-border rounded-big shadow-dp08 max-h-[300px] overflow-auto">
                        {filteredPositions.map((job) => (
                          <button
                            key={job.id}
                            onClick={() => handleSelectJob(job)}
                            className="w-full text-left px-default py-sml hover:bg-grayscale-5 transition-colors border-b border-border last:border-b-0"
                          >
                            <span className="text-label text-foreground">{job.jobPositionName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected job description */}
                  {selectedJob && (
                    <div className="mt-medium p-default bg-grayscale-5 rounded-big">
                      <h4 className="text-label font-semibold text-foreground mb-xsmall">
                        {selectedJob.jobPositionName}
                      </h4>
                      <p className="text-small text-muted-foreground">
                        {selectedJob.jobPositionDescription}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Required Skills */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Habilidades Requeridas</CardTitle>
                      <CardDescription>
                        Ajuste o nível de proficiência esperado para cada habilidade
                      </CardDescription>
                    </div>
                    <span className="text-small text-muted-foreground">
                      {requiredSkills.length} habilidade{requiredSkills.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSkills ? (
                    <div className="flex items-center justify-center py-xlarge">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-primary text-2xl mr-sml" />
                      <span className="text-label text-muted-foreground">
                        Identificando habilidades via IA...
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-medium">
                      {/* Add skill input */}
                      <div className="flex gap-sml">
                        {isAddingSkill ? (
                          <>
                            <Input
                              placeholder="Nome da habilidade..."
                              value={newSkillName}
                              onChange={(e) => setNewSkillName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddSkill();
                                if (e.key === "Escape") {
                                  setIsAddingSkill(false);
                                  setNewSkillName("");
                                }
                              }}
                              autoFocus
                              className="flex-1"
                            />
                            <Button onClick={handleAddSkill} disabled={!newSkillName.trim()}>
                              Adicionar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsAddingSkill(false);
                                setNewSkillName("");
                              }}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setIsAddingSkill(true)}
                            className="gap-sml"
                          >
                            <FontAwesomeIcon icon={faPlus} />
                            Adicionar Habilidade
                          </Button>
                        )}
                      </div>

                      {/* Skills grid */}
                      {requiredSkills.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-sml">
                          {requiredSkills.map((skill) => (
                            <RequiredSkillCard
                              key={skill.name}
                              name={skill.name}
                              proficiency={skill.proficiency}
                              onProficiencyChange={updateSkillProficiency}
                              onDelete={removeSkill}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-xlarge text-muted-foreground">
                          <p>Selecione um cargo acima ou adicione habilidades manualmente</p>
                        </div>
                      )}

                      {/* Mine talents button */}
                      {requiredSkills.length > 0 && (
                        <div className="flex justify-end pt-medium border-t border-border">
                          <Button
                            onClick={handleMineTalents}
                            disabled={isLoadingRanking}
                            size="lg"
                            className="gap-sml"
                          >
                            {isLoadingRanking ? (
                              <FontAwesomeIcon icon={faSpinner} spin />
                            ) : (
                              <FontAwesomeIcon icon={faUsers} />
                            )}
                            Minerar Talentos
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ranked Users (Traditional Mode) */}
              {(isLoadingRanking || rankedUsers.length > 0) && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-sml">
                        <FontAwesomeIcon icon={faUserGroup} className="text-primary" />
                        <CardTitle>Top {Math.min(rankedUsers.length, 20)} Candidatos</CardTitle>
                      </div>
                      {selectedJob && (
                        <Badge variant="outline" className="text-small">
                          {selectedJob.jobPositionName}
                        </Badge>
                      )}
                    </div>
                    {requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-xsmall mt-sml">
                        {requiredSkills.slice(0, 5).map((skill) => (
                          <Badge key={skill.name} className="bg-primary/10 text-primary">
                            {skill.name}
                          </Badge>
                        ))}
                        {requiredSkills.length > 5 && (
                          <Badge variant="outline">+{requiredSkills.length - 5}</Badge>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isLoadingRanking ? (
                      <div className="flex items-center justify-center py-xlarge">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-primary text-2xl mr-sml" />
                        <span className="text-label text-muted-foreground">
                          Minerando talentos com busca semântica...
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-sml">
                        {rankedUsers.map((user, index) => (
                          <RankedUserCard
                            key={user.userId}
                            rank={index}
                            userName={user.userName}
                            fullName={user.fullName}
                            leaderName={user.leaderName}
                            matchScore={user.matchScore}
                            matchedSkills={user.matchedSkills}
                            justification={user.justification}
                            details={user.details}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* AI Search Mode */}
          {isAISearchMode && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-sml">
                    <FontAwesomeIcon icon={faRobot} className="text-primary" />
                    Busca Inteligente com IA
                  </CardTitle>
                  <CardDescription>
                    Descreva os requisitos da vaga em linguagem natural e a IA encontrará os melhores candidatos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-medium">
                  <Textarea
                    placeholder="Preciso de um profissional PYTHON SÊNIOR para atuar como Backend em microserviços. Contexto: projeto em produção com alta concorrência e observabilidade. Requisitos obrigatórios: Python, FastAPI ou Django REST Framework, PostgreSQL, Docker, Kubernetes. Desejável: conhecimento em mensageria (Kafka/RabbitMQ), observabilidade (Prometheus/Grafana), inglês avançado."
                    value={aiSearchQuery}
                    onChange={(e) => setAISearchQuery(e.target.value)}
                    className="min-h-[150px] text-label"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAISearch}
                      disabled={isLoadingAISearch || !aiSearchQuery.trim()}
                      size="lg"
                      className="gap-sml"
                    >
                      {isLoadingAISearch ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                      ) : (
                        <FontAwesomeIcon icon={faUsers} />
                      )}
                      Minerar Talentos
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Search Loading */}
              {isLoadingAISearch && (
                <Card>
                  <CardContent className="py-xlarge">
                    <div className="flex flex-col items-center justify-center gap-sml">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-primary text-4xl" />
                      <span className="text-label text-muted-foreground">
                        Processando busca com IA...
                      </span>
                      <span className="text-small text-muted-foreground">
                        Isso pode levar alguns minutos
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Search Results - Top Candidates */}
              {aiSearchResult && aiSearchResult.top_3 && aiSearchResult.top_3.length > 0 && (
                <AISearchResults candidates={aiSearchResult.top_3} />
              )}

              {/* AI Insights */}
              {aiSearchResult && (
                <AIInsightsCard insights={aiSearchResult} />
              )}
            </>
          )}
        </div>
      </main>

      <PageFooter
        userName={userName || ""}
        resource="res://senior.com.br/hcm/competencymanagement/entities/competencyskillproficiencytable"
        authorized={hasAccess === true}
      />
    </div>
  );
}
