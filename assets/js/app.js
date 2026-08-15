// ===========================================================
// APP.JS — bootstrap do app: inicialização, seed de dados e
// montagem da navegação (lateral no desktop, inferior no celular).
// Cada página chama iniciarApp("id-da-pagina") no início do seu
// próprio <script type="module">.
// ===========================================================

import { semearDadosIniciais } from "./seed.js";
import { gerarLancamentosDoMes } from "./db.js";
import { competenciaAtual } from "./formatadores.js";

const PAGINAS = [
  { id: "painel", href: "index.html", rotulo: "Painel", icone: "🏠" },
  { id: "lancamentos", href: "lancamentos.html", rotulo: "Lançamentos", icone: "💳" },
  { id: "orcamento", href: "orcamento.html", rotulo: "Orçamento", icone: "🎯" },
  { id: "relatorios", href: "relatorios.html", rotulo: "Relatórios", icone: "📊" },
  { id: "categorias", href: "categorias.html", rotulo: "Categorias", icone: "🏷️" },
  { id: "configuracoes", href: "configuracoes.html", rotulo: "Ajustes", icone: "⚙️" },
];

// Itens exibidos na barra inferior do celular (espaço limitado).
const IDS_NAV_INFERIOR = ["painel", "lancamentos", "orcamento", "relatorios", "configuracoes"];

function montarNavLateral(paginaAtual) {
  const nav = document.createElement("nav");
  nav.className = "nav-lateral";
  nav.setAttribute("aria-label", "Navegação principal");

  const marca = document.createElement("div");
  marca.className = "nav-lateral__marca";
  marca.textContent = "Gestão Financeira Matias";
  nav.appendChild(marca);

  PAGINAS.forEach((pagina) => {
    const link = document.createElement("a");
    link.className = "nav-lateral__item";
    link.href = pagina.href;
    link.textContent = `${pagina.icone}  ${pagina.rotulo}`;
    if (pagina.id === paginaAtual) link.setAttribute("aria-current", "page");
    nav.appendChild(link);
  });

  document.body.appendChild(nav);
}

/**
 * Registra o service worker (cache offline do app). Silencioso se o
 * navegador não suportar ou se o registro falhar — o app continua
 * funcionando normalmente, só sem o modo offline.
 */
function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((erro) => {
      console.warn("[app] Não foi possível registrar o service worker:", erro);
    });
  });
}

function montarNavInferior(paginaAtual) {
  const nav = document.createElement("nav");
  nav.className = "nav-inferior";
  nav.setAttribute("aria-label", "Navegação principal");

  PAGINAS.filter((pagina) => IDS_NAV_INFERIOR.includes(pagina.id)).forEach((pagina) => {
    const link = document.createElement("a");
    link.className = "nav-inferior__item";
    link.href = pagina.href;
    if (pagina.id === paginaAtual) link.setAttribute("aria-current", "page");
    link.innerHTML = `
      <span class="nav-inferior__icone" aria-hidden="true">${pagina.icone}</span>
      <span>${pagina.rotulo}</span>
    `;
    nav.appendChild(link);
  });

  document.body.appendChild(nav);
}

/**
 * Inicializa o app: garante dados padrão (seed) e monta a navegação.
 * Deve ser chamada por toda página, no início do seu módulo.
 * @param {string} paginaAtual um dos ids em PAGINAS
 * @returns {Promise<void>}
 */
export async function iniciarApp(paginaAtual) {
  await semearDadosIniciais();
  // Garante que os gastos fixos do mês corrente já apareçam como
  // lançamentos "pendente", sem o usuário precisar lançá-los.
  gerarLancamentosDoMes(competenciaAtual());
  montarNavLateral(paginaAtual);
  montarNavInferior(paginaAtual);
  registrarServiceWorker();
}

export { PAGINAS };
