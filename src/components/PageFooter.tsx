import { CheckCircle, XCircle } from "lucide-react";

interface PageFooterProps {
  userName: string;
  resource: string;
  authorized: boolean;
}

export function PageFooter({ userName, resource, authorized }: PageFooterProps) {
  return (
    <footer className="bg-card border-t border-border px-xmedium py-sml">
      <div className="flex items-center justify-between text-small text-muted-foreground">
        <span>Usuário: {userName}</span>
        <div className="flex items-center gap-xsmall">
          <span>Recurso: {resource}</span>
          {authorized ? (
            <span className="flex items-center gap-xxsmall text-feedback-success">
              <CheckCircle className="w-4 h-4" />
              Autorizado
            </span>
          ) : (
            <span className="flex items-center gap-xxsmall text-feedback-error">
              <XCircle className="w-4 h-4" />
              Não autorizado
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
