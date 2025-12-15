import { useState } from "react";
import { Database, Loader2, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/contexts/PlatformContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HardSkillItem {
  skill: string;
  origin: string;
}

interface HCMImportProps {
  onSkillsExtracted: (skills: { name: string; origin: string }[]) => void;
  existingSkillNames: string[];
}

const originLabels: Record<string, string> = {
  responsibilities: "Responsabilidades",
  certifications: "Certificações",
  education: "Formação",
  experience: "Experiência",
  position: "Cargo",
  inferred: "Inferido",
};

const originColors: Record<string, string> = {
  responsibilities: "bg-blue-500/10 text-blue-600",
  certifications: "bg-green-500/10 text-green-600",
  education: "bg-purple-500/10 text-purple-600",
  experience: "bg-orange-500/10 text-orange-600",
  position: "bg-cyan-500/10 text-cyan-600",
  inferred: "bg-gray-500/10 text-gray-600",
};

export function HCMImport({ onSkillsExtracted, existingSkillNames }: HCMImportProps) {
  const { userName } = usePlatform();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<HardSkillItem[]>([]);

  const handleMining = async () => {
    if (!userName) {
      toast({
        title: "Usuário não identificado",
        description: "Não foi possível identificar o usuário logado.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setExtractedSkills([]);

    try {
      const { data, error } = await supabase.functions.invoke('hcm-mining', {
        body: { userName },
      });

      if (error) {
        console.error('Error in HCM Mining:', error);
        toast({
          title: "Erro ao processar",
          description: "Não foi possível obter as habilidades do HCM.",
          variant: "destructive",
        });
        return;
      }

      const skills: HardSkillItem[] = data.skills || [];
      
      // Filter out skills the user already has
      const newSkills = skills.filter(
        (item: HardSkillItem) => !existingSkillNames.some(
          existing => existing.toLowerCase() === item.skill.toLowerCase()
        )
      );

      if (skills.length === 0) {
        toast({
          title: "Nenhuma habilidade encontrada",
          description: "O sistema não retornou habilidades para este usuário.",
        });
        return;
      }

      setExtractedSkills(newSkills);
      
      if (newSkills.length > 0) {
        toast({
          title: "Habilidades encontradas!",
          description: `${newSkills.length} nova(s) habilidade(s) sugerida(s) pelo HCM.`,
        });
        onSkillsExtracted(newSkills.map(item => ({ name: item.skill, origin: item.origin })));
      } else {
        toast({
          title: "Todas já cadastradas",
          description: "Você já possui todas as habilidades sugeridas.",
        });
      }
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar a requisição.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="border border-border rounded-big p-default bg-card">
      <div className="flex items-center gap-sml mb-sml">
        <Database className="w-5 h-5 text-primary" />
        <span className="text-label font-medium text-foreground">HCM-Mining</span>
      </div>
      
      <div className="text-small text-muted-foreground mb-default space-y-xsmall">
        <div className="flex items-start gap-xsmall">
          <Info className="w-4 h-4 flex-shrink-0 mt-xxsmall" />
          <span>Geração de hard skills via IA com base no cargo e perfil do usuário no HCM.</span>
        </div>
      </div>

      <Button
        variant="default"
        className="w-full"
        onClick={handleMining}
        disabled={isProcessing || !userName}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-xsmall animate-spin" />
            Processando IA...
          </>
        ) : (
          <>
            <Database className="w-4 h-4 mr-xsmall" />
            Buscar Habilidades
          </>
        )}
      </Button>

      {extractedSkills.length > 0 && (
        <div className="mt-default">
          <div className="flex items-center gap-xsmall text-feedback-success text-small mb-xsmall">
            <CheckCircle className="w-4 h-4" />
            <span>{extractedSkills.length} habilidades novas sugeridas</span>
          </div>
          <TooltipProvider>
            <div className="flex flex-wrap gap-xsmall">
              {extractedSkills.slice(0, 10).map((item, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <span
                      className={`text-small px-xsmall py-xxsmall rounded-small cursor-help ${originColors[item.origin] || originColors.inferred}`}
                    >
                      {item.skill}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Origem: {originLabels[item.origin] || item.origin}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {extractedSkills.length > 10 && (
                <span className="text-small text-muted-foreground">
                  +{extractedSkills.length - 10} mais
                </span>
              )}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
