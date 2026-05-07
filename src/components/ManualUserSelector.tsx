import { useState } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onConfirm: () => void;
}

export function ManualUserSelector({ onConfirm }: Props) {
  const [userName, setUserName] = useState("");
  const [tenant, setTenant] = useState("senior.com.br");

  const handleConfirm = () => {
    if (!userName.trim()) return;

    const fakeContext = {
      token: {
        scope: "openid",
        expires_in: 3600,
        username: `${userName.trim()}@${tenant}`,
        token_type: "Bearer",
        access_token: "manual-context",
        refresh_token: "",
        email: `${userName.trim()}@${tenant}`,
        fullName: userName.trim(),
        tenantName: tenant,
      },
      servicesUrl: "",
    };
    sessionStorage.setItem("platformContext", JSON.stringify(fakeContext));
    onConfirm();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-default">
      <div className="w-full max-w-md bg-card rounded-big shadow-dp02 p-xmedium">
        <div className="flex items-center gap-sml mb-default">
          <UserCheck className="w-6 h-6 text-primary" />
          <h2 className="text-h3 font-semibold">Modo Demonstração</h2>
        </div>
        <p className="text-small text-muted-foreground mb-default">
          A tela está sem contexto da plataforma. Informe um usuário de referência para
          associar as habilidades.
        </p>

        <div className="space-y-default">
          <div>
            <label className="text-label mb-xsmall block">Usuário</label>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ex: diegof.silva"
              autoFocus
            />
          </div>

          <div>
            <label className="text-label mb-xsmall block">Tenant</label>
            <Input
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="Ex: senior.com.br"
            />
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!userName.trim()}
            className="w-full"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
