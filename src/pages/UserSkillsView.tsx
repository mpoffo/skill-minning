import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, ArrowUpDown, X, Loader2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { usePlatform } from "@/contexts/PlatformContext";
import { supabase } from "@/integrations/supabase/client";

type SortOption = "name-asc" | "name-desc" | "proficiency-asc" | "proficiency-desc";

interface UserSkill {
  id: string;
  skillName: string;
  proficiency: number;
}

interface UserInfo {
  userName: string;
  fullName: string;
}

export default function UserSkillsView() {
  const { userName: targetUserName } = useParams<{ userName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantName, isLoaded } = usePlatform();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const returnTo = searchParams.get("returnTo") || "/talent-mining";

  // Load user info and skills
  useEffect(() => {
    const loadUserData = async () => {
      if (!isLoaded || !tenantName || !targetUserName) return;

      setIsLoading(true);
      try {
        // Get user info
        const { data: userData, error: userError } = await supabase
          .from("tenant_users")
          .select("user_name, full_name")
          .eq("tenant_name", tenantName)
          .eq("user_name", targetUserName)
          .single();

        if (userError) throw userError;
        setUserInfo({
          userName: userData.user_name,
          fullName: userData.full_name || userData.user_name,
        });

        // Get user skills
        const { data: skillsData, error: skillsError } = await supabase
          .from("user_skills")
          .select(`
            id,
            proficiency,
            skill_id,
            skills (name)
          `)
          .eq("tenant_name", tenantName)
          .eq("user_id", targetUserName);

        if (skillsError) throw skillsError;

        const skills: UserSkill[] = (skillsData || []).map((item: any) => ({
          id: item.id,
          skillName: item.skills?.name || "Unknown",
          proficiency: item.proficiency,
        }));

        setUserSkills(skills);
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [isLoaded, tenantName, targetUserName]);

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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-default" />
        <p className="text-label text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader
        title={isLoading ? "Carregando..." : `Habilidades de ${userInfo?.fullName || targetUserName}`}
        actions={
          <Button variant="outline" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="w-4 h-4 mr-xsmall" />
            Voltar
          </Button>
        }
      />

      <main className="flex-1 p-xmedium overflow-auto">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-xxbig">
              <Loader2 className="w-8 h-8 animate-spin text-primary mr-sml" />
              <span className="text-label text-muted-foreground">
                Carregando habilidades...
              </span>
            </div>
          ) : (
            <>
              {/* User info banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-big p-default mb-default">
                <h2 className="text-h3 font-semibold text-foreground">
                  {userInfo?.fullName}
                </h2>
                <p className="text-small text-muted-foreground">@{userInfo?.userName}</p>
                <p className="text-small text-muted-foreground mt-xsmall">
                  {userSkills.length} habilidade{userSkills.length !== 1 ? "s" : ""} cadastrada{userSkills.length !== 1 ? "s" : ""}
                </p>
              </div>

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
              {filteredSkills.length === 0 ? (
                <div className="text-center py-xxbig text-muted-foreground">
                  {searchTerm ? (
                    <p className="text-label">
                      Nenhuma habilidade encontrada para "{searchTerm}"
                    </p>
                  ) : (
                    <p className="text-label">
                      Este usuário não possui habilidades cadastradas
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-default">
                  {filteredSkills.map((skill) => (
                    <Card key={skill.id} className="shadow-dp02">
                      <CardContent className="p-default">
                        <h3 className="text-label font-medium text-foreground mb-sml truncate">
                          {skill.skillName}
                        </h3>
                        <StarRating
                          value={skill.proficiency}
                          onChange={() => {}}
                          readonly
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Summary */}
              {userSkills.length > 0 && (
                <div className="mt-default text-small text-muted-foreground text-center">
                  {filteredSkills.length} de {userSkills.length} habilidades
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
