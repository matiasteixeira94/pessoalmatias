// ===========================================================
// DB.JS — camada de dados (CRUD sobre localStorage).
// Nenhuma página deve acessar localStorage diretamente: toda
// leitura/escrita passa por aqui. Estrutura preparada para no
// futuro trocar localStorage por uma API/banco sem alterar o
// resto do app (basta reimplementar as funções deste módulo).
// ===========================================================

import { criarLancamento, criarCategoria, criarOrcamento, gerarId } from "./modelos.js";

const PREFIXO = "gfm:";

const CHAVES = {
  lancamentos: `${PREFIXO}lancamentos`,
  categorias: `${PREFIXO}categorias`,
  orcamentos: `${PREFIXO}orcamentos`,
  formasPagamento: `${PREFIXO}formasPagamento`,
  config: `${PREFIXO}config`,
};

const FORMAS_PAGAMENTO_PADRAO = [
  "Dinheiro",
  "Débito",
  "Crédito",
  "Pix",
  "Transferência",
  "Boleto",
];

const CONFIG_PADRAO = {
  mesInicioAnoFinanceiro: 1,
  temaPreferido: "sistema",
};

/**
 * Erro customizado para falhas de armazenamento (ex.: quota excedida).
 */
export class ErroArmazenamento extends Error {
  constructor(mensagem, causa) {
    super(mensagem);
    this.name = "ErroArmazenamento";
    this.causa = causa;
  }
}

function lerBruto(chave, valorPadrao) {
  try {
    const texto = localStorage.getItem(chave);
    if (texto === null) return valorPadrao;
    return JSON.parse(texto);
  } catch (erro) {
    console.error(`[db] Falha ao ler "${chave}":`, erro);
    return valorPadrao;
  }
}

function escreverBruto(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
    const cheio =
      erro instanceof DOMException &&
      (erro.code === 22 || erro.name === "QuotaExceededError" || erro.name === "NS_ERROR_DOM_QUOTA_REACHED");
    throw new ErroArmazenamento(
      cheio
        ? "O armazenamento local está cheio. Exporte um backup e libere espaço para continuar salvando."
        : "Não foi possível salvar os dados neste dispositivo.",
      erro
    );
  }
}

/**
 * Testa se o localStorage está disponível e utilizável.
 * @returns {boolean}
 */
