// ===========================================================
// FORMATADORES.JS — moeda, data e percentual (pt-BR)
// ===========================================================

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoMoedaSemSimbolo = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formata um número como moeda brasileira (R$ 1.234,56).
 * @param {number} valor
 * @returns {string}
 */
export function formatarMoeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return formatoMoeda.format(0);
  return formatoMoeda.format(numero);
}

/**
 * Formata um número sem o símbolo de moeda (1.234,56), útil para inputs.
 * @param {number} valor
 * @returns {string}
 */
export function formatarNumeroMoeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return formatoMoedaSemSimbolo.format(0);
  return formatoMoedaSemSimbolo.format(numero);
}

/**
 * Converte texto digitado (ex.: "1.234,56" ou "1234.56") em número.
 * @param {string} texto
 * @returns {number}
 */
export function analisarValorMonetario(texto) {
  if (typeof texto === "number") return texto;
  if (!texto) return 0;
  const limpo = String(texto)
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "") // remove separador de milhar
    .replace(",", ".");
  const numero = parseFloat(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Formata uma data ISO (AAAA-MM-DD) para DD/MM/AAAA.
 * @param {string} isoData
 * @returns {string}
 */
export function formatarData(isoData) {
  if (!isoData) return "";
  const [ano, mes, dia] = isoData.split("-");
  if (!ano || !mes || !dia) return isoData;
  return `${dia}/${mes}/${ano}`;
}

/**
 * Converte data DD/MM/AAAA para ISO AAAA-MM-DD.
 * @param {string} dataBr
 * @returns {string}
 */
export function paraIso(dataBr) {
  if (!dataBr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataBr)) return dataBr;
  const [dia, mes, ano] = dataBr.split("/");
  if (!dia || !mes || !ano) return "";
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

/**
 * Deriva a competência (AAAA-MM) a partir de uma data ISO.
 * @param {string} isoData
 * @returns {string}
 */
export function derivarCompetencia(isoData) {
  if (!isoData || isoData.length < 7) return "";
  return isoData.slice(0, 7);
}

/**
 * Formata uma competência AAAA-MM para "Mês/AAAA" (ex.: "Agosto/2026").
 * @param {string} competencia
 * @returns {string}
 */
export function formatarCompetencia(competencia) {
  if (!competencia) return "";
  const [ano, mes] = competencia.split("-");
  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const indice = parseInt(mes, 10) - 1;
  return `${nomesMeses[indice] ?? mes}/${ano}`;
}

/**
 * Retorna a competência atual no formato AAAA-MM.
 * @returns {string}
 */
export function competenciaAtual() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}`;
}

/**
 * Retorna quantos dias tem uma competência AAAA-MM (28 a 31).
 * @param {string} competencia
 * @returns {number}
 */
export function diasNoMes(competencia) {
  const [ano, mes] = competencia.split("-").map(Number);
  return new Date(ano, mes, 0).getDate();
}

/**
 * Soma ou subtrai meses de uma competência AAAA-MM.
 * @param {string} competencia
 * @param {number} delta
 * @returns {string}
 */
export function deslocarCompetencia(competencia, delta) {
  const [ano, mes] = competencia.split("-").map(Number);
  const data = new Date(ano, mes - 1 + delta, 1);
  const mesNovo = String(data.getMonth() + 1).padStart(2, "0");
  return `${data.getFullYear()}-${mesNovo}`;
}

/**
 * Formata um número como percentual (ex.: 0.5 -> "50%").
 * @param {number} valor fração (0 a 1) ou já em percentual se base100=true
 * @param {boolean} base100 se true, valor já está em escala 0-100
 * @returns {string}
 */
export function formatarPercentual(valor, base100 = false) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "0%";
  const percentual = base100 ? numero : numero * 100;
  return `${percentual.toFixed(0)}%`;
}

/**
 * Formata a data de hoje no formato ISO (AAAA-MM-DD), para uso em inputs date.
 * @returns {string}
 */
export function hojeIso() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}
