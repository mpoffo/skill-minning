# PRD — Extração de Habilidades por Arquivo (LinkedIn PDF)

**Versão:** 1.0
**Status:** Em produção (baseline) — este PRD documenta o comportamento vigente e define evoluções.
**Rota afetada:** `/my-skills` (painel "Adicionar habilidade").
**Componentes-chave:** `LinkedInImport.tsx`, `AddSkillPanel.tsx`, Edge Function `parse-linkedin-pdf`.

---

## 1. Objetivo

Permitir que o colaborador **importe rapidamente suas habilidades a partir do PDF do próprio perfil do LinkedIn**, reduzindo o atrito do cadastro manual e aumentando a completude do perfil de skills no sistema.

O fluxo deve:

- Aceitar o PDF exportado diretamente pelo LinkedIn.
- Extrair **apenas habilidades reais** (não cargos, empresas, resultados ou públicos-alvo).
- Classificar cada habilidade por **origem** (de onde no documento ela foi extraída).
- Não cadastrar automaticamente — o usuário confirma quais habilidades quer adicionar e com qual proficiência.

---

## 2. Personas & Cenários

- **Colaborador novo no sistema** — não tem nenhuma skill cadastrada; quer popular seu perfil em minutos.
- **Colaborador atualizando perfil** — já tem skills e quer complementar sem duplicar.
- **Colaborador em contexto de demo/manual** — sem contexto da plataforma; o import deve funcionar mesmo assim.

---

## 3. Fluxo do Usuário

```text
1. Usuário acessa /my-skills
2. Expande o painel "Adicionar habilidade" (se recolhido)
3. Vê o input de busca (primária) e o botão "Importar LinkedIn" (paralela)
4. Passa o mouse no botão → tooltip explica como obter o PDF no LinkedIn
5. Clica em "Importar LinkedIn" → abre file picker (aceita .pdf)
6. Seleciona o PDF → botão vira "Analisando com IA…" (loader)
7. Backend processa; frontend recebe lista de skills extraídas
8. Skills novas aparecem como chips/cards para revisão
9. Usuário confirma cada skill com estrelas de proficiência (0-5)
10. Skill é gravada em user_skills com origem = origem detectada no PDF
```

### Regras de UX

- Botão desabilitado durante processamento.
- Toast de sucesso com contagem de novas habilidades.
- Toast informativo se **todas** já estavam cadastradas.
- Toast de erro claro para: formato inválido, falha da IA, PDF sem habilidades.
- Não bloqueia a UI — usuário pode continuar buscando/adicionando manualmente.

---

## 4. Regras Funcionais de Extração

### 4.1 O que **deve** ser extraído

Habilidades classificadas em uma das seguintes **origens**:

| Origin              | Fonte no PDF                                            |
|---------------------|----------------------------------------------------------|
| `competencias`      | Seção "Competências" / "Skills" / "Principais competências" |
| `tecnologias`       | Tecnologias e ferramentas usadas                        |
| `metodologias`      | Metodologias aplicadas (Scrum, Kanban, DDD, etc.)       |
| `certificacoes`     | Certificações obtidas                                   |
| `idiomas`           | Idiomas                                                 |
| `experiencia`       | Habilidades citadas em experiências profissionais       |

### 4.2 O que **não pode** ser extraído

- Cargos e títulos ("gerente", "coordenador")
- Empresas, produtos ou projetos
- Públicos-alvo/destinatários ("C-level", "stakeholders")
- Resultados/entregas ("aumento de vendas", "redução de custos")
- Verbos genéricos ("desenvolvimento", "planejamento", "execução")
- Habilidades **inventadas** que não estão no documento

### 4.3 Normalização

- Nomes reduzidos à forma canônica (ex.: "Python programming" → "Python").
- Deduplicação case-insensitive dentro do documento.
- Skills que o usuário **já possui** são filtradas antes de exibir (comparação case-insensitive por nome exato — evolução em §7).

---

## 5. Requisitos Técnicos

### 5.1 Frontend (`LinkedInImport.tsx`, `AddSkillPanel.tsx`)

- `<input type="file" accept=".pdf">` oculto disparado por botão.
- Validação MIME `application/pdf` antes de enviar.
- Envio via `supabase.functions.invoke('parse-linkedin-pdf', { body: FormData })`.
- Recebe `{ skills: [{ name, origin }] }`.
- Filtra por `existingSkillNames` e passa via callback `onSkillsExtracted`.
- Estado local: `isProcessing`, `extractedSkills`.
- Limpar input após conclusão para permitir reenvio do mesmo arquivo.

### 5.2 Backend (Edge Function `parse-linkedin-pdf`)

