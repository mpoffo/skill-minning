

# Plano: Atualizar Token do HCM-Mining

## Resumo
Atualizar o API_TOKEN da edge function `hcm-mining` de `khYzKIbhrXHOsRlkc0tPRWMQp7sxD8ZW` para `zFIYWJK9zNCzAqfEhARNUUKLgGA6QBFz`.

## Alteração

### Arquivo: `supabase/functions/hcm-mining/index.ts`

**Linha 10 - Antes:**
```typescript
const API_TOKEN = "khYzKIbhrXHOsRlkc0tPRWMQp7sxD8ZW";
```

**Linha 10 - Depois:**
```typescript
const API_TOKEN = "zFIYWJK9zNCzAqfEhARNUUKLgGA6QBFz";
```

## Impacto

- Apenas a funcionalidade "Buscar Habilidades" na tela "Minhas Habilidades" sera afetada
- A funcionalidade "Busca com IA" no Talent Mining permanece inalterada (usa outro agent com outro token)

## Passos de Execucao

1. Editar o arquivo `supabase/functions/hcm-mining/index.ts` na linha 10
2. Fazer deploy da edge function `hcm-mining`
3. Testar o botao "Buscar Habilidades" na tela Minhas Habilidades

