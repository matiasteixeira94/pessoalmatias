// ===========================================================
// UI.JS — toasts, modais e helpers de renderização de UI
// (tabelas, selos, escape de texto). Sem lógica de negócio aqui.
// ===========================================================

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
  modalAtual = { elemento: fundo, aoFechar };

  fundo.addEventListener("click", (evento) => {
    if (evento.target === fundo) fecharModal();
  });
  fundo.querySelector("[data-acao-fechar-modal]").addEventListener("click", fecharModal);

  const primeiroFoco = fundo.querySelector("input, select, textarea, button:not([data-acao-fechar-modal])");
  primeiroFoco?.focus();

  return fundo;
}

/**
 * Fecha o modal aberto no momento, se houver.
 */
export function fecharModal() {
  if (!modalAtual) return;
  const { elemento, aoFechar } = modalAtual;
  elemento.remove();
  document.body.style.overflow = "";
  modalAtual = null;
  aoFechar?.();
}

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && modalAtual) fecharModal();
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
