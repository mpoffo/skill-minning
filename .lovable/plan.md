# Plano: Gaps importantes no Talent Mining

Adicionar a distinção "Gaps importantes" antes de "Gaps" nos cards de resultado do Talent Mining, onde uma habilidade pedida com 5 estrelas e não encontrada no colaborador é considerada importante.

## Alterações

### 1. Modo tradicional — `RankedUserCard.tsx` + `TalentMining.tsx`

- Passar a lista completa de habilidades requeridas (`name` + `proficiency`) para `RankedUserCard`, não apenas os nomes.
- Calcular:
  - `importantGaps`: habilidades requeridas com `proficiency === 5` que não constam em `matchedSkills`.
  - `gaps`: demais habilidades requeridas que não constam em `matchedSkills`.
- Adicionar badge empilhado à direita (antes do badge laranja de gaps) com contador de **Gaps importantes**.
- Ajustar a seção expandida para listar primeiro os gaps importantes, depois os demais gaps.

### 2. Modo IA — `AIRankedCandidateCard.tsx` + `AISearchResults.tsx` + `TalentMining.tsx`

- Considerar as habilidades `must_have` retornadas pela IA como equivalentes a requisitos de 5 estrelas.
- Passar `must_have` de `TalentMining.tsx` → `AISearchResults.tsx` → `AIRankedCandidateCard.tsx`.
- Calcular:
  - `importantGaps`: gaps do candidato que aparecem em `must_have`.
  - `gaps`: demais gaps retornados pela IA.
- Adicionar badge **Gaps importantes** antes do badge de gaps.
- Ajustar a seção expandida de "Gaps Identificados" para separar/visualizar gaps importantes primeiro.

## Notas técnicas

- No modo tradicional, a proficiência esperada já está disponível no estado `requiredSkills`.
- No modo IA, a proficiência não é retornada; usamos `must_have` como proxy de requisito crítico (5 estrelas).
- Ajustes de tipos TypeScript nas props dos três componentes.
