// ===========================================================
// GRAFICOS.JS — wrappers do Chart.js (carregado via CDN nas
// páginas que usam gráficos: index.html e relatorios.html).
//
// Paleta: séries de magnitude única (linha do tempo) usam o azul
// da marca; receita x despesa usa verde/vermelho (mesma convenção
// de valor-positivo/valor-negativo já usada no resto do app);
// rankings usam um único tom de azul (sequencial), com o nome da
// categoria como rótulo — evita depender de cor para identificar
// mais de 8 categorias ao mesmo tempo.
// ===========================================================

import { formatarMoeda } from "./formatadores.js";

function corCss(nomeVariavel) {
  return getComputedStyle(document.documentElement).getPropertyValue(nomeVariavel).trim();
}

function comOpacidade(hex, alpha) {
  const valor = hex.replace("#", "");
  const r = parseInt(valor.slice(0, 2), 16);
  const g = parseInt(valor.slice(2, 4), 16);
  const b = parseInt(valor.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function destruirGraficoExistente(canvas) {
  Chart.getChart(canvas)?.destroy();
}

/**
 * Gradiente vertical suave para preenchimento de área (mais rico que
 * uma cor chapada). Precisa ser recalculado a cada render porque
 * depende da área do gráfico já medida pelo Chart.js.
 */
function gradienteVertical(contexto, corHex, alphaTopo, alphaBase) {
  const { chart } = contexto;
  const { chartArea } = chart;
  if (!chartArea) return comOpacidade(corHex, alphaTopo);
  const gradiente = chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradiente.addColorStop(0, comOpacidade(corHex, alphaTopo));
  gradiente.addColorStop(1, comOpacidade(corHex, alphaBase));
  return gradiente;
}

/** Estilo compartilhado dos tooltips — cantos arredondados, mais respiro. */
function estiloTooltip() {
  return {
    backgroundColor: corCss("--cor-texto"),
    titleColor: corCss("--cor-fundo"),
    bodyColor: corCss("--cor-fundo"),
    padding: 10,
    cornerRadius: 10,
    displayColors: false,
    titleFont: { weight: "600" },
    bodyFont: { weight: "500" },
  };
}

const PREFERE_MOVIMENTO_REDUZIDO =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const OPCOES_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  animation: PREFERE_MOVIMENTO_REDUZIDO ? false : { duration: 780, easing: "easeOutQuart" },
  plugins: {
    legend: { display: false },
  },
};

/**
 * Gráfico de linha de série única (ex.: despesas por mês, evolução do
 * saldo), na cor azul da marca, com área preenchida.
 * @param {HTMLCanvasElement} canvas
 * @param {{labels: string[], dados: number[], rotulo?: string}} dados
 * @returns {Chart}
 */
export function graficoLinha(canvas, { labels, dados, rotulo = "Valor" }) {
  destruirGraficoExistente(canvas);
  const corLinha = corCss("--cor-primaria-500");
  const corGrade = corCss("--cor-borda");
  const corTexto = corCss("--cor-texto-suave");

  return new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: rotulo,
          data: dados,
          borderColor: corLinha,
          backgroundColor: (ctx) => gradienteVertical(ctx, corLinha, 0.32, 0.02),
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          cubicInterpolationMode: "monotone",
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: "#fff",
          pointBackgroundColor: corLinha,
          pointHoverBackgroundColor: corLinha,
        },
      ],
    },
    options: {
      ...OPCOES_BASE,
      scales: {
        x: { grid: { display: false }, ticks: { color: corTexto } },
        y: {
          grid: { color: corGrade },
          ticks: { color: corTexto, callback: (valor) => formatarMoeda(valor) },
          beginAtZero: true,
          suggestedMax: 100, // evita uma escala de 0 a 1 estranha quando ainda não há nenhum dado lançado
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { ...estiloTooltip(), callbacks: { label: (ctx) => ` ${formatarMoeda(ctx.parsed.y)}` } },
      },
    },
  });
}

/**
 * Gráfico de barras agrupadas receita x despesa por mês.
 * @param {HTMLCanvasElement} canvas
 * @param {{labels: string[], receitas: number[], despesas: number[]}} dados
 * @returns {Chart}
 */
