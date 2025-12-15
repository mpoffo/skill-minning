import { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LinkedInImportProps {
  onSkillsExtracted: (skills: string[]) => void;
  existingSkillNames: string[];
}

export function LinkedInImport({ onSkillsExtracted, existingSkillNames }: LinkedInImportProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo PDF do LinkedIn.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setExtractedSkills([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('parse-linkedin-pdf', {
        body: formData,
      });

      if (error) {
        console.error('Error parsing PDF:', error);
        toast({
          title: "Erro ao processar",
          description: "Não foi possível processar o arquivo PDF.",
          variant: "destructive",
        });
        return;
      }

      const skills = data.skills || [];
      
      // Filter out skills the user already has
      const newSkills = skills.filter(
        (skill: string) => !existingSkillNames.some(
          existing => existing.toLowerCase() === skill.toLowerCase()
        )
      );

      if (skills.length === 0) {
        toast({
          title: "Nenhuma habilidade encontrada",
          description: "O arquivo não contém habilidades identificáveis.",
        });
        return;
      }

      setExtractedSkills(newSkills);
      
      if (newSkills.length > 0) {
        toast({
          title: "Habilidades encontradas!",
          description: `${newSkills.length} nova(s) habilidade(s) extraída(s) do perfil.`,
        });
        onSkillsExtracted(newSkills);
      } else {
        toast({
          title: "Todas já cadastradas",
          description: "Você já possui todas as habilidades encontradas no perfil.",
        });
      }
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border border-border rounded-big p-default bg-card">
      <div className="flex items-center gap-sml mb-sml">
        <FileText className="w-5 h-5 text-primary" />
        <span className="text-label font-medium text-foreground">Importar do LinkedIn</span>
      </div>
      
      <div className="text-small text-muted-foreground mb-default space-y-xsmall">
        <div className="flex items-start gap-xsmall">
          <Info className="w-4 h-4 flex-shrink-0 mt-xxsmall" />
          <span>Como obter o PDF do seu perfil:</span>
        </div>
        <ol className="list-decimal list-inside pl-sml space-y-xxsmall">
          <li>Acesse seu perfil no LinkedIn</li>
          <li>Clique em "Recursos" (abaixo da foto)</li>
          <li>Selecione "Salvar como PDF"</li>
        </ol>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-xsmall animate-spin" />
            Analisando com IA...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-xsmall" />
            Selecionar PDF do LinkedIn
          </>
        )}
      </Button>

      {extractedSkills.length > 0 && (
        <div className="mt-default">
          <div className="flex items-center gap-xsmall text-feedback-success text-small mb-xsmall">
            <CheckCircle className="w-4 h-4" />
            <span>{extractedSkills.length} habilidades novas encontradas</span>
          </div>
          <div className="flex flex-wrap gap-xsmall">
            {extractedSkills.slice(0, 10).map((skill, i) => (
              <span
                key={i}
                className="text-small px-xsmall py-xxsmall bg-primary/10 text-primary rounded-small"
              >
                {skill}
              </span>
            ))}
            {extractedSkills.length > 10 && (
              <span className="text-small text-muted-foreground">
                +{extractedSkills.length - 10} mais
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
