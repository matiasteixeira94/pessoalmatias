# Estrutura de dados — Gestão Financeira Matias

Este documento descreve o schema usado pelo app na Fase 1 (persistência em
`localStorage`). Toda leitura e escrita passa por `assets/js/db.js` — nenhuma
página acessa `localStorage` diretamente.

## Chaves no localStorage

Todas as chaves usam o prefixo `gfm:`:

| Chave                  | Conteúdo                                  |
|-------------------------|--------------------------------------------|
| `gfm:lancamentos`       | Array de `Lancamento`                       |
| `gfm:categorias`        | Array de `Categoria`                        |
| `gfm:orcamentos`        | Array de `Orcamento`                        |
| `gfm:formasPagamento`   | Array de strings (ex.: `"Pix"`, `"Débito"`) |
| `gfm:config`            | Objeto de configuração geral do app         |

## Lancamento

```txt
id              string   uuid, gerado em modelos.js
data            string   ISO, formato AAAA-MM-DD
competencia     string   AAAA-MM, sempre derivada de `data` (nunca digitada)
tipo            string   "receita" | "despesa"
categoria       string   nome da categoria (referência por nome, não por id)
subcategoria    string   opcional
descricao       string   obrigatória
formaPagamento  string   opcional (ver gfm:formasPagamento)
valor           number   sempre positivo — o sinal vem do campo `tipo`
status          string   "pago" | "pendente" | "agendado"
recorrente      boolean  indica lançamento fixo/recorrente
observacoes     string   opcional
criadoEm        string   ISO 8601 (timestamp completo)
atualizadoEm    string   ISO 8601 (timestamp completo)
```

Regras de validação (`assets/js/modelos.js` → `validarLancamento`):
- `data` obrigatória e dentro de um intervalo razoável (ano 2000 até ano atual + 5)
- `tipo` deve ser `"receita"` ou `"despesa"`
- `categoria` obrigatória
- `descricao` obrigatória (não pode ser só espaços)
- `valor` deve ser um número maior que zero
- `status` deve ser um dos valores válidos

## Categoria

```txt
id      string   uuid
nome    string   obrigatório, único por nome (comparação case-insensitive)
tipo    string   "receita" | "despesa"
cor     string   hex, ex.: "#16596a"
icone   string   emoji usado como ícone
ativa   boolean  categorias inativas não aparecem para novos lançamentos
```

Lançamentos referenciam a categoria pelo **nome**, não pelo `id`. Isso mantém
o histórico legível mesmo que a categoria seja renomeada ou removida (a regra
de impedir exclusão de categoria em uso é implementada na Fase 3, em
`categorias.html`).

## Orcamento

```txt
id              string   uuid
competencia     string   AAAA-MM
categoria       string   nome da categoria
valorPlanejado  number   valor planejado para a categoria naquela competência
```

Não pode haver dois orçamentos para a mesma combinação `competencia` +
`categoria` — `salvarOrcamento()` detecta e atualiza o registro existente
nesse caso, em vez de duplicar.

## Config

```txt
mesInicioAnoFinanceiro  number   1 a 12 (padrão: 1 — janeiro)
temaPreferido           string   "sistema" | "claro" | "escuro" (padrão: "sistema")
```

## Camada de acesso (db.js)

- Toda escrita passa por `salvarLancamento`, `salvarCategoria`,
  `salvarOrcamento`, `salvarConfig`, etc.
- Erros de escrita (ex.: quota do localStorage excedida) lançam
  `ErroArmazenamento`, com mensagem amigável para exibir ao usuário.
- `exportarTudo()` / `restaurarTudo()` cobrem o backup completo em JSON
  (usado na Fase 3, em `configuracoes.html`).
- A estrutura foi pensada para permitir trocar `localStorage` por uma
  API/banco no futuro sem alterar as páginas: bastaria reimplementar as
  funções deste módulo mantendo a mesma assinatura.
