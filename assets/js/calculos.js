// ===========================================================
// CALCULOS.JS — totais, saldos e agregações por mês/categoria.
// Funções puras: recebem os dados já carregados (de db.js) e
// devolvem números/estruturas prontas para a UI. Nenhuma leitura
// de armazenamento aqui.
// ===========================================================

import { deslocarCompetencia } from "./formatadores.js";

/**
 * Soma o valor dos lançamentos de um tipo numa competência.
 * @param {object[]} lancamentos
 * @param {string} competencia AAAA-MM
 * @param {"receita"|"despesa"} tipo
 * @returns {number}
 */
export function totalPorTipo(lancamentos, competencia, tipo) {
  return lancamentos
    .filter((l) => l.competencia === competencia && l.tipo === tipo)
    .reduce((soma, l) => soma + l.valor, 0);
}

/**
 * Receita, despesa e saldo de uma competência.
 * @param {object[]} lancamentos
 * @param {string} competencia
 * @returns {{ receitas: number, despesas: number, saldo: number }}
 */
export function saldoDoMes(lancamentos, competencia) {
  const receitas = totalPorTipo(lancamentos, competencia, "receita");
  const despesas = totalPorTipo(lancamentos, competencia, "despesa");
  return { receitas, despesas, saldo: receitas - despesas };
}

/**
 * Totais por categoria de um tipo, numa competência.
 * @param {object[]} lancamentos
 * @param {string} competencia
 * @param {"receita"|"despesa"} tipo
 * @returns {{ categoria: string, total: number }[]} ordenado do maior para o menor
 */
