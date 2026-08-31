// =================================================================
// ARQUIVO: src/services/estoqueService.js
// DESCRICAO: Estoque fisico no PocketBase
// =================================================================
const db = require('../db');

// Tipos de solicitacao que "seguram" material enquanto estao pendentes.
const TIPOS_QUE_RESERVAM = ['Material', 'Transferencia WBS', 'Transfer. WBS', 'Crossdocking'];

// Datas do estoque que precisam voltar como ISO (ou null) para o front.
const paraFront = (r) => ({
  ...r,
  data_necessidade: db.dt(r.data_necessidade),
  created_at: db.dt(r.created_at),
  updated_at: db.dt(r.updated_at),
});

const listarEstoqueGeral = async (filial = '', incluirZerados = false) => {
  const condicoes = [];
  const parametros = {};

  if (!incluirZerados) condicoes.push('quantidade_disponivel > 0');

  if (filial && filial !== 'TODOS') {
    condicoes.push('filial_id = {:filial}');
    parametros.filial = String(filial);
  }

  const itens = await db.listar('estoque', {
    filter: condicoes.length ? db.f(condicoes.join(' && '), parametros) : '',
    sort: 'part_number',
  });

  // ---- Itens reservados: o que ja foi pedido mas ainda nao saiu ----------
  // O Supabase resolvia com um join (solicitacoes!inner). No PocketBase a
  // busca e' em duas etapas: primeiro as solicitacoes pendentes de saida,
  // depois os itens que pertencem a elas.
  const mapaReservas = {};

  try {
    const parametrosTipos = { status: 'Pendente' };
    const expressaoTipos = TIPOS_QUE_RESERVAM
      .map((tipo, i) => { parametrosTipos[`t${i}`] = tipo; return `tipo = {:t${i}}`; })
      .join(' || ');

    const pendentes = await db.listar('solicitacoes', {
      filter: db.f(`status = {:status} && (${expressaoTipos})`, parametrosTipos),
      fields: 'id',
    });

    if (pendentes.length > 0) {
      const itensPendentes = await db.listarPorIds(
        'solicitacoes_itens',
        'solicitacao_id',
        pendentes.map((s) => s.id),
        { fields: 'estoque_id,quantidade_solicitada' }
      );

      for (const item of itensPendentes) {
        if (!item.estoque_id) continue;
        mapaReservas[item.estoque_id] =
          (mapaReservas[item.estoque_id] || 0) + Number(item.quantidade_solicitada || 0);
      }
    }
  } catch (erro) {
    // Igual ao comportamento antigo: sem as reservas o estoque ainda e' util.
    console.error('[Erro ao buscar reservas]:', erro.message);
  }

  return itens.map((item) => ({
    ...paraFront(item),
    quantidade_reservada: mapaReservas[item.id] || 0,
  }));
};

// Atualiza o item e regista cada campo alterado no historico.
const atualizarItemEstoque = async (id, dadosAtualizados) => {
  const usuarioEditor = dadosAtualizados.usuario_editor || 'Sistema';
  delete dadosAtualizados.usuario_editor;

  const itemAntigo = await db.porId('estoque', id);
  if (!itemAntigo) throw new Error('Item de estoque nao encontrado.');

  const historico = [];
  for (const campo in dadosAtualizados) {
    const valorVelho = String(itemAntigo[campo] ?? '');
    const valorNovo = String(dadosAtualizados[campo] ?? '');

    if (valorVelho !== valorNovo) {
      historico.push({
        estoque_id: id,
        usuario: usuarioEditor,
        campo_alterado: campo,
        valor_antigo: valorVelho,
        valor_novo: valorNovo,
      });
    }
  }

  await db.atualizar('estoque', id, dadosAtualizados);

  for (const registro of historico) {
    await db.criar('historico_edicoes', registro);
  }

  return true;
};

module.exports = { listarEstoqueGeral, atualizarItemEstoque };
