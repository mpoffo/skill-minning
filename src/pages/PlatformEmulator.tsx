import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Search, Database } from "lucide-react";

const defaultToken = {
  scope: "browser+device_web",
  expires_in: 21600,
  username: "",
  token_type: "bearer",
  access_token: "",
  refresh_token: "",
  email: "",
  fullName: "",
  tenantName: "",
};

const environments = {
  leaf: {
    name: "Leaf",
    url: "https://cloud-leaf.senior.com.br/t/senior.com.br/bridge/1.0/rest/",
  },
  homologx: {
    name: "Homologx",
    url: "https://platform-homologx.senior.com.br/t/senior.com.br/bridge/1.0/rest/",
  },
};

export default function PlatformEmulator() {
  const navigate = useNavigate();
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<keyof typeof environments>("leaf");
  
  // Form state
  const [username, setUsername] = useState(defaultToken.username);
  const [fullName, setFullName] = useState(defaultToken.fullName);
  const [email, setEmail] = useState(defaultToken.email);
  const [tenantName, setTenantName] = useState(defaultToken.tenantName);
  const [accessToken, setAccessToken] = useState(defaultToken.access_token);
  const servicesUrl = environments[selectedEnv].url;

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      toast.error("Preencha usuário e senha");
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // Call login via edge function gateway
      const { data: loginData, error: loginError } = await supabase.functions.invoke('platform-gateway', {
        body: {
          action: 'login',
          servicesUrl,
          username: loginUsername,
          password: loginPassword,
        },
      });

      if (loginError) {
        throw new Error(loginError.message || 'Falha na autenticação');
      }

      if (loginData.error) {
        throw new Error(loginData.error);
      }

      const tokenData = JSON.parse(loginData.jsonToken);
      const token = tokenData.access_token;

      // Call getUser via edge function gateway
      const { data: userData, error: userError } = await supabase.functions.invoke('platform-gateway', {
        body: {
          action: 'getUser',
          servicesUrl,
          accessToken: token,
        },
      });

      if (userError) {
        throw new Error(userError.message || 'Falha ao obter dados do usuário');
      }

      if (userData.error) {
        throw new Error(userData.error);
      }

      // Fill in the form fields
      setAccessToken(token);
      setUsername(userData.username);
      setFullName(userData.fullName);
      setEmail(userData.email);
      setTenantName(userData.tenantName);

      toast.success("Login realizado com sucesso!");
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao fazer login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const saveContextAndNavigate = (path: string) => {
    if (!username || !tenantName) {
      toast.error("Preencha pelo menos o username e tenant name");
      return;
    }

    // Store context in sessionStorage for the skills page to read
    const platformContext = {
      token: {
        ...defaultToken,
        username,
        fullName,
        email,
        tenantName,
        access_token: accessToken,
      },
      servicesUrl,
    };

    sessionStorage.setItem('platformContext', JSON.stringify(platformContext));
    
    toast.success("Contexto salvo! Redirecionando...");
    navigate(path);
  };

  const handleNavigateToSkills = () => saveContextAndNavigate('/my-skills');
  const handleNavigateToTalentMining = () => saveContextAndNavigate('/talent-mining');
  const handleNavigateToBatchProcessing = () => saveContextAndNavigate('/batch-processing');

  return (
    <div className="min-h-screen bg-grayscale-10 p-xmedium">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-h1 text-foreground mb-xmedium">
          Emulador de Plataforma Senior
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xmedium">
          {/* Login Panel */}
          <Card className="p-xmedium lg:col-span-1">
            <h2 className="text-h3-caps text-foreground mb-default">
              Autenticação Senior
            </h2>
            
            <div className="space-y-default">
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Ambiente
                </label>
                <Select value={selectedEnv} onValueChange={(v) => setSelectedEnv(v as keyof typeof environments)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leaf">Leaf</SelectItem>
                    <SelectItem value="homologx">Homologx</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-small text-muted-foreground">
                  {servicesUrl}
                </span>
              </div>
              
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Usuário
                </label>
                <Input 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="usuario@dominio"
                />
              </div>
              
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Senha
                </label>
                <Input 
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Autenticando...' : 'Autenticar'}
              </Button>
            </div>
          </Card>

          {/* Configuration Panel */}
          <Card className="p-xmedium lg:col-span-2">
            <h2 className="text-h3-caps text-foreground mb-default">
              Configuração do Contexto
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-default">
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Username
                </label>
                <Input 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario@tenant.com"
                />
                <span className="text-small text-muted-foreground">
                  Formato: username@dominio
                </span>
              </div>
              
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Nome Completo
                </label>
                <Input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome Sobrenome"
                />
              </div>
              
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  E-mail
                </label>
                <Input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
              
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Tenant Name
                </label>
                <Input 
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="nome-do-tenant"
                />
                <span className="text-small text-muted-foreground">
                  Schema do banco: {tenantName}_talent_mining
                </span>
              </div>
              
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Access Token
                </label>
                <Input 
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="eyJhbGciOiJSUzI1NiIs..."
                />
                <span className="text-small text-muted-foreground">
                  Token JWT para autenticação
                </span>
              </div>
              
              <div>
                <label className="text-label-bold text-foreground block mb-xsmall">
                  Services URL
                </label>
                <Input 
                  value={servicesUrl}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="md:col-span-2 pt-default border-t border-border space-y-sml">
                <p className="text-label text-muted-foreground mb-sml">Navegação</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-sml">
                  <Button 
                    onClick={handleNavigateToSkills}
                    variant="default"
                    className="w-full gap-sml"
                  >
                    <User className="h-4 w-4" />
                    Minhas Habilidades
                  </Button>
                  <Button 
                    onClick={handleNavigateToTalentMining}
                    variant="outline"
                    className="w-full gap-sml"
                  >
                    <Search className="h-4 w-4" />
                    Talent Mining
                  </Button>
                  <Button 
                    onClick={handleNavigateToBatchProcessing}
                    variant="outline"
                    className="w-full gap-sml"
                  >
                    <Database className="h-4 w-4" />
                    Processamento em Lote
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