export function armazenamentoDisponivel() {
  try {
    const chaveTeste = `${PREFIXO}__teste__`;
    localStorage.setItem(chaveTeste, "1");
    localStorage.removeItem(chaveTeste);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------

/**
 * Lista todos os lançamentos, mais recentes primeiro.
 * @returns {object[]}
 */
export function listarLancamentos() {
  const lista = lerBruto(CHAVES.lancamentos, []);
  return [...lista].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

/**
 * Busca um lançamento pelo id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function obterLancamento(id) {
  return lerBruto(CHAVES.lancamentos, []).find((item) => item.id === id);
}

/**
 * Cria ou atualiza um lançamento. Se dados.id já existir, atualiza;
 * caso contrário, cria um novo.
 * @param {Partial<object>} dados
 * @returns {object} o lançamento salvo
 */
export function salvarLancamento(dados) {
  const lista = lerBruto(CHAVES.lancamentos, []);
  const indiceExistente = dados.id ? lista.findIndex((item) => item.id === dados.id) : -1;

  let salvo;
  if (indiceExistente >= 0) {
    salvo = criarLancamento({ ...lista[indiceExistente], ...dados, criadoEm: lista[indiceExistente].criadoEm });
    lista[indiceExistente] = salvo;
  } else {
    salvo = criarLancamento(dados);
    lista.push(salvo);
  }

  escreverBruto(CHAVES.lancamentos, lista);
  return salvo;
}

/**
 * Exclui um lançamento pelo id.
 * @param {string} id
 * @returns {boolean} true se algo foi removido
 */
export function excluirLancamento(id) {
  const lista = lerBruto(CHAVES.lancamentos, []);
  const nova = lista.filter((item) => item.id !== id);
  const removeu = nova.length !== lista.length;
  if (removeu) escreverBruto(CHAVES.lancamentos, nova);
  return removeu;
}

/**
 * Substitui toda a lista de lançamentos (usado por importação/restauração).
 * @param {object[]} lista
 */
export function substituirLancamentos(lista) {
  escreverBruto(CHAVES.lancamentos, lista);
}

// ---------------------------------------------------------
// Categorias
// ---------------------------------------------------------

/**
 * Lista categorias. Por padrão retorna todas; passe { apenasAtivas: true }
 * para filtrar, e/ou { tipo: "receita" | "despesa" }.
 * @param {{apenasAtivas?: boolean, tipo?: string}} opcoes
 * @returns {object[]}
 */
export function listarCategorias(opcoes = {}) {
  let lista = lerBruto(CHAVES.categorias, []);
  if (opcoes.apenasAtivas) lista = lista.filter((c) => c.ativa);
  if (opcoes.tipo) lista = lista.filter((c) => c.tipo === opcoes.tipo);
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Busca uma categoria pelo id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function obterCategoria(id) {
  return lerBruto(CHAVES.categorias, []).find((item) => item.id === id);
}

/**
 * Busca uma categoria pelo nome (case-insensitive).
 * @param {string} nome
 * @returns {object|undefined}
 */
export function obterCategoriaPorNome(nome) {
  const alvo = (nome || "").trim().toLowerCase();
  return lerBruto(CHAVES.categorias, []).find((item) => item.nome.toLowerCase() === alvo);
}

/**
 * Cria ou atualiza uma categoria.
 * @param {Partial<object>} dados
 * @returns {object}
 */
export function salvarCategoria(dados) {
  const lista = lerBruto(CHAVES.categorias, []);
  const indiceExistente = dados.id ? lista.findIndex((item) => item.id === dados.id) : -1;

  let salva;
  if (indiceExistente >= 0) {
    salva = criarCategoria({ ...lista[indiceExistente], ...dados });
    lista[indiceExistente] = salva;
  } else {
    salva = criarCategoria(dados);
    lista.push(salva);
  }

  escreverBruto(CHAVES.categorias, lista);
  return salva;
}

/**
 * Exclui uma categoria pelo id. Não verifica uso em lançamentos —
 * essa regra fica a cargo da página categorias.html (Fase 3).
 * @param {string} id
 * @returns {boolean}
 */
export function excluirCategoria(id) {
  const lista = lerBruto(CHAVES.categorias, []);
  const nova = lista.filter((item) => item.id !== id);
  const removeu = nova.length !== lista.length;
  if (removeu) escreverBruto(CHAVES.categorias, nova);
  return removeu;
}

/**
 * Substitui toda a lista de categorias (usado pelo seed inicial e importação).
 * @param {object[]} lista
 */
export function substituirCategorias(lista) {
  escreverBruto(CHAVES.categorias, lista);
}

// ---------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------

/**
 * Lista orçamentos, opcionalmente filtrando por competência.
 * @param {{competencia?: string}} opcoes
 * @returns {object[]}
 */
export function listarOrcamentos(opcoes = {}) {
  let lista = lerBruto(CHAVES.orcamentos, []);
  if (opcoes.competencia) lista = lista.filter((o) => o.competencia === opcoes.competencia);
  return lista;
}

/**
 * Cria ou atualiza um orçamento. Se já existir um orçamento para a
 * mesma competência + categoria, ele é atualizado (evita duplicidade).
 * @param {Partial<object>} dados
 * @returns {object}
 */
export function salvarOrcamento(dados) {
  const lista = lerBruto(CHAVES.orcamentos, []);
  let indiceExistente = dados.id ? lista.findIndex((item) => item.id === dados.id) : -1;
  if (indiceExistente < 0 && dados.competencia && dados.categoria) {
    indiceExistente = lista.findIndex(
      (item) => item.competencia === dados.competencia && item.categoria === dados.categoria
    );
  }

  let salvo;
  if (indiceExistente >= 0) {
    salvo = criarOrcamento({ ...lista[indiceExistente], ...dados, id: lista[indiceExistente].id });
    lista[indiceExistente] = salvo;
  } else {
    salvo = criarOrcamento(dados);
    lista.push(salvo);
  }

  escreverBruto(CHAVES.orcamentos, lista);
  return salvo;
}

/**
 * Exclui um orçamento pelo id.
 * @param {string} id
 * @returns {boolean}
 */
export function excluirOrcamento(id) {
  const lista = lerBruto(CHAVES.orcamentos, []);
  const nova = lista.filter((item) => item.id !== id);
  const removeu = nova.length !== lista.length;
  if (removeu) escreverBruto(CHAVES.orcamentos, nova);
  return removeu;
}

/**
 * Substitui toda a lista de orçamentos (usado por importação/restauração).
 * @param {object[]} lista
 */
export function substituirOrcamentos(lista) {
  escreverBruto(CHAVES.orcamentos, lista);
}

// ---------------------------------------------------------
// Formas de pagamento
// ---------------------------------------------------------

/**
 * Lista as formas de pagamento cadastradas.
 * @returns {string[]}
 */
export function listarFormasPagamento() {
  return lerBruto(CHAVES.formasPagamento, [...FORMAS_PAGAMENTO_PADRAO]);
}

/**
 * Substitui a lista de formas de pagamento.
 * @param {string[]} lista
 */
export function substituirFormasPagamento(lista) {
  escreverBruto(CHAVES.formasPagamento, lista);
}

/**
 * Adiciona uma forma de pagamento, se ainda não existir.
 * @param {string} nome
 * @returns {string[]} lista atualizada
 */
export function adicionarFormaPagamento(nome) {
  const lista = listarFormasPagamento();
  const normalizado = (nome || "").trim();
  if (normalizado && !lista.some((f) => f.toLowerCase() === normalizado.toLowerCase())) {
    lista.push(normalizado);
    substituirFormasPagamento(lista);
  }
  return lista;
}

// ---------------------------------------------------------
// Configuração geral
// ---------------------------------------------------------

/**
 * Retorna a configuração geral do app, mesclada com os padrões.
 * @returns {object}
 */
export function obterConfig() {
  return { ...CONFIG_PADRAO, ...lerBruto(CHAVES.config, {}) };
}

/**
 * Atualiza (merge) a configuração geral do app.
 * @param {Partial<object>} dados
 * @returns {object}
 */
export function salvarConfig(dados) {
  const atual = obterConfig();
  const nova = { ...atual, ...dados };
  escreverBruto(CHAVES.config, nova);
  return nova;
}

// ---------------------------------------------------------
// Utilitários gerais
// ---------------------------------------------------------

/**
 * Exporta todos os dados do app em um único objeto (usado no backup JSON).
 * @returns {object}
 */
export function exportarTudo() {
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    lancamentos: lerBruto(CHAVES.lancamentos, []),
    categorias: lerBruto(CHAVES.categorias, []),
    orcamentos: lerBruto(CHAVES.orcamentos, []),
    formasPagamento: listarFormasPagamento(),
    config: obterConfig(),
  };
}

/**
 * Restaura todos os dados do app a partir de um objeto de backup.
 * @param {object} backup
 */
export function restaurarTudo(backup) {
  if (!backup || typeof backup !== "object") {
    throw new Error("Backup inválido.");
  }
  if (Array.isArray(backup.lancamentos)) escreverBruto(CHAVES.lancamentos, backup.lancamentos);
  if (Array.isArray(backup.categorias)) escreverBruto(CHAVES.categorias, backup.categorias);
  if (Array.isArray(backup.orcamentos)) escreverBruto(CHAVES.orcamentos, backup.orcamentos);
  if (Array.isArray(backup.formasPagamento)) escreverBruto(CHAVES.formasPagamento, backup.formasPagamento);
  if (backup.config && typeof backup.config === "object") escreverBruto(CHAVES.config, backup.config);
}

/**
 * Remove todos os dados do app do localStorage (usado em "resetar dados").
 */
export function limparTudo() {
  Object.values(CHAVES).forEach((chave) => localStorage.removeItem(chave));
}

/**
 * Verifica se já existe alguma categoria cadastrada (usado pelo seed
 * para saber se é a primeira execução).
 * @returns {boolean}
 */
export function possuiCategorias() {
  return lerBruto(CHAVES.categorias, []).length > 0;
}

export { CHAVES, gerarId };
