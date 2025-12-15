import { CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PageFooterProps {
  userName: string;
  resource: string;
  authorized: boolean;
  permission?: string;
  onPermissionChange?: (permission: string) => void;
}

export function PageFooter({ 
  userName, 
  resource, 
  authorized, 
  permission,
  onPermissionChange 
}: PageFooterProps) {
  return (
    <footer className="bg-card border-t border-border px-xmedium py-sml">
      <div className="flex items-center justify-between text-small text-muted-foreground">
        <span>Usuário: {userName}</span>
        
        <div className="flex items-center gap-default">
          {permission !== undefined && onPermissionChange && (
            <div className="flex items-center gap-xsmall">
              <span>Permissão:</span>
              <Input
                value={permission}
                onChange={(e) => onPermissionChange(e.target.value)}
                className="w-24 h-7 text-small py-0"
                placeholder="user"
              />
            </div>
          )}
          
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
      </div>
    </footer>
  );
}
