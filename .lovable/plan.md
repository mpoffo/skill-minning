# PRD — Sugestão de Habilidades por Categoria

## 1. Visão Geral

Hoje as sugestões de habilidades em **Minhas Habilidades** vivem em um arquivo estático (`src/data/skillSuggestions.ts`) com 4 categorias fixas. Este PRD propõe transformar isso em um recurso gerenciável pela empresa (admin) e consumido pelo colaborador no fluxo de cadastro das suas habilidades.

O escopo cobre **duas partes**:
1. **Administração** — cadastro/edição de categorias e suas habilidades sugeridas.
2. **Consumo** — uso dessas categorias no painel lateral de "Ver sugestões" da tela `/my-skills`.

---

## 2. Objetivos

- Permitir que cada empresa (tenant) defina seu próprio catálogo de categorias e habilidades de referência.
- Acelerar o cadastro de habilidades do colaborador, oferecendo um caminho guiado por categoria.
- Manter a experiência atual de adicionar habilidade com estrelas em um clique.
- Garantir isolamento por tenant (multitenancy).

## 3. Não-Objetivos

- Não substitui a busca semântica por IA (continua disponível na outra aba).
- Não cria fluxo de aprovação/governança das categorias (qualquer admin do tenant pode editar).
- Não versiona histórico de alterações do catálogo.
- Não inclui internacionalização do catálogo (texto livre no idioma cadastrado).

---

## Parte 1 — Administração de Categorias e Habilidades

### 3.1 Persona
**Admin do tenant** (ex.: RH/People Analytics) — responsável por curar o catálogo de referência da empresa.

### 3.2 User Stories
- Como admin, quero **criar uma categoria** (ex.: "Dados e Analytics") para agrupar habilidades relacionadas.
- Como admin, quero **adicionar/remover habilidades** dentro de uma categoria.
- Como admin, quero **renomear** categorias e habilidades.
- Como admin, quero **reordenar** categorias (definir a ordem de exibição para o colaborador).
- Como admin, quero **desativar** uma categoria sem excluí-la (para esconder temporariamente).
- Como admin, quero ver quantos colaboradores já têm cada habilidade sugerida cadastrada.

### 3.3 Requisitos Funcionais
1. Nova rota `/admin/skill-catalog` (acesso restrito à permissão de admin do tenant).
2. Lista de categorias com: nome, nº de habilidades, status (ativa/inativa), ordem, ações (editar/excluir).
3. Detalhe da categoria: edição inline do nome + lista das habilidades (chips removíveis + campo "adicionar habilidade").
4. Botão "Nova categoria".
5. Drag-and-drop opcional para reordenar (alternativa: setas ↑↓).
6. Validações:
   - Nome de categoria único por tenant (case-insensitive).
   - Nome de habilidade único dentro da categoria.
   - Mínimo 1 habilidade por categoria ativa.
7. Excluir categoria pede confirmação e não remove habilidades já cadastradas pelos colaboradores.

### 3.4 Requisitos Não-Funcionais
- Todas as operações escopadas por `tenant`.
- Mudanças refletem imediatamente para os colaboradores (sem cache longo).

---

## Parte 2 — Uso no Cadastro de Minhas Habilidades

### 4.1 Persona
**Colaborador** — quer cadastrar suas habilidades de forma rápida e guiada.

### 4.2 User Stories
- Como colaborador, ao abrir o painel "Adicionar Habilidade", quero ver a aba **"Ver sugestões"** com as categorias da minha empresa.
- Como colaborador, quero **filtrar por categoria** clicando nos pills do header.
- Como colaborador, quero **adicionar uma habilidade sugerida com nota de proficiência** em um único clique nas estrelas.
- Como colaborador, quero ver quais sugestões eu **já possuo** (com a proficiência atual).
- Como colaborador, quero que sugestões que eu já adicionei continuem visíveis (marcadas) para eu poder ajustar a proficiência.

### 4.3 Requisitos Funcionais
1. Aba "Ver sugestões" do `SkillSearchSidebar` passa a carregar categorias do backend (em vez do array estático).
2. Header da aba mostra os pills de categoria na ordem definida pelo admin; categorias inativas não aparecem.
3. Estado vazio: se o tenant não tem catálogo, mostrar mensagem orientando a usar a busca/IA e (se for admin) um link para `/admin/skill-catalog`.
4. Clicar em estrela em uma sugestão chama `addSkill(name, proficiency)` (comportamento atual).
5. Sugestões já possuídas exibem a proficiência atual e permitem ajuste (chama `updateProficiency`).
6. Loading: skeleton enquanto carrega categorias.

### 4.4 Comportamento de Borda
- Habilidade sugerida com nome igual (case-insensitive) a uma já cadastrada deve ser tratada como "já possuo".
- Se admin remove uma categoria/habilidade depois que o colaborador já cadastrou, a habilidade do colaborador permanece intacta.

---

## 5. Detalhes Técnicos

### 5.1 Modelo de Dados (novo)

```text
skill_categories
  id uuid pk
  tenant text not null
  name text not null
  display_order int not null default 0
  is_active boolean not null default true
  created_at, updated_at
  unique (tenant, lower(name))

skill_category_items
  id uuid pk
  category_id uuid fk -> skill_categories(id) on delete cascade
  name text not null
  display_order int not null default 0
  unique (category_id, lower(name))
```

RLS por `tenant` + GRANTs para `authenticated` e `service_role` (conforme padrão do projeto).

### 5.2 Camada de Aplicação
- Hook `useSkillCatalog(tenant)` — lê categorias + itens ativos.
- Hook `useSkillCatalogAdmin(tenant)` — CRUD usado pela tela de admin.
- Remover dependência de `src/data/skillSuggestions.ts` (manter só como **seed** opcional na primeira execução do tenant).

### 5.3 UI
- **Admin:** nova página `src/pages/SkillCatalogAdmin.tsx` reutilizando componentes shadcn (Card, Input, Button, Badge, AlertDialog).
- **Consumo:** ajustes em `src/components/SkillSearchSidebar.tsx` para trocar o array estático pelo hook.
- Sem mudanças na busca por texto/IA nem na aba "Buscar / Importar".

### 5.4 Permissões
- `/admin/skill-catalog` exige permissão de admin do tenant (a definir com a equipe — sugestão: nova permissão `res://.../skillCatalog` com `Editar`).
- `/my-skills` continua sem mudança de autorização.

### 5.5 Seed Inicial
- Na primeira vez que um tenant abre a aba de sugestões sem catálogo, oferecer botão "Carregar sugestões padrão" que importa as 4 categorias atuais de `skillSuggestions.ts`.

---

## 6. Métricas de Sucesso
- % de habilidades cadastradas via "Ver sugestões" vs busca/IA/importação.
- Tempo médio para cadastrar as 5 primeiras habilidades.
- Nº de categorias/habilidades criadas por tenant.

## 7. Fora de Escopo (futuro)
- Sugestão de categorias baseadas no cargo do colaborador.
- Importação em massa do catálogo (CSV).
- Catálogo global compartilhado entre tenants.
- Sinônimos/aliases por habilidade (já existe estrutura paralela em `skillAliases.ts`).