export function graficoBarrasReceitaDespesa(canvas, { labels, receitas, despesas }) {
  destruirGraficoExistente(canvas);
  const corReceita = corCss("--cor-receita");
  const corDespesa = corCss("--cor-despesa");
  const corGrade = corCss("--cor-borda");
  const corTexto = corCss("--cor-texto-suave");

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Receitas", data: receitas, backgroundColor: corReceita, hoverBackgroundColor: corReceita, borderRadius: 8, maxBarThickness: 28 },
        { label: "Despesas", data: despesas, backgroundColor: corDespesa, hoverBackgroundColor: corDespesa, borderRadius: 8, maxBarThickness: 28 },
      ],
    },
    options: {
      ...OPCOES_BASE,
      scales: {
        x: { grid: { display: false }, ticks: { color: corTexto } },
        y: {
          grid: { color: corGrade },
          ticks: { color: corTexto, callback: (valor) => formatarMoeda(valor) },
          beginAtZero: true,
          suggestedMax: 100, // evita uma escala de 0 a 1 estranha quando ainda não há nenhum dado lançado
        },
      },
      plugins: {
        legend: { display: true, position: "bottom", labels: { color: corTexto, usePointStyle: true, boxWidth: 8, padding: 16 } },
        tooltip: { ...estiloTooltip(), callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatarMoeda(ctx.parsed.y)}` } },
      },
    },
  });
}

/**
 * Ranking horizontal de categorias (ou formas de pagamento) por valor,
 * já ordenado do maior para o menor — um único tom de azul, com o
 * nome de cada item como rótulo no próprio eixo.
 * @param {HTMLCanvasElement} canvas
 * @param {{rotulos: string[], valores: number[]}} dados
 * @returns {Chart}
 */
export function graficoRanking(canvas, { rotulos, valores }) {
  destruirGraficoExistente(canvas);
  const corBarra = corCss("--cor-primaria-500");
  const corGrade = corCss("--cor-borda");
  const corTexto = corCss("--cor-texto-suave");

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: rotulos,
      datasets: [{ data: valores, backgroundColor: corBarra, hoverBackgroundColor: corBarra, borderRadius: 8, maxBarThickness: 24 }],
    },
    options: {
      ...OPCOES_BASE,
      indexAxis: "y",
      scales: {
        x: {
          grid: { color: corGrade },
          ticks: { color: corTexto, callback: (valor) => formatarMoeda(valor) },
          beginAtZero: true,
          suggestedMax: 100, // evita uma escala de 0 a 1 estranha quando ainda não há nenhum dado lançado
        },
        y: { grid: { display: false }, ticks: { color: corTexto } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { ...estiloTooltip(), callbacks: { label: (ctx) => ` ${formatarMoeda(ctx.parsed.x)}` } },
      },
    },
  });
}

/**
 * Comparação simples de duas barras (ex.: despesas fixas x variáveis),
 * com rótulo direto de cada uma.
 * @param {HTMLCanvasElement} canvas
 * @param {{rotulos: [string, string], valores: [number, number]}} dados
 * @returns {Chart}
 */
export function graficoComparativoDuplo(canvas, { rotulos, valores }) {
  destruirGraficoExistente(canvas);
  const corPrincipal = corCss("--cor-primaria-500");
  const corSecundaria = corCss("--cor-primaria-300");
  const corGrade = corCss("--cor-borda");
  const corTexto = corCss("--cor-texto-suave");

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: rotulos,
      datasets: [
        {
          data: valores,
          backgroundColor: [corPrincipal, corSecundaria],
          hoverBackgroundColor: [corPrincipal, corSecundaria],
          borderRadius: 8,
          maxBarThickness: 56,
        },
      ],
    },
    options: {
      ...OPCOES_BASE,
      scales: {
        x: { grid: { display: false }, ticks: { color: corTexto } },
        y: {
          grid: { color: corGrade },
          ticks: { color: corTexto, callback: (valor) => formatarMoeda(valor) },
          beginAtZero: true,
          suggestedMax: 100, // evita uma escala de 0 a 1 estranha quando ainda não há nenhum dado lançado
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { ...estiloTooltip(), callbacks: { label: (ctx) => ` ${formatarMoeda(ctx.parsed.y)}` } },
      },
    },
  });
}
