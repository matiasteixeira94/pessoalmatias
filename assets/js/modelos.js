// ===========================================================
// MODELOS.JS — schemas e validações de Lancamento, Categoria e
// Orcamento. Nenhuma leitura/escrita de armazenamento aqui —
// isso é responsabilidade de db.js.
// ===========================================================

import { derivarCompetencia } from "./formatadores.js";

export const TIPOS_LANCAMENTO = ["receita", "despesa"];
export const STATUS_LANCAMENTO = ["pago", "pendente", "agendado"];

/**
 * Gera um identificador único (UUID v4 simplificado).
 * Usa crypto.randomUUID quando disponível.
 * @returns {string}
 */
export function gerarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Cria um objeto Lancamento com valores padrão, mesclando os
 * dados informados. Não valida — use validarLancamento() antes
 * de persistir.
 * @param {Partial<object>} dados
 * @returns {object}
 */
export function criarLancamento(dados = {}) {
  const agora = new Date().toISOString();
  const data = dados.data || "";
  return {
    id: dados.id || gerarId(),
    data,
    competencia: data ? derivarCompetencia(data) : "",
    tipo: dados.tipo || "despesa",
    categoria: dados.categoria || "",
    subcategoria: dados.subcategoria || "",
    descricao: dados.descricao || "",
    formaPagamento: dados.formaPagamento || "",
    valor: Math.abs(Number(dados.valor) || 0),
    status: dados.status || "pago",
    recorrente: Boolean(dados.recorrente),
    observacoes: dados.observacoes || "",
    // Preenchido apenas quando o lançamento foi gerado automaticamente a
    // partir de uma despesa fixa (ver criarDespesaFixa / db.gerarLancamentosDoMes).
    despesaFixaId: dados.despesaFixaId || null,
    criadoEm: dados.criadoEm || agora,
    atualizadoEm: agora,
  };
}

/**
 * Valida um Lancamento. Retorna { valido, erros } onde erros é um
 * mapa campo -> mensagem.
 * @param {object} lancamento
 * @returns {{ valido: boolean, erros: Record<string,string> }}
 */
export function validarLancamento(lancamento) {
  const erros = {};

  if (!lancamento.data) {
    erros.data = "Informe a data do lançamento.";
  } else {
    const dataObj = new Date(`${lancamento.data}T00:00:00`);
    const anoMin = 2000;
    const anoMax = new Date().getFullYear() + 5;
    if (Number.isNaN(dataObj.getTime())) {
      erros.data = "Data inválida.";
    } else if (dataObj.getFullYear() < anoMin || dataObj.getFullYear() > anoMax) {
      erros.data = "Data fora de um intervalo razoável.";
    }
  }

  if (!TIPOS_LANCAMENTO.includes(lancamento.tipo)) {
    erros.tipo = "Tipo deve ser receita ou despesa.";
  }

  if (!lancamento.categoria) {
    erros.categoria = "Selecione uma categoria.";
  }

  if (!lancamento.descricao || !lancamento.descricao.trim()) {
    erros.descricao = "Informe uma descrição.";
  }

  const valor = Number(lancamento.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    erros.valor = "O valor deve ser maior que zero.";
  }

  if (!STATUS_LANCAMENTO.includes(lancamento.status)) {
    erros.status = "Status inválido.";
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

/**
 * Cria um objeto Categoria com valores padrão.
 * @param {Partial<object>} dados
 * @returns {object}
 */
export function criarCategoria(dados = {}) {
  return {
    id: dados.id || gerarId(),
    nome: dados.nome || "",
    tipo: dados.tipo || "despesa",
    cor: dados.cor || "#2c82b5",
    icone: dados.icone || "🏷️",
    ativa: dados.ativa !== undefined ? Boolean(dados.ativa) : true,
  };
}

/**
 * Valida uma Categoria.
 * @param {object} categoria
 * @returns {{ valido: boolean, erros: Record<string,string> }}
 */
export function validarCategoria(categoria) {
  const erros = {};

  if (!categoria.nome || !categoria.nome.trim()) {
    erros.nome = "Informe o nome da categoria.";
  }

  if (!TIPOS_LANCAMENTO.includes(categoria.tipo)) {
    erros.tipo = "Tipo deve ser receita ou despesa.";
  }

  if (!categoria.cor || !/^#[0-9a-fA-F]{6}$/.test(categoria.cor)) {
    erros.cor = "Cor inválida.";
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

/**
 * Cria um objeto DespesaFixa (modelo/template de gasto recorrente) com
 * valores padrão. Toda competência que ainda não tiver um lançamento
 * gerado a partir dela recebe um automaticamente — ver
 * db.gerarLancamentosDoMes().
 * @param {Partial<object>} dados
 * @returns {object}
 */
export function criarDespesaFixa(dados = {}) {
  return {
    id: dados.id || gerarId(),
    descricao: dados.descricao || "",
    categoria: dados.categoria || "",
    subcategoria: dados.subcategoria || "",
    formaPagamento: dados.formaPagamento || "",
    valor: Math.abs(Number(dados.valor) || 0),
    // Dia do mês em que o gasto costuma vencer (1-31). Em meses mais
    // curtos, é ajustado para o último dia disponível.
    diaVencimento: Math.min(Math.max(parseInt(dados.diaVencimento, 10) || 1, 1), 31),
    ativa: dados.ativa !== undefined ? Boolean(dados.ativa) : true,
  };
}

/**
 * Valida uma DespesaFixa.
 * @param {object} despesaFixa
 * @returns {{ valido: boolean, erros: Record<string,string> }}
 */
export function validarDespesaFixa(despesaFixa) {
  const erros = {};

  if (!despesaFixa.descricao || !despesaFixa.descricao.trim()) {
    erros.descricao = "Informe uma descrição.";
  }

  if (!despesaFixa.categoria) {
    erros.categoria = "Selecione uma categoria.";
  }

  const valor = Number(despesaFixa.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    erros.valor = "O valor deve ser maior que zero.";
  }

  const dia = Number(despesaFixa.diaVencimento);
  if (!Number.isFinite(dia) || dia < 1 || dia > 31) {
    erros.diaVencimento = "Informe um dia entre 1 e 31.";
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

/**
 * Cria um objeto Orcamento com valores padrão.
 * @param {Partial<object>} dados
 * @returns {object}
 */
export function criarOrcamento(dados = {}) {
  return {
    id: dados.id || gerarId(),
    competencia: dados.competencia || "",
    categoria: dados.categoria || "",
    valorPlanejado: Math.abs(Number(dados.valorPlanejado) || 0),
  };
}

/**
 * Valida um Orcamento.
 * @param {object} orcamento
 * @returns {{ valido: boolean, erros: Record<string,string> }}
 */
export function validarOrcamento(orcamento) {
  const erros = {};

  if (!orcamento.competencia || !/^\d{4}-\d{2}$/.test(orcamento.competencia)) {
    erros.competencia = "Competência inválida.";
  }

  if (!orcamento.categoria) {
    erros.categoria = "Selecione uma categoria.";
  }

  const valor = Number(orcamento.valorPlanejado);
  if (!Number.isFinite(valor) || valor < 0) {
    erros.valorPlanejado = "O valor planejado deve ser zero ou maior.";
  }

  return { valido: Object.keys(erros).length === 0, erros };
}
