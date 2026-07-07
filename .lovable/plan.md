## Objetivo

Melhorar a UX de "Adicionar habilidade" em `/my-skills`, deixando claro que existem 2 formas primárias (digitar/buscar e importar do LinkedIn) + 1 secundária (sugestões por categoria), além de remover HCM-Mining e permitir recolher o painel.

## Decisão de layout

Trocar o sidebar direito por um **painel superior recolhível (colapsável)**, integrado logo abaixo do `PageHeader` na página `MySkills`. Motivos:

- O input de busca é a ação principal — no topo fica imediatamente visível ao entrar na tela.
- Deixa a grid de skills ocupar toda a largura quando o painel está recolhido.
- O botão "Adicionar Habilidade" no header passa a alternar (expandir/recolher) o painel, com um chevron indicando estado.

## Estrutura do painel (quando expandido)

```text
┌─────────────────────────────────────────────────────────────┐
│  Adicionar habilidade                              [ ▲ ]    │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐   ┌───────────┐  │
│  │ 🔍 Digite uma habilidade...           │   │ in Importar│  │
│  │    (busca semântica com IA)           │ ou│  LinkedIn │  │
│  └───────────────────────────────────────┘   └─────(?)───┘  │
│                                                              │
│  ── ou explore por categoria ────────────────────────────── │
│  [Ver sugestões por categoria ▾]                            │
└─────────────────────────────────────────────────────────────┘
```

- **Input principal**: ocupa a maior parte da largura, com placeholder claro ("Digite uma habilidade para buscar…") e resultados aparecendo em uma grade logo abaixo.
- **Separador visual "ou"** entre o input e o botão do LinkedIn deixa explícito que são caminhos alternativos.
- **Botão "Importar do LinkedIn"**: botão secundário ao lado do input, com ícone. Um `Tooltip` (ícone `?` ou hover no próprio botão) mostra as 3 instruções de como obter o PDF (hoje esse texto ocupa espaço fixo — vira tooltip).
- **Sugestões por categoria**: abaixo, como bloco secundário colapsável (fechado por padrão), substituindo a tab atual "Ver sugestões".

## Comportamento de recolher

- Header do painel tem título + botão chevron para colapsar/expandir.
- Estado inicial: **expandido** quando o usuário não tem nenhuma skill (para orientar); **recolhido** quando já existem skills cadastradas.
- Botão "Adicionar habilidade" do `PageHeader` alterna o estado (e faz scroll até o painel se necessário).
- Preferência de estado persistida em `localStorage` para não incomodar entre sessões.

## Escopo de mudanças

1. **Remover HCM-Mining do fluxo de adição**
   - Remover o bloco `<HCMImport>` de `SkillSearchSidebar.tsx`.
   - `src/components/HCMImport.tsx` e a Edge Function `hcm-mining` **não** serão apagados nesta iteração (podem ser usados em outros contextos como Batch); apenas deixam de ser referenciados aqui.

2. **Criar `src/components/AddSkillPanel.tsx`** (novo)
   - Componente colapsável que renderiza: input de busca com resultados, botão "Importar LinkedIn" com tooltip de instruções, e um accordion "Sugestões por categoria".
   - Reaproveita a lógica de `SkillSearchSidebar` (semantic-skills, `SkillSuggestionCard`, `CategorySuggestions`, confirmação de similar).
   - Props: `existingSkills`, `onAddSkill`, `isExpanded`, `onToggle`.

3. **Refatorar `LinkedInImport.tsx`**
   - Nova variante compacta: apenas o botão + `Tooltip` (shadcn) contendo as 3 instruções e o input file oculto. A variante atual (bloco com título e instruções visíveis) pode ser mantida como fallback ou removida se não usada em outro lugar. Verificar usos antes de decidir.

4. **Atualizar `src/pages/MySkills.tsx`**
   - Remover o `SkillSearchSidebar` e o layout `flex` lado-a-lado.
   - Adicionar `<AddSkillPanel>` entre o `PageHeader` e o bloco de filtros.
   - Estado `isAddPanelOpen` (com persistência em localStorage e default baseado em `userSkills.length === 0`).
   - Botão "Adicionar Habilidade" do header passa a chamar `setIsAddPanelOpen(v => !v)` com label dinâmico ("Adicionar habilidade" / "Recolher").

5. **Descontinuar `SkillSearchSidebar.tsx`**
   - Se nenhuma outra rota usa (checar), remover o arquivo. Caso contrário, deixar como está e apenas parar de usar em `MySkills`.

## Detalhes técnicos

- Usar `Collapsible` do shadcn (`@/components/ui/collapsible`) para o painel principal e para o bloco "Sugestões por categoria".
- Usar `Tooltip` do shadcn para as instruções do LinkedIn; conteúdo em lista `<ol>` curta.
- Manter todos os tokens semânticos existentes (`bg-card`, `border-border`, `text-foreground`, `shadow-dp02`, `rounded-big`, spacings `default/sml/xmedium`).
- Nenhuma mudança de backend / RLS / edge functions.
- Nenhuma alteração no hook `useSkills` nem no fluxo de similaridade (dialog continua igual).

## Fora de escopo

- Não altera a página `/admin/skill-catalog` nem o schema proposto para `skill_categories`.
- Não altera `TalentMining`, `BatchProcessing` ou `UserSkillsView`.
- Não remove a Edge Function `hcm-mining` nem o componente `HCMImport` do repositório.
