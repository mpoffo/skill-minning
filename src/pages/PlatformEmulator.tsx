import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

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

const defaultServicesUrl = "https://cloud-leaf.senior.com.br/t/senior.com.br/bridge/1.0/rest/";

export default function PlatformEmulator() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Form state
  const [username, setUsername] = useState(defaultToken.username);
  const [fullName, setFullName] = useState(defaultToken.fullName);
  const [email, setEmail] = useState(defaultToken.email);
  const [tenantName, setTenantName] = useState(defaultToken.tenantName);
  const [accessToken, setAccessToken] = useState(defaultToken.access_token);
  const [servicesUrl, setServicesUrl] = useState(defaultServicesUrl);

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      toast.error("Preencha usuário e senha");
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // Call login API
      const loginResponse = await fetch(`${servicesUrl}platform/authentication/actions/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error('Falha na autenticação');
      }

      const loginData = await loginResponse.json();
      const tokenData = JSON.parse(loginData.jsonToken);
      const token = tokenData.access_token;

      // Call getUser API with the token
      const userResponse = await fetch(`${servicesUrl}platform/user/queries/getUser`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Falha ao obter dados do usuário');
      }

      const userData = await userResponse.json();

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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TALENT_MINING_READY') {
        console.log('Talent Mining app is ready');
        setIsReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendContextMessage = () => {
    if (!iframeRef.current?.contentWindow) {
      console.error('Iframe not ready');
      return;
    }

    const message = {
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

    console.log('Sending platform context:', message);
    iframeRef.current.contentWindow.postMessage(message, '*');
    setMessageSent(true);
  };

  // Get the current origin for the iframe
  const appUrl = `${window.location.origin}/my-skills`;

  return (
    <div className="min-h-screen bg-grayscale-10 p-xmedium">
      <div className="max-w-7xl mx-auto">
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
                  onChange={(e) => setServicesUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              
              <div className="md:col-span-2 pt-default border-t border-border">
                <Button 
                  onClick={sendContextMessage}
                  className="w-full"
                  disabled={!isReady}
                >
                  {messageSent ? 'Reenviar Contexto' : 'Enviar Contexto (postMessage)'}
                </Button>
                
                <div className="mt-sml text-small text-muted-foreground text-center">
                  {!isReady && 'Aguardando aplicação ficar pronta...'}
                  {isReady && !messageSent && 'Aplicação pronta! Clique para enviar contexto.'}
                  {isReady && messageSent && (
                    <span className="text-feedback-success">✓ Contexto enviado com sucesso</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
          
        {/* Iframe Container */}
        <div className="mt-xmedium">
          <Card className="p-0 overflow-hidden">
            <div className="bg-grayscale-80 px-default py-sml flex items-center gap-xsmall">
              <div className="w-3 h-3 rounded-full bg-feedback-error" />
              <div className="w-3 h-3 rounded-full bg-feedback-attention" />
              <div className="w-3 h-3 rounded-full bg-feedback-success" />
              <span className="ml-sml text-small text-grayscale-20 flex-1 text-center">
                {appUrl}
              </span>
            </div>
            
            <iframe
              ref={iframeRef}
              src={appUrl}
              className="w-full h-[700px] border-0"
              title="Talent Mining Application"
            />
          </Card>
        </div>
          
        
        {/* Debug Info */}
        <Card className="mt-xmedium p-default">
          <h3 className="text-h3-bold text-foreground mb-sml">Estrutura da Mensagem postMessage</h3>
          <pre className="bg-grayscale-90 text-grayscale-20 p-default rounded-medium text-small overflow-x-auto">
{JSON.stringify({
  token: {
    scope: "browser+device_...",
    expires_in: 21600,
    username: username,
    token_type: "bearer",
    access_token: "...",
    refresh_token: "...",
    email: email,
    fullName: fullName,
    tenantName: tenantName,
  },
  servicesUrl: servicesUrl,
}, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}
