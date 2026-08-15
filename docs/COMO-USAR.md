# Como usar — Gestão Financeira Matias

Guia rápido de uso do app. Para o schema de dados, veja
[ESTRUTURA-DADOS.md](./ESTRUTURA-DADOS.md).

## Lançamentos do dia a dia

Em **Lançamentos**, toque em **+ Novo lançamento** (ou o botão flutuante "+"
no celular, ou `Ctrl+N` no computador). Informe o essencial — **data,
tipo (receita/despesa), categoria e valor** — os demais campos
(subcategoria, forma de pagamento, observações) são opcionais.

Use os filtros no topo da página (mês, tipo, categoria, status, busca por
texto) para encontrar lançamentos específicos. O card de resumo mostra
receitas, despesas e saldo **considerando o filtro atual** — limpe os
filtros para ver o total geral.

## Despesas fixas (gastos que se repetem todo mês)

Também em **Lançamentos**, na seção **Despesas fixas**, cadastre uma vez
o aluguel, assinaturas, mensalidades etc. — descrição, categoria, valor e
o dia do mês em que costumam vencer.

A partir daí, **todo mês elas aparecem sozinhas** na lista de lançamentos,
com status "Pendente". Basta editar o lançamento gerado e marcar como
"Pago" quando você de fato pagar. Você não precisa lançar esses gastos de
novo manualmente.

- Use **⏸️ Pausar** numa despesa fixa para parar de gerá-la sem apagar o
  histórico já lançado.
- O botão **Gerar lançamentos do mês**, na mesma seção, força a geração
  para o mês selecionado no filtro — útil se você quiser adiantar o mês
  seguinte ou preencher um mês que passou em branco.

## Orçamento

Em **Orçamento**, escolha o mês e digite o valor planejado por categoria
diretamente na tabela — salva sozinho ao sair do campo. A barra de
progresso fica âmbar acima de 80% do planejado e vermelha ao estourar.
**Copiar orçamento do mês anterior** repete os valores do mês passado
para o mês atual (substituindo o que já estiver definido).

## Painel e Relatórios

O **Painel** mostra o resumo do mês selecionado: cards com comparativo ao
mês anterior, alerta de categorias com orçamento estourado, a linha do
tempo de despesas dos últimos 12 meses e o ranking dos maiores gastos por
categoria.

**Relatórios** aprofunda por um intervalo de datas à sua escolha:
evolução do saldo, ranking de categorias, gastos por forma de pagamento,
despesas fixas x variáveis, e exportação do período em CSV (abre
corretamente no Excel em português, com `;` como separador).

## Categorias e formas de pagamento

Em **Categorias**, crie, edite, inative ou exclua categorias. Uma
categoria **em uso** (com lançamentos, despesas fixas ou orçamento
associados) não pode ser excluída diretamente — o app oferece duas
opções:

- **Só inativar** — some das opções para novos lançamentos, mas o
  histórico continua intacto.
- **Migrar para outra categoria** — todos os lançamentos, despesas fixas
  e orçamentos daquela categoria passam a usar a categoria escolhida, e
  só então a original é excluída.

Formas de pagamento (Pix, Débito, Crédito...) ficam na mesma página, numa
lista simples de adicionar/renomear/remover.

## Importando sua planilha

Em **Configurações → Planilha**:

1. Se ainda não tem uma planilha no formato certo, clique em **Baixar
   planilha modelo** — ele já vem com as colunas certas e uma linha de
   exemplo.
2. Preencha uma linha por lançamento, na aba **"Lançamentos"**, com estas
   colunas (nessa ordem, mas os nomes das colunas é o que realmente
   importa):

   | Coluna | Formato esperado |
   |---|---|
   | Data | `DD/MM/AAAA` (ou data nativa do Excel) |
   | Tipo | `Receita` ou `Despesa` |
   | Categoria | nome da categoria (texto livre) |
   | Subcategoria | opcional |
   | Descrição | texto |
   | Forma de Pagamento | opcional |
   | Valor | número positivo, ex.: `150,00` |
   | Status | `Pago`, `Pendente` ou `Agendado` (em branco = Pago) |
   | Recorrente | `Sim` ou `Não` (em branco = Não) |
   | Observações | opcional |

3. Clique em **Importar planilha** e escolha o arquivo. Antes de
   confirmar, o app mostra quantas linhas são válidas, quantas têm erro
   (com o motivo de cada uma) e quantas parecem duplicadas de um
   lançamento já existente (mesma data, valor e descrição) — você decide
   se quer importar as duplicadas também.
4. Categorias que ainda não existem no app são importadas mesmo assim,
   com o nome exato da planilha — depois é só ajustar cor/ícone em
   **Categorias**, se quiser.

Use **Exportar lançamentos (.xlsx)** para ir no sentido contrário: baixar
tudo o que já está lançado, no mesmo formato da planilha modelo.

## Backup

Em **Configurações → Backup**, **Exportar backup (.json)** salva uma
cópia completa de tudo (lançamentos, categorias, orçamentos, despesas
fixas, formas de pagamento e preferências). Guarde esse arquivo em algum
lugar seguro de vez em quando — é a sua rede de segurança, já que os
dados vivem só neste dispositivo.

**Restaurar backup** substitui **todos** os dados atuais pelo conteúdo do
arquivo — peça confirmação antes de continuar.

## Apagando tudo

Em **Configurações → Zona de risco**, **Apagar todos os dados** exige uma
dupla confirmação (incluindo digitar "APAGAR") antes de executar, porque
não há como desfazer depois. Exporte um backup antes, se tiver dúvida.
