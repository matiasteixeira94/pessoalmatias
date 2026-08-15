// ===========================================================
// SEED.JS — popula categorias padrão na primeira execução
// ===========================================================

import { possuiCategorias, substituirCategorias } from "./db.js";
import { criarCategoria } from "./modelos.js";

const CAMINHO_CATEGORIAS_PADRAO = "./dados/categorias-padrao.json";

/**
 * Se ainda não houver categorias cadastradas, carrega
 * dados/categorias-padrao.json e grava como categorias iniciais.
 * Seguro para chamar em toda inicialização do app.
 * @returns {Promise<void>}
 */
export async function semearDadosIniciais() {
  if (possuiCategorias()) return;

  try {
    const resposta = await fetch(CAMINHO_CATEGORIAS_PADRAO);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const categoriasPadrao = await resposta.json();
    const categorias = categoriasPadrao.map((dados) => criarCategoria(dados));
    substituirCategorias(categorias);
  } catch (erro) {
    console.error("[seed] Não foi possível carregar categorias padrão:", erro);
  }
}
