import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { PageFooter } from "@/components/PageFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RequiredSkillCard } from "@/components/RequiredSkillCard";
import { usePlatform } from "@/contexts/PlatformContext";
import { useCheckAccess } from "@/hooks/useCheckAccess";
import { AccessDenied } from "@/components/AccessDenied";
import { supabase } from "@/integrations/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBriefcase, faUsers, faSpinner, faTrophy, faMedal, faAward, faPlus, faEye, faUser } from "@fortawesome/free-solid-svg-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2 } from "lucide-react";

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

interface RankedUser {
  userId: string;
  userName: string;
  fullName: string;
  matchScore: number;
  matchedSkills: {
    skillName: string;
    requiredProficiency: number;
    userProficiency: number;
    similarity: number;
  }[];
  justification?: string;
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

  // Job position search
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Required skills
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  // Add skill manually
  const [newSkillName, setNewSkillName] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Talent ranking
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  // Profile summary dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    name: string;
    position: string;
    seniority: string;
    summary: string;
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

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

  // Save state before navigation
  const navigateToUserSkills = useCallback((targetUserName: string) => {
    const state: TalentMiningState = {
      selectedJob,
      searchTerm,
      requiredSkills,
      rankedUsers,
    };
    sessionStorage.setItem(TALENT_MINING_STATE_KEY, JSON.stringify(state));
    navigate(`/user-skills/${targetUserName}?returnTo=/talent-mining?restored=true`);
  }, [selectedJob, searchTerm, requiredSkills, rankedUsers, navigate]);

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

  // Mine talents with semantic search
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

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <FontAwesomeIcon icon={faTrophy} className="text-feedback-warning text-xl" />;
      case 1:
        return <FontAwesomeIcon icon={faMedal} className="text-grayscale-40 text-xl" />;
      case 2:
        return <FontAwesomeIcon icon={faAward} className="text-primary text-xl" />;
      default:
        return <span className="text-label text-muted-foreground font-bold">{index + 1}º</span>;
    }
  };

  const handleViewProfile = async (targetUserName: string) => {
    setIsLoadingProfile(true);
    setProfileDialogOpen(true);
    setProfileData(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-summary", {
        body: { userName: targetUserName },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Colaborador não encontrado",
          description: "Não foram encontrados dados para este colaborador",
          variant: "destructive",
        });
        setProfileDialogOpen(false);
        return;
      }

      setProfileData({
        name: data.collaborator.name,
        position: data.collaborator.position,
        seniority: data.collaborator.seniority,
        summary: data.summary,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o perfil resumido",
        variant: "destructive",
      });
      setProfileDialogOpen(false);
    } finally {
      setIsLoadingProfile(false);
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
          {/* Job Position Search */}
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

          {/* Ranked Users */}
          {(isLoadingRanking || rankedUsers.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Talentos</CardTitle>
                <CardDescription>
                  Colaboradores ordenados por aderência semântica às habilidades requeridas
                </CardDescription>
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
                      <div
                        key={user.userId}
                        className={cn(
                          "p-default rounded-big border",
                          index === 0 && "border-feedback-warning bg-feedback-warning/5",
                          index === 1 && "border-grayscale-40 bg-grayscale-5",
                          index === 2 && "border-primary bg-primary/5",
                          index > 2 && "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start gap-medium">
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                            {getRankIcon(index)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-xsmall">
                              <div>
                                <h4 className="text-label font-semibold text-foreground">
                                  {user.fullName || user.userName}
                                </h4>
                                <span className="text-small text-muted-foreground">
                                  @{user.userName}
                                </span>
                              </div>
                              <div className="flex items-center gap-sml">
                                <div className="text-right">
                                  <span className="text-h3 font-bold text-primary">
                                    {Math.round(user.matchScore)}%
                                  </span>
                                  <p className="text-small text-muted-foreground">Aderência</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigateToUserSkills(user.userName)}
                                  className="gap-xsmall"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                  Ver habilidades
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewProfile(user.userName)}
                                  className="gap-xsmall"
                                >
                                  <FontAwesomeIcon icon={faUser} />
                                  Perfil
                                </Button>
                              </div>
                            </div>
                            
                            {/* Justification for top 3 */}
                            {index < 3 && user.justification && (
                              <div className="mb-sml p-sml bg-background/50 rounded-medium border border-border/50">
                                <p className="text-small text-foreground italic">
                                  "{user.justification}"
                                </p>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-xsmall mt-sml">
                              {user.matchedSkills.map((skill) => (
                                <div
                                  key={skill.skillName}
                                  className={cn(
                                    "px-sml py-xxsmall rounded-medium text-small",
                                    skill.userProficiency >= skill.requiredProficiency
                                      ? "bg-feedback-success/10 text-feedback-success"
                                      : "bg-feedback-warning/10 text-feedback-warning"
                                  )}
                                  title={`Similaridade: ${Math.round(skill.similarity * 100)}%`}
                                >
                                  {skill.skillName}: {skill.userProficiency}/{skill.requiredProficiency}★
                                  {skill.similarity < 1 && (
                                    <span className="ml-1 opacity-70">
                                      (~{Math.round(skill.similarity * 100)}%)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <PageFooter
        userName={userName || ""}
        resource="res://senior.com.br/hcm/competencymanagement/entities/competencyskillproficiencytable"
        authorized={isPermissionValid}
        permission={permission}
        onPermissionChange={setPermission}
      />

      {/* Profile Summary Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-sml">
              <FontAwesomeIcon icon={faUser} className="text-primary" />
              Perfil Resumido
            </DialogTitle>
            {profileData && (
              <DialogDescription>
                {profileData.name} • {profileData.position} • {profileData.seniority}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-medium">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-xlarge">
                <FontAwesomeIcon icon={faSpinner} spin className="text-primary text-xl mr-sml" />
                <span className="text-muted-foreground">Gerando perfil resumido...</span>
              </div>
            ) : profileData ? (
              <p className="text-body text-foreground leading-relaxed">
                {profileData.summary}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
