# Integração com a Plataforma Senior via PostMessage

## Visão Geral

Quando uma aplicação é embarcada dentro da **Plataforma Senior** (via iframe), ela recebe automaticamente o contexto de autenticação do usuário logado através do mecanismo de `postMessage` do navegador. Isso elimina a necessidade de login separado — a aplicação herda a sessão ativa da plataforma.

---

## Como Funciona

### Fluxo de Comunicação

```
┌──────────────────────────────────┐
│     Plataforma Senior (parent)   │
│                                  │
│  1. Usuário já está autenticado  │
│  2. Plataforma carrega o iframe  │
│  3. Recebe "READY" do iframe     │
│  4. Envia token via postMessage  │
│                                  │
│  ┌────────────────────────────┐  │
│  │   Aplicação (iframe)       │  │
│  │                            │  │
│  │  1. Detecta que está em    │  │
│  │     iframe                 │  │
│  │  2. Envia msg "READY"     │  │
│  │  3. Recebe token           │  │
│  │  4. Usa token nas APIs     │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Passo a Passo

1. **Detecção de iframe**: A aplicação verifica se está rodando dentro de um iframe comparando `window.parent !== window`.

2. **Sinalização de prontidão**: A aplicação envia uma mensagem ao parent informando que está pronta para receber o contexto:
   ```javascript
   window.parent.postMessage({ type: 'TALENT_MINING_READY' }, '*');
   ```

3. **Recebimento do token**: A plataforma responde com um objeto contendo o token e a URL de serviços:
   ```javascript
   window.addEventListener('message', (event) => {
     const data = event.data;
     // data.token - objeto com dados de autenticação
     // data.servicesUrl - URL base dos serviços
   });
   ```

---

## Estrutura do Payload Recebido

A mensagem enviada pela plataforma tem o seguinte formato:

```json
{
  "token": {
    "scope": "browser+device_web",
    "expires_in": 21600,
    "username": "usuario@tenant.com.br",
    "token_type": "bearer",
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "abc123...",
    "email": "usuario@empresa.com.br",
    "fullName": "Nome Completo do Usuário",
    "tenantName": "nome-do-tenant"
  },
  "servicesUrl": "https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/"
}
```

### Campos do Token

| Campo            | Descrição                                      |
|------------------|-------------------------------------------------|
| `access_token`   | Token JWT para autenticação nas APIs            |
| `refresh_token`  | Token para renovação da sessão                  |
| `username`       | Identificador do usuário (formato `user@domain`) |
| `fullName`       | Nome completo do usuário                        |
| `email`          | E-mail do usuário                               |
| `tenantName`     | Nome do tenant (usado para isolamento de dados) |
| `token_type`     | Sempre `"bearer"`                               |
| `expires_in`     | Tempo de expiração em segundos (padrão: 21600 = 6h) |

---

## Como Usar o Token

### Fazendo Requisições Autenticadas

Use o `access_token` recebido como **Bearer Token** no header `Authorization`:

```http
POST {servicesUrl}platform/user/queries/getUser
Authorization: Bearer {access_token}
Content-Type: application/json

{}
```

### Exemplo em JavaScript

```javascript
const response = await fetch(`${servicesUrl}algum/endpoint`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ /* payload */ }),
});
```

---

## Implementação Recomendada

### 1. Criar um Context Provider

Centralize o gerenciamento do token em um Context do React:

```tsx
function PlatformProvider({ children }) {
  const [token, setToken] = useState(null);
  const [servicesUrl, setServicesUrl] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const isInIframe = window.parent !== window;

    if (isInIframe) {
      const handleMessage = (event) => {
        const data = event.data;
        if (data.token && data.servicesUrl) {
          setToken(data.token);
          setServicesUrl(data.servicesUrl);
          setIsLoaded(true);

          // Cache para reloads dentro do iframe
          sessionStorage.setItem('platformContext', JSON.stringify(data));
        }
      };

      window.addEventListener('message', handleMessage);
      window.parent.postMessage({ type: 'APP_READY' }, '*');

      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  return (
    <PlatformContext.Provider value={{ token, servicesUrl, isLoaded }}>
      {children}
    </PlatformContext.Provider>
  );
}
```

### 2. Fallback com sessionStorage

Para lidar com reloads dentro do iframe (onde o postMessage não será reenviado), use `sessionStorage` como fallback:

```javascript
// Após receber o postMessage, salvar:
sessionStorage.setItem('platformContext', JSON.stringify(data));

// No carregamento, se não receber postMessage em 2s, usar cache:
setTimeout(() => {
  if (!isLoaded) {
    const cached = sessionStorage.getItem('platformContext');
    if (cached) {
      const data = JSON.parse(cached);
      setToken(data.token);
      setServicesUrl(data.servicesUrl);
      setIsLoaded(true);
    }
  }
}, 2000);
```

### 3. Extrair Informações do Usuário

```javascript
// Username sem domínio
const userName = token.username.split('@')[0];

// Tenant para isolamento de dados
const tenantName = token.tenantName;

// Schema do banco de dados
const dbSchema = `${tenantName}_talent_mining`;
```

---

## Ambientes Disponíveis

A `servicesUrl` recebida via postMessage varia conforme o ambiente:

| Ambiente    | URL Base                                                                      |
|-------------|-------------------------------------------------------------------------------|
| Produção    | `https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/`            |
| Leaf        | `https://cloud-leaf.senior.com.br/t/senior.com.br/bridge/1.0/rest/`          |
| Homologx    | `https://platform-homologx.senior.com.br/t/senior.com.br/bridge/1.0/rest/`   |

---

## Boas Práticas

1. **Nunca armazene tokens em localStorage** — use apenas `sessionStorage` para persistência temporária dentro da sessão do iframe.

2. **Valide a origem do postMessage** — em produção, verifique `event.origin` para aceitar mensagens apenas de domínios confiáveis da Senior.

3. **Trate expiração do token** — o `access_token` expira em 6 horas. Implemente lógica de refresh usando o `refresh_token` quando necessário.

4. **Isolamento por tenant** — sempre use o `tenantName` para segregar dados entre diferentes clientes/tenants.

5. **Modo standalone** — para desenvolvimento e testes fora do iframe, implemente um emulador que permita inserir manualmente os dados de contexto e salvar no `sessionStorage`.
