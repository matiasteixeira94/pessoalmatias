// ===========================================================
// IMPORTAR-EXPORTAR.JS — importação/exportação de planilha
// (SheetJS/XLSX, carregado via CDN em configuracoes.html, onde
// fica disponível como o global `XLSX`) e de backup completo em
// JSON. Funções de leitura/mapeamento são puras onde possível;
// as de exportação disparam o download diretamente.
// ===========================================================

import { criarLancamento, validarLancamento } from "./modelos.js";
import { analisarValorMonetario, formatarNumeroMoeda, formatarData } from "./formatadores.js";

export const NOME_ABA_LANCAMENTOS = "Lançamentos";

export const COLUNAS_PLANILHA = [
  "Data",
  "Tipo",
  "Categoria",
  "Subcategoria",
  "Descrição",
  "Forma de Pagamento",
  "Valor",
  "Status",
  "Recorrente",
  "Observações",
];

function normalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Converte o valor de uma célula de data (Date, número de série do
 * Excel ou texto DD/MM/AAAA ou AAAA-MM-DD) para ISO AAAA-MM-DD.
 * @param {Date|number|string} valor
 * @returns {string|null} null se não conseguir interpretar
 */
function interpretarData(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  const texto = String(valor ?? "").trim();
  if (!texto) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const matchBr = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchBr) {
    const [, dia, mes, ano] = matchBr;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  // Fallback: número de série do Excel (dias desde 1899-12-30), caso a
  // planilha não tenha vindo com datas já convertidas para Date.
  const numero = Number(texto);
  if (Number.isFinite(numero) && numero > 0) {
    const base = new Date(Date.UTC(1899, 11, 30));
    base.setUTCDate(base.getUTCDate() + Math.floor(numero));
    return interpretarData(new Date(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  }

  return null;
}

function interpretarTipo(valor) {
  const texto = normalizarTexto(valor);
  if (texto.startsWith("receita")) return "receita";
  if (texto.startsWith("despesa")) return "despesa";
  return null;
}

function interpretarStatus(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return "pago";
  if (texto.startsWith("pago")) return "pago";
  if (texto.startsWith("pendente")) return "pendente";
  if (texto.startsWith("agendado")) return "agendado";
  return null;
}

function interpretarBooleano(valor) {
  const texto = normalizarTexto(valor);
  return ["sim", "true", "1", "x", "verdadeiro"].includes(texto);
}

function interpretarValor(valor) {
  if (typeof valor === "number") return valor;
  return analisarValorMonetario(valor);
}

/**
 * Lê um arquivo de planilha (.xlsx/.xls/.csv) e devolve as linhas da
 * aba "Lançamentos" (ou a primeira aba, se essa não existir) como
 * array de objetos, usando a primeira linha como cabeçalho.
 * @param {File} arquivo
 * @returns {Promise<object[]>}
 */
export function lerPlanilha(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onerror = () => rejeitar(new Error("Não foi possível ler o arquivo."));
    leitor.onload = (evento) => {
      try {
        const dados = new Uint8Array(evento.target.result);
        const pasta = XLSX.read(dados, { type: "array", cellDates: true });
        const nomeAba = pasta.SheetNames.includes(NOME_ABA_LANCAMENTOS) ? NOME_ABA_LANCAMENTOS : pasta.SheetNames[0];
        const aba = pasta.Sheets[nomeAba];
        const linhas = XLSX.utils.sheet_to_json(aba, { defval: "" });
        resolver(linhas);
      } catch (erro) {
        rejeitar(new Error("Não foi possível interpretar a planilha. Verifique se o arquivo não está corrompido."));
      }
    };
    leitor.readAsArrayBuffer(arquivo);
  });
}

/**
 * Converte uma linha crua da planilha (objeto com as chaves de
 * COLUNAS_PLANILHA) num Lancamento, coletando erros de validação.
 * Função pura — não acessa localStorage.
 * @param {object} linha
 * @returns {{lancamento: object|null, erros: string[]}}
 */
export function linhaParaLancamento(linha) {
  const erros = [];

  const data = interpretarData(linha["Data"]);
  if (!data) erros.push("Data inválida ou vazia.");

  const tipo = interpretarTipo(linha["Tipo"]);
  if (!tipo) erros.push('Tipo deve ser "Receita" ou "Despesa".');

  const status = interpretarStatus(linha["Status"]);
  if (status === null) erros.push('Status deve ser "Pago", "Pendente" ou "Agendado".');

  const categoria = String(linha["Categoria"] ?? "").trim();
  if (!categoria) erros.push("Categoria vazia.");

  const descricao = String(linha["Descrição"] ?? "").trim();
  if (!descricao) erros.push("Descrição vazia.");

  const valor = interpretarValor(linha["Valor"]);
  if (!Number.isFinite(valor) || valor <= 0) erros.push("Valor deve ser maior que zero.");

  if (erros.length > 0) return { lancamento: null, erros };

  const candidato = criarLancamento({
    data,
    tipo,
    categoria,
    subcategoria: String(linha["Subcategoria"] ?? "").trim(),
    descricao,
    formaPagamento: String(linha["Forma de Pagamento"] ?? "").trim(),
    valor,
    status: status || "pago",
    recorrente: interpretarBooleano(linha["Recorrente"]),
    observacoes: String(linha["Observações"] ?? "").trim(),
  });

  const { valido, erros: errosModelo } = validarLancamento(candidato);
  if (!valido) return { lancamento: null, erros: Object.values(errosModelo) };

  return { lancamento: candidato, erros: [] };
}

