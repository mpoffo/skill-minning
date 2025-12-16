import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  resource?: string;
  permission?: string;
}

export function AccessDenied({ resource, permission }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-medium max-w-md">
        <div className="flex justify-center">
          <div className="p-xlarge rounded-full bg-feedback-error/10">
            <ShieldX className="h-16 w-16 text-feedback-error" />
          </div>
        </div>
        <h1 className="text-h2 font-semibold text-foreground">
          Acesso Negado
        </h1>
        <p className="text-label text-muted-foreground">
          Você não possui permissão para acessar esta funcionalidade.
        </p>
        {resource && (
          <p className="text-small text-muted-foreground">
            Recurso: <code className="bg-grayscale-5 px-xsmall py-[2px] rounded">{resource}</code>
          </p>
        )}
        {permission && (
          <p className="text-small text-muted-foreground">
            Permissão necessária: <code className="bg-grayscale-5 px-xsmall py-[2px] rounded">{permission}</code>
          </p>
        )}
        <div className="pt-medium">
          <Button onClick={() => navigate(-1)} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