- `verify_jwt = false` (já configurado).
- CORS liberado (POST + OPTIONS).
- Recebe `multipart/form-data` com campo `file`.
- Converte PDF para base64 e envia ao **Lovable AI Gateway** (`google/gemini-2.5-flash`) usando o tipo `file` (PDF nativo — não OCR).
- Prompt determinístico com as regras de §4 (extração + classificação de origem).
- Espera resposta JSON `{"skills":[{"name":"…","origin":"…"}, …]}`.
- Parsing tolerante: regex extrai o bloco JSON mesmo se vier com markdown/texto ao redor.
- Compatibilidade retroativa: se `skills` vier como array de strings, converte para objetos `{ name, origin: 'linkedin' }`.

### 5.3 Limites e Erros

| Situação                             | Resposta HTTP | Comportamento no cliente                          |
|--------------------------------------|---------------|----------------------------------------------------|
| Arquivo ausente                      | 400           | Toast "Arquivo PDF não fornecido"                  |
| `LOVABLE_API_KEY` ausente            | 500           | Toast "Erro interno" + log                         |
| Falha do AI Gateway                  | 500           | Toast "Erro ao processar PDF com IA"               |
| JSON inválido do modelo              | 200 + `[]`    | Toast "Nenhuma habilidade encontrada"              |
| Todas skills já cadastradas          | 200           | Toast informativo, nada é adicionado               |

**Limites operacionais** (herdados do gateway):
- PDF até ~20 MB (limite prático do FormData).
- Modelo tem janela de contexto suficiente para PDFs de até ~50 páginas.

---

## 6. Segurança & Privacidade

- PDF é enviado **apenas** ao Lovable AI Gateway; não é persistido em storage.
- Nenhum dado do PDF fica em logs além do nome/tamanho.
- Skills extraídas ficam associadas ao `user_id` selecionado (contexto real ou manual em `/my-skills`).
- Nenhuma informação de contato/telefone/email do perfil é extraída ou usada.

---

## 7. Evoluções Propostas (Roadmap)

### 7.1 Deduplicação semântica (Prioridade Alta)
Hoje o filtro `existingSkillNames` é por nome exato. Evoluir para:
- Comparar cada skill extraída contra embeddings existentes do usuário.
- Marcar como "similar a X" no card de revisão (usar a mesma pipeline já discutida em `AddSkillModal`).

### 7.2 Origem visível na UI
- Exibir badge de origem (`competencias`, `experiencia`, etc.) em cada chip antes da confirmação.
- Permitir filtrar/agrupar por origem no painel de revisão.

### 7.3 Confirmação em lote com proficiência sugerida
- Ao invés de chips soltos, apresentar grid similar ao `SkillGridCard` com estrelas prontas.
- Sugestão de proficiência inicial baseada na origem (ex.: `certificacoes` → 4 estrelas; `competencias` → 3; demais → 0).

### 7.4 Suporte a outros formatos
- Currículo em PDF genérico (não-LinkedIn) — mesmo prompt tolera, mas requer aviso claro de qualidade menor.
- `.docx` via conversão prévia (fora do escopo desta v1).

### 7.5 Retry & observabilidade
- Retry automático (1x) em falhas 5xx do gateway.
- Log estruturado com `tenant`, `user_id`, `skills_extracted`, `skills_new`, `duration_ms`.

### 7.6 Preview antes de gravar
- Mostrar preview do texto extraído do PDF (primeiras N linhas por seção) para o usuário conferir que o arquivo certo foi enviado.

---

## 8. Métricas de Sucesso

- **Adoção:** % de usuários novos que usam o import LinkedIn no primeiro cadastro.
- **Rendimento:** média de skills extraídas por PDF.
- **Precisão percebida:** % de skills extraídas que o usuário confirma (vs. descarta).
- **Tempo médio de cadastro:** comparação de "cadastro manual" vs. "import + revisão".
- **Taxa de erro:** % de imports que terminam em toast de erro.

---

## 9. Fora de Escopo

- Sincronização contínua com a API oficial do LinkedIn (requer OAuth + parceria).
- Extração de experiência profissional/histórico para outros módulos.
- Inferência de nível de proficiência a partir do tempo de experiência.
- Multi-idioma no prompt (hoje pt-BR; PDFs em EN ainda funcionam mas o prompt é PT).

---

## 10. Critérios de Aceite (v1 vigente)

- [x] Botão de import visível no painel "Adicionar habilidade".
- [x] Tooltip explica como exportar o PDF do LinkedIn.
- [x] Aceita apenas `.pdf`; formatos inválidos são rejeitados com toast.
- [x] Retorna lista de skills com `name` + `origin`.
- [x] Filtra skills já cadastradas antes de exibir.
- [x] Nenhuma skill é gravada sem confirmação explícita do usuário.
- [x] Não extrai cargos, empresas, resultados ou públicos-alvo.