/**
 * Monta a chave de duplicidade (data + valor + descrição) de um
 * lançamento, usada para detectar linhas repetidas na importação.
 * @param {object} lancamento
 * @returns {string}
 */
function chaveDuplicidade(lancamento) {
  return `${lancamento.data}|${lancamento.valor.toFixed(2)}|${lancamento.descricao.trim().toLowerCase()}`;
}

/**
 * Processa as linhas cruas de uma planilha, separando em válidas,
 * inválidas (com o motivo) e duplicadas (válidas, mas que já existem
 * em `lancamentosExistentes` pela chave data+valor+descrição). Função
 * pura, para alimentar a tela de pré-visualização antes de confirmar.
 * @param {object[]} linhas
 * @param {object[]} lancamentosExistentes
 * @returns {{
 *   validos: {linha:number, lancamento:object}[],
 *   invalidos: {linha:number, erros:string[]}[],
 *   duplicados: {linha:number, lancamento:object}[]
 * }}
 */
export function prepararImportacao(linhas, lancamentosExistentes = []) {
  const chavesExistentes = new Set(lancamentosExistentes.map(chaveDuplicidade));

  const validos = [];
  const invalidos = [];
  const duplicados = [];

  linhas.forEach((linha, indice) => {
    const numeroLinha = indice + 2; // +1 pelo índice 0, +1 pela linha de cabeçalho
    const { lancamento, erros } = linhaParaLancamento(linha);

    if (!lancamento) {
      invalidos.push({ linha: numeroLinha, erros });
      return;
    }

    if (chavesExistentes.has(chaveDuplicidade(lancamento))) {
      duplicados.push({ linha: numeroLinha, lancamento });
    } else {
      validos.push({ linha: numeroLinha, lancamento });
    }
  });

  return { validos, invalidos, duplicados };
}

/**
 * Gera e baixa uma planilha .xlsx no layout esperado pelo importador,
 * com os lançamentos informados (ou só o cabeçalho + uma linha de
 * exemplo, se nenhum lançamento for passado — usado como modelo).
 * @param {object[]} lancamentos
 * @param {string} nomeArquivo
 */
export function exportarLancamentosParaPlanilha(lancamentos, nomeArquivo = "lancamentos.xlsx") {
  const linhas =
    lancamentos.length > 0
      ? lancamentos.map((l) => ({
          Data: formatarData(l.data),
          Tipo: l.tipo === "receita" ? "Receita" : "Despesa",
          Categoria: l.categoria,
          Subcategoria: l.subcategoria,
          Descrição: l.descricao,
          "Forma de Pagamento": l.formaPagamento,
          Valor: formatarNumeroMoeda(l.valor),
          Status: l.status === "pago" ? "Pago" : l.status === "pendente" ? "Pendente" : "Agendado",
          Recorrente: l.recorrente ? "Sim" : "Não",
          Observações: l.observacoes,
        }))
      : [
          {
            Data: "15/08/2026",
            Tipo: "Despesa",
            Categoria: "Alimentação",
            Subcategoria: "Supermercado",
            Descrição: "Exemplo — compras do mês",
            "Forma de Pagamento": "Pix",
            Valor: "150,00",
            Status: "Pago",
            Recorrente: "Não",
            Observações: "",
          },
        ];

  const planilha = XLSX.utils.json_to_sheet(linhas, { header: COLUNAS_PLANILHA });
  planilha["!cols"] = COLUNAS_PLANILHA.map((c) => ({ wch: Math.max(12, c.length + 2) }));

  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, planilha, NOME_ABA_LANCAMENTOS);
  XLSX.writeFile(pasta, nomeArquivo);
}

/**
 * Baixa a planilha modelo (só cabeçalho + uma linha de exemplo), para
 * o usuário preencher e depois importar.
 */
export function baixarModeloPlanilha() {
  exportarLancamentosParaPlanilha([], "modelo-lancamentos.xlsx");
}

/**
 * Dispara o download de um objeto de backup como arquivo .json.
 * @param {object} backup
 * @param {string} nomeArquivo
 */
export function exportarBackupJson(backup, nomeArquivo) {
  const conteudo = JSON.stringify(backup, null, 2);
  const blob = new Blob([conteudo], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo || `backup-gestao-financeira-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Lê um arquivo .json de backup e devolve o objeto já parseado.
 * @param {File} arquivo
 * @returns {Promise<object>}
 */
export function lerBackupJson(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onerror = () => rejeitar(new Error("Não foi possível ler o arquivo."));
    leitor.onload = (evento) => {
      try {
        resolver(JSON.parse(evento.target.result));
      } catch (erro) {
        rejeitar(new Error("Arquivo de backup inválido (JSON malformado)."));
      }
    };
    leitor.readAsText(arquivo, "utf-8");
  });
}
