// =================================================================
// ARQUIVO: src/services/configuracoesService.js
// DESCRICAO: Configuracoes globais (target de eficiencia) no PocketBase
// =================================================================
const db = require('../db');

const CHAVE_TARGET = 'target_eficiencia';

const obterTarget = async () => {
  const registro = await db.um('configuracoes', db.f('chave = {:chave}', { chave: CHAVE_TARGET }));

  // Sem registro, o padrao continua sendo 3 dias (igual ao Supabase).
  if (!registro || registro.valor === '' || registro.valor === null) return 3;

  const valor = Number(registro.valor);
  return isNaN(valor) ? 3 : valor;
};

// Equivalente ao .upsert(): atualiza se a chave existir, senao cria.
const atualizarTarget = async (novoValor) => {
  const registro = await db.um('configuracoes', db.f('chave = {:chave}', { chave: CHAVE_TARGET }));

  if (registro) {
    await db.atualizar('configuracoes', registro.id, { valor: String(novoValor) });
  } else {
    await db.criar('configuracoes', { chave: CHAVE_TARGET, valor: String(novoValor) });
  }

  return true;
};

module.exports = { obterTarget, atualizarTarget };
