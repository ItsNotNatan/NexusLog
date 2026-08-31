// =================================================================
// ARQUIVO: src/services/filiaisService.js
// DESCRICAO: Filiais no PocketBase
//
// No Postgres a filial era identificada pelo proprio id ('BR02'). O
// PocketBase gera o id dele, entao o codigo da filial mora no campo
// "codigo" e este service traduz nos dois sentidos. Resultado: a API
// continua entregando { id: 'BR02', ... } e o front nao muda nada.
// =================================================================
const db = require('../db');

// Registro do PocketBase -> formato que o front sempre conheceu.
const paraFront = (r) => ({
  id: r.codigo,
  nome: r.nome,
  cidade: db.txt(r.cidade),
  created_at: db.dt(r.created_at),
});

// Acha a filial pelo codigo ('BR02'); devolve o registro cru do PocketBase.
const acharPorCodigo = async (codigo) =>
  db.um('filiais', db.f('codigo = {:codigo}', { codigo: String(codigo) }));

const listarFiliais = async () => {
  const registros = await db.listar('filiais', { sort: 'codigo' });
  return registros.map(paraFront);
};

const criarFilial = async (dadosFilial) => {
  const codigo = String(dadosFilial.id || dadosFilial.codigo || '').trim();
  if (!codigo) throw new Error('O codigo da filial e obrigatorio.');

  // O indice unico do PocketBase ja barraria, mas assim o erro fica claro.
  if (await acharPorCodigo(codigo)) {
    const erro = new Error('Ja existe uma filial com este Codigo.');
    erro.code = '23505'; // mesmo codigo do Postgres que o controller ja trata
    throw erro;
  }

  await db.criar('filiais', {
    codigo,
    nome: dadosFilial.nome || codigo,
    cidade: dadosFilial.cidade || '',
  });

  return true;
};

const deletarFilial = async (codigoFilial) => {
  const filial = await acharPorCodigo(codigoFilial);
  if (!filial) throw new Error('Filial nao encontrada.');

  await db.remover('filiais', filial.id);
  return true;
};

const atualizarFilial = async (codigoFilial, dadosAtualizados) => {
  const filial = await acharPorCodigo(codigoFilial);
  if (!filial) throw new Error('Filial nao encontrada.');

  const atualizacao = {};
  if (dadosAtualizados.nome !== undefined) atualizacao.nome = dadosAtualizados.nome;
  if (dadosAtualizados.cidade !== undefined) atualizacao.cidade = dadosAtualizados.cidade;

  // Trocar o codigo renomeia a filial inteira: so muda se veio diferente.
  const novoCodigo = dadosAtualizados.id || dadosAtualizados.codigo;
  if (novoCodigo && String(novoCodigo) !== filial.codigo) {
    if (await acharPorCodigo(novoCodigo)) {
      const erro = new Error('Ja existe uma filial com este Codigo.');
      erro.code = '23505';
      throw erro;
    }
    atualizacao.codigo = String(novoCodigo);
  }

  if (Object.keys(atualizacao).length > 0) {
    await db.atualizar('filiais', filial.id, atualizacao);
  }

  return true;
};

module.exports = { listarFiliais, criarFilial, deletarFilial, atualizarFilial, acharPorCodigo };
