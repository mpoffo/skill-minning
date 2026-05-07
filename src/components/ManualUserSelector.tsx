import { useEffect, useMemo, useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TenantUserRow {
  tenant_name: string;
  user_name: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  onConfirm: () => void;
}

export function ManualUserSelector({ onConfirm }: Props) {
  const [users, setUsers] = useState<TenantUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tenant_users")
        .select("tenant_name, user_name, full_name, email")
        .order("tenant_name", { ascending: true })
        .order("user_name", { ascending: true })
        .limit(1000);
      if (!error && data) setUsers(data as TenantUserRow[]);
      setLoading(false);
    })();
  }, []);

  const tenants = useMemo(
    () => Array.from(new Set(users.map((u) => u.tenant_name))).sort(),
    [users]
  );

  const tenantUsers = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return users
      .filter((u) => u.tenant_name === tenant)
      .filter(
        (u) =>
          !f ||
          u.user_name.toLowerCase().includes(f) ||
          (u.full_name || "").toLowerCase().includes(f) ||
          (u.email || "").toLowerCase().includes(f)
      );
  }, [users, tenant, filter]);

  const handleConfirm = () => {
    const selected = users.find(
      (u) => u.tenant_name === tenant && u.user_name === userName
    );
    if (!selected) return;

    const fakeContext = {
      token: {
        scope: "openid",
        expires_in: 3600,
        username: selected.email || `${selected.user_name}@${selected.tenant_name}`,
        token_type: "Bearer",
        access_token: "manual-context",
        refresh_token: "",
        email: selected.email || "",
        fullName: selected.full_name || selected.user_name,
        tenantName: selected.tenant_name,
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
          <h2 className="text-h3 font-semibold">Selecione um usuário</h2>
        </div>
        <p className="text-small text-muted-foreground mb-default">
          A tela está sem contexto da plataforma. Escolha um usuário existente
          para associar as habilidades.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-big">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-default">
            <div>
              <label className="text-label mb-xsmall block">Tenant</label>
              <Select value={tenant} onValueChange={(v) => { setTenant(v); setUserName(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tenant && (
              <>
                <div>
                  <label className="text-label mb-xsmall block">Buscar usuário</label>
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filtrar por nome, usuário ou e-mail..."
                  />
                </div>
                <div>
                  <label className="text-label mb-xsmall block">Usuário</label>
                  <Select value={userName} onValueChange={setUserName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {tenantUsers.map((u) => (
                        <SelectItem key={u.user_name} value={u.user_name}>
                          {u.full_name || u.user_name} ({u.user_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              onClick={handleConfirm}
              disabled={!tenant || !userName}
              className="w-full"
            >
              Confirmar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
