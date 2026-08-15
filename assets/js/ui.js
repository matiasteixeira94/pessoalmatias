// ===========================================================
// UI.JS — toasts, modais e helpers de renderização de UI
// (tabelas, selos, escape de texto). Sem lógica de negócio aqui.
// ===========================================================

/**
 * Executa uma função que escreve no armazenamento (via db.js),
 * mostrando um toast de erro amigável se ela lançar — em especial
 * ErroArmazenamento (ex.: localStorage cheio), mas qualquer outro
 * erro também vira um toast em vez de quebrar a página silenciosamente.
 * @template T
 * @param {() => T} fn
 * @param {string} mensagemGenerica usada quando o erro não é ErroArmazenamento
 * @returns {{ok: true, valor: T} | {ok: false, valor: undefined}}
 */
export function tentarOuAvisar(fn, mensagemGenerica = "Ocorreu um erro ao salvar os dados.") {
  try {
    return { ok: true, valor: fn() };
  } catch (erro) {
    if (erro && erro.name === "ErroArmazenamento") {
      exibirToast(erro.message, "erro");
    } else {
      console.error(erro);
      exibirToast(mensagemGenerica, "erro");
    }
    return { ok: false, valor: undefined };
  }
}

let containerToasts = null;

function obterContainerToasts() {
  if (containerToasts && document.body.contains(containerToasts)) return containerToasts;
  containerToasts = document.querySelector(".toasts");
  if (!containerToasts) {
    containerToasts = document.createElement("div");
    containerToasts.className = "toasts";
    containerToasts.setAttribute("role", "status");
    containerToasts.setAttribute("aria-live", "polite");
    document.body.appendChild(containerToasts);
  }
  return containerToasts;
}

/**
 * Exibe um toast temporário.
 * @param {string} mensagem
 * @param {"info"|"sucesso"|"erro"} tipo
 * @param {number} duracaoMs
 */
export function exibirToast(mensagem, tipo = "info", duracaoMs = 3200) {
  const container = obterContainerToasts();
  const toast = document.createElement("div");
  toast.className = `toast toast--${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duracaoMs);
}

/**
 * Escapa texto para inserção segura em innerHTML.
 * @param {string} texto
 * @returns {string}
 */
export function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

const ROTULOS_STATUS = {
  pago: "Pago",
  pendente: "Pendente",
  agendado: "Agendado",
};

/**
 * Retorna o HTML de um selo de status.
 * @param {"pago"|"pendente"|"agendado"} status
 * @returns {string}
 */
export function seloStatus(status) {
  const rotulo = ROTULOS_STATUS[status] || status;
  return `<span class="selo selo--${status}">${rotulo}</span>`;
}

/**
 * Retorna o HTML de um pequeno círculo colorido (chip de cor de categoria).
 * @param {string} cor hex
 * @returns {string}
 */
export function chipCor(cor) {
  return `<span class="chip-cor" style="background:${escaparHtml(cor || "#999")}" aria-hidden="true"></span>`;
}

let modalAtual = null;

/**
 * Abre um modal genérico. Retorna o elemento raiz (.modal-fundo) para
 * quem quiser manipular o conteúdo manualmente.
 * @param {{titulo: string, conteudoHtml: string, aoFechar?: () => void}} opcoes
 * @returns {HTMLElement}
 */
export function abrirModal({ titulo, conteudoHtml, aoFechar } = {}) {
  fecharModal();

  const fundo = document.createElement("div");
  fundo.className = "modal-fundo";
  fundo.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div class="modal__cabecalho">
        <h2 class="modal__titulo" id="modal-titulo">${escaparHtml(titulo || "")}</h2>
        <button type="button" class="botao botao--icone" data-acao-fechar-modal aria-label="Fechar">✕</button>
      </div>
      <div class="modal__corpo">${conteudoHtml || ""}</div>
    </div>
  `;

  document.body.appendChild(fundo);
  document.body.style.overflow = "hidden";
  modalAtual = { elemento: fundo, aoFechar, focoAnterior: document.activeElement };

  fundo.addEventListener("click", (evento) => {
    if (evento.target === fundo) fecharModal();
  });
  fundo.querySelector("[data-acao-fechar-modal]").addEventListener("click", fecharModal);

  const primeiroFoco = fundo.querySelector("input, select, textarea, button:not([data-acao-fechar-modal])");
  primeiroFoco?.focus();

  return fundo;
}

function elementosFocaveis(container) {
  return [
    ...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((el) => el.offsetParent !== null);
}

/**
 * Fecha o modal aberto no momento, se houver, e devolve o foco a quem
 * o abriu.
 */
export function fecharModal() {
  if (!modalAtual) return;
  const { elemento, aoFechar, focoAnterior } = modalAtual;
  elemento.remove();
  document.body.style.overflow = "";
  modalAtual = null;
  aoFechar?.();
  focoAnterior?.focus?.();
}

document.addEventListener("keydown", (evento) => {
  if (!modalAtual) return;

  if (evento.key === "Escape") {
    fecharModal();
    return;
  }

  // Prende o foco (Tab/Shift+Tab) dentro do modal enquanto ele estiver aberto.
  if (evento.key === "Tab") {
    const focaveis = elementosFocaveis(modalAtual.elemento);
    if (focaveis.length === 0) return;

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];

    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }
});

/**
 * Abre um modal de confirmação e retorna uma Promise<boolean> resolvida
 * com true se o usuário confirmar, false se cancelar/fechar.
 * @param {{titulo: string, mensagem: string, textoConfirmar?: string, textoCancelar?: string, perigo?: boolean}} opcoes
 * @returns {Promise<boolean>}
 */
export function confirmarAcao({
  titulo = "Confirmar ação",
  mensagem = "Tem certeza?",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  perigo = false,
} = {}) {
  return new Promise((resolver) => {
    let resolvido = false;

    const fundo = abrirModal({
      titulo,
      conteudoHtml: `
        <p>${escaparHtml(mensagem)}</p>
        <div class="modal__rodape">
          <button type="button" class="botao botao--secundario" data-acao="cancelar">${escaparHtml(textoCancelar)}</button>
          <button type="button" class="botao ${perigo ? "botao--perigo" : "botao--primario"}" data-acao="confirmar">${escaparHtml(textoConfirmar)}</button>
        </div>
      `,
      aoFechar: () => {
        if (!resolvido) {
          resolvido = true;
          resolver(false);
        }
      },
    });

    fundo.querySelector('[data-acao="cancelar"]').addEventListener("click", () => {
      resolvido = true;
      resolver(false);
      fecharModal();
    });
    fundo.querySelector('[data-acao="confirmar"]').addEventListener("click", () => {
      resolvido = true;
      resolver(true);
      fecharModal();
    });
  });
}