export function totalPorCategoria(lancamentos, competencia, tipo) {
  const mapa = new Map();
  lancamentos
    .filter((l) => l.competencia === competencia && l.tipo === tipo)
    .forEach((l) => mapa.set(l.categoria, (mapa.get(l.categoria) || 0) + l.valor));

  return [...mapa.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Calcula a variação percentual entre dois valores. Trata divisão por
 * zero: se o valor anterior for 0, retorna 0 (sem anterior) ou 100
 * (quando o atual é positivo), evitando Infinity/NaN na UI.
 * @param {number} atual
 * @param {number} anterior
 * @returns {number} fração (0.1 = +10%)
 */
function variacaoPercentual(atual, anterior) {
  if (anterior === 0) return atual === 0 ? 0 : 1;
  return (atual - anterior) / anterior;
}

/**
 * Compara receitas, despesas e saldo do mês com o mês anterior.
 * @param {object[]} lancamentos
 * @param {string} competencia
 * @returns {{
 *   receitas: {atual:number, anterior:number, variacaoAbs:number, variacaoPct:number},
 *   despesas: {atual:number, anterior:number, variacaoAbs:number, variacaoPct:number},
 *   saldo: {atual:number, anterior:number, variacaoAbs:number, variacaoPct:number}
 * }}
 */
export function compararComMesAnterior(lancamentos, competencia) {
  const mesAnterior = deslocarCompetencia(competencia, -1);
  const atual = saldoDoMes(lancamentos, competencia);
  const anterior = saldoDoMes(lancamentos, mesAnterior);

  const montar = (chave) => ({
    atual: atual[chave],
    anterior: anterior[chave],
    variacaoAbs: atual[chave] - anterior[chave],
    variacaoPct: variacaoPercentual(atual[chave], anterior[chave]),
  });

  return {
    receitas: montar("receitas"),
    despesas: montar("despesas"),
    saldo: montar("saldo"),
  };
}

/**
 * Cruza orçamento planejado com o realizado (gasto) por categoria numa
 * competência. Inclui categorias com orçamento OU com gasto (para não
 * esconder estouros em categorias sem orçamento definido).
 * @param {object[]} lancamentos
 * @param {object[]} orcamentos já filtrados pela competência (db.listarOrcamentos({competencia}))
 * @param {string} competencia
 * @returns {{categoria:string, planejado:number, realizado:number, saldo:number, percentual:number}[]}
 */
export function realizadoPorCategoria(lancamentos, orcamentos, competencia) {
  const realizado = new Map(
    totalPorCategoria(lancamentos, competencia, "despesa").map((r) => [r.categoria, r.total])
  );
  const planejado = new Map(orcamentos.map((o) => [o.categoria, o.valorPlanejado]));

  const categorias = new Set([...realizado.keys(), ...planejado.keys()]);

  return [...categorias]
    .map((categoria) => {
      const valorPlanejado = planejado.get(categoria) || 0;
      const valorRealizado = realizado.get(categoria) || 0;
      return {
        categoria,
        planejado: valorPlanejado,
        realizado: valorRealizado,
        saldo: valorPlanejado - valorRealizado,
        percentual: valorPlanejado > 0 ? valorRealizado / valorPlanejado : valorRealizado > 0 ? 1 : 0,
      };
    })
    .sort((a, b) => b.realizado - a.realizado);
}

/**
 * Evolução mensal de receitas/despesas/saldo dos últimos N meses,
 * terminando na competência informada (inclusive).
 * @param {object[]} lancamentos
 * @param {number} quantidadeMeses
 * @param {string} competenciaFinal AAAA-MM
 * @returns {{competencia:string, receitas:number, despesas:number, saldo:number}[]} em ordem cronológica
 */
export function evolucaoMensal(lancamentos, quantidadeMeses, competenciaFinal) {
  const meses = [];
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    meses.push(deslocarCompetencia(competenciaFinal, -i));
  }
  return meses.map((competencia) => ({ competencia, ...saldoDoMes(lancamentos, competencia) }));
}

/**
 * Ranking de categorias por gasto acumulado num intervalo de datas (ISO,
 * inclusive nas duas pontas).
 * @param {object[]} lancamentos
 * @param {string} dataInicio ISO AAAA-MM-DD
 * @param {string} dataFim ISO AAAA-MM-DD
 * @param {"receita"|"despesa"} tipo
 * @returns {{categoria:string, total:number}[]} do maior para o menor
 */
export function rankingCategorias(lancamentos, dataInicio, dataFim, tipo = "despesa") {
  const mapa = new Map();
  lancamentos
    .filter((l) => l.tipo === tipo && l.data >= dataInicio && l.data <= dataFim)
    .forEach((l) => mapa.set(l.categoria, (mapa.get(l.categoria) || 0) + l.valor));

  return [...mapa.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Total de despesas por forma de pagamento num intervalo de datas.
 * @param {object[]} lancamentos
 * @param {string} dataInicio ISO AAAA-MM-DD
 * @param {string} dataFim ISO AAAA-MM-DD
 * @returns {{formaPagamento:string, total:number}[]} do maior para o menor
 */
export function gastosPorFormaPagamento(lancamentos, dataInicio, dataFim) {
  const mapa = new Map();
  lancamentos
    .filter((l) => l.tipo === "despesa" && l.data >= dataInicio && l.data <= dataFim)
    .forEach((l) => {
      const chave = l.formaPagamento || "Não informado";
      mapa.set(chave, (mapa.get(chave) || 0) + l.valor);
    });

  return [...mapa.entries()]
    .map(([formaPagamento, total]) => ({ formaPagamento, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Compara despesas fixas (recorrente=true) com variáveis num intervalo.
 * @param {object[]} lancamentos
 * @param {string} dataInicio ISO AAAA-MM-DD
 * @param {string} dataFim ISO AAAA-MM-DD
 * @returns {{fixas:number, variaveis:number}}
 */
export function despesasFixasVariaveis(lancamentos, dataInicio, dataFim) {
  const despesas = lancamentos.filter(
    (l) => l.tipo === "despesa" && l.data >= dataInicio && l.data <= dataFim
  );
  const fixas = despesas.filter((l) => l.recorrente).reduce((soma, l) => soma + l.valor, 0);
  const variaveis = despesas.filter((l) => !l.recorrente).reduce((soma, l) => soma + l.valor, 0);
  return { fixas, variaveis };
}

/**
 * Agrupa uma lista de totais por categoria, mantendo as `limite` maiores
 * e somando o restante num bucket "Outros". Usado nos gráficos de
 * ranking para não estourar o número de barras/fatias.
 * @param {{categoria:string, total:number}[]} totais já ordenado do maior para o menor
 * @param {number} limite
 * @returns {{categoria:string, total:number}[]}
 */
export function agruparTopCategorias(totais, limite = 7) {
  if (totais.length <= limite) return totais;
  const principais = totais.slice(0, limite);
  const restante = totais.slice(limite).reduce((soma, item) => soma + item.total, 0);
  return restante > 0 ? [...principais, { categoria: "Outros", total: restante }] : principais;
}
