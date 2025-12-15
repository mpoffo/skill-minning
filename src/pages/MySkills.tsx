import { useState, useMemo } from "react";
import { Plus, Search, ArrowUpDown, X } from "lucide-react";
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
import { SkillCard } from "@/components/SkillCard";
import { AddSkillModal } from "@/components/AddSkillModal";
import { toast } from "@/hooks/use-toast";

interface UserSkill {
  id: string;
  name: string;
  proficiency: number;
  validated: boolean;
}

// Initial mock data
const initialSkills: UserSkill[] = [
  { id: "1", name: "React", proficiency: 4, validated: true },
  { id: "2", name: "TypeScript", proficiency: 4, validated: true },
  { id: "3", name: "Node.js", proficiency: 3, validated: true },
  { id: "4", name: "SQL Server", proficiency: 3, validated: true },
  { id: "5", name: "Git", proficiency: 5, validated: true },
  { id: "6", name: "Docker", proficiency: 2, validated: false },
  { id: "7", name: "AWS", proficiency: 2, validated: true },
  { id: "8", name: "Agile", proficiency: 4, validated: true },
];

type SortOption = "name-asc" | "name-desc" | "proficiency-asc" | "proficiency-desc";

export default function MySkills() {
  const [skills, setSkills] = useState<UserSkill[]>(initialSkills);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filter and sort skills
  const filteredSkills = useMemo(() => {
    let result = [...skills];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((skill) =>
        skill.name.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "proficiency-asc":
          return a.proficiency - b.proficiency;
        case "proficiency-desc":
          return b.proficiency - a.proficiency;
        default:
          return 0;
      }
    });

    return result;
  }, [skills, searchTerm, sortBy]);

  const handleProficiencyChange = async (id: string, proficiency: number) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    setSkills((prev) =>
      prev.map((skill) =>
        skill.id === id ? { ...skill, proficiency } : skill
      )
    );
    
    setIsLoading(false);
    
    const skillName = skills.find((s) => s.id === id)?.name;
    toast({
      title: "Proficiência atualizada",
      description: `${skillName} atualizada para nível ${proficiency}`,
    });
  };

  const handleDeleteSkill = async (id: string) => {
    const skillName = skills.find((s) => s.id === id)?.name;
    
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    setSkills((prev) => prev.filter((skill) => skill.id !== id));
    
    setIsLoading(false);
    
    toast({
      title: "Habilidade removida",
      description: `${skillName} foi removida das suas habilidades`,
    });
  };

  const handleAddSkill = async (skillName: string, proficiency: number) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const newSkill: UserSkill = {
      id: `skill-${Date.now()}`,
      name: skillName,
      proficiency,
      validated: false,
    };
    
    setSkills((prev) => [...prev, newSkill]);
    
    setIsLoading(false);
    
    toast({
      title: "Habilidade adicionada",
      description: `${skillName} foi adicionada com proficiência ${proficiency}`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader
        title="Minhas Habilidades"
        actions={
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-xsmall" />
            Adicionar Habilidade
          </Button>
        }
      />

      <main className="flex-1 p-xmedium">
        <div className="max-w-4xl mx-auto">
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

          {/* Skills List */}
          <div className="space-y-xsmall">
            {isLoading && (
              <div className="text-center py-default">
                <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

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
                    <Button onClick={() => setIsAddModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-xsmall" />
                      Adicionar primeira habilidade
                    </Button>
                  </div>
                )}
              </div>
            )}

            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                id={skill.id}
                name={skill.name}
                proficiency={skill.proficiency}
                validated={skill.validated}
                onProficiencyChange={handleProficiencyChange}
                onDelete={handleDeleteSkill}
              />
            ))}
          </div>

          {/* Summary */}
          {skills.length > 0 && (
            <div className="mt-default text-small text-muted-foreground text-center">
              {filteredSkills.length} de {skills.length} habilidades
            </div>
          )}
        </div>
      </main>

      <PageFooter
        userName="MAICON SCHROEDER"
        resource="res://senior.com.br/analytics/hcm/myAnalytics"
        authorized={true}
      />

      <AddSkillModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        existingSkills={skills}
        onAddSkill={handleAddSkill}
      />
    </div>
  );
}
