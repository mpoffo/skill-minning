import { useState, useMemo } from "react";
import { Plus, Search, ArrowUpDown, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { PageFooter } from "@/components/PageFooter";
import { SkillGridCard } from "@/components/SkillGridCard";
import { SkillSearchSidebar } from "@/components/SkillSearchSidebar";
import { AccessDenied } from "@/components/AccessDenied";
import { usePlatform } from "@/contexts/PlatformContext";
import { useSkills } from "@/hooks/useSkills";
import { useCheckAccess } from "@/hooks/useCheckAccess";

const MY_SKILLS_RESOURCE = "res://senior.com.br/analytics/hcm/myAnalytics";
const MY_SKILLS_PERMISSION = "Visualizar";

type SortOption = "name-asc" | "name-desc" | "proficiency-asc" | "proficiency-desc";

export default function MySkills() {
  const { isLoaded, fullName, permission, setPermission } = usePlatform();
  const { hasAccess, isChecking } = useCheckAccess({
    resource: MY_SKILLS_RESOURCE,
    permission: MY_SKILLS_PERMISSION,
  });

  const { userSkills, isLoading, addSkill, updateProficiency, deleteSkill } = useSkills();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filter and sort skills
  const filteredSkills = useMemo(() => {
    let result = [...userSkills];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((skill) =>
        skill.skillName.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.skillName.localeCompare(b.skillName);
        case "name-desc":
          return b.skillName.localeCompare(a.skillName);
        case "proficiency-asc":
          return a.proficiency - b.proficiency;
        case "proficiency-desc":
          return b.proficiency - a.proficiency;
        default:
          return 0;
      }
    });

    return result;
  }, [userSkills, searchTerm, sortBy]);

  const handleProficiencyChange = async (id: string, proficiency: number) => {
    await updateProficiency(id, proficiency);
  };

  const handleDeleteSkill = async (id: string) => {
    await deleteSkill(id);
  };

  const handleAddSkill = async (skillName: string, proficiency: number) => {
    return await addSkill(skillName, proficiency);
  };

  // Show loading state if platform context not loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-default" />
        <p className="text-label text-muted-foreground">Aguardando contexto da plataforma...</p>
        <p className="text-small text-muted-foreground mt-xsmall">
          Esta tela deve ser carregada dentro da plataforma Senior
        </p>
      </div>
    );
  }

  // Show loading while checking permissions
  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-default" />
        <p className="text-label text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  // Show access denied if no permission
  if (hasAccess === false) {
    return <AccessDenied resource={MY_SKILLS_RESOURCE} permission={MY_SKILLS_PERMISSION} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader
        title="Minhas Habilidades"
        actions={
          <Button onClick={() => setIsSidebarOpen(true)}>
            <Plus className="w-4 h-4 mr-xsmall" />
            Adicionar Habilidade
          </Button>
        }
      />

      <div className="flex-1 flex">
        {/* Main Content */}
        <main className="flex-1 p-xmedium overflow-auto">
          <div className="max-w-6xl mx-auto">
            {/* Filters */}
            <div className="bg-card rounded-big p-default shadow-dp02 mb-default">
              <div className="flex flex-col sm:flex-row gap-sml">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-sml top-1/2 -translate-y-1/2 w-5 h-5 text-grayscale-50" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar habilidades..."
                    className="pl-xbig pr-xbig"
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

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <ArrowUpDown className="w-4 h-4 mr-xsmall text-grayscale-60" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                    <SelectItem value="proficiency-desc">Maior proficiência</SelectItem>
                    <SelectItem value="proficiency-asc">Menor proficiência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>


            {/* Skills Grid */}
            {filteredSkills.length === 0 && !isLoading && (
              <div className="text-center py-xxbig text-muted-foreground">
                {searchTerm ? (
                  <p className="text-label">
                    Nenhuma habilidade encontrada para "{searchTerm}"
                  </p>
                ) : (
                  <div>
                    <p className="text-label mb-sml">
                      Você ainda não cadastrou nenhuma habilidade
                    </p>
                    <Button onClick={() => setIsSidebarOpen(true)}>
                      <Plus className="w-4 h-4 mr-xsmall" />
                      Adicionar primeira habilidade
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-default">
              {filteredSkills.map((skill) => (
                <SkillGridCard
                  key={skill.id}
                  id={skill.id}
                  name={skill.skillName}
                  proficiency={skill.proficiency}
                  onProficiencyChange={handleProficiencyChange}
                  onDelete={handleDeleteSkill}
                />
              ))}
            </div>

            {/* Summary */}
            {userSkills.length > 0 && (
              <div className="mt-default text-small text-muted-foreground text-center">
                {filteredSkills.length} de {userSkills.length} habilidades
              </div>
            )}
          </div>
        </main>

        {/* Search Sidebar */}
        <SkillSearchSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          existingSkills={userSkills}
          onAddSkill={handleAddSkill}
        />
      </div>

      <PageFooter
        userName={fullName || "Usuário"}
        resource={MY_SKILLS_RESOURCE}
        authorized={hasAccess === true}
        permission={permission}
        onPermissionChange={setPermission}
      />
    </div>
  );
}
