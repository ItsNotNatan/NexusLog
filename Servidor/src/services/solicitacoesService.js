// =================================================================
// ARQUIVO: src/services/solicitacoesService.js
// DESCRICAO: Logica de negocio das solicitacoes, agora sobre o PocketBase
//
// O comportamento e' o mesmo da versao Supabase. O que mudou foi COMO os
// dados sao lidos: o PostgREST montava os "joins" na propria consulta
// (solicitacoes!inner(...)), e aqui a busca e' feita em etapas e cruzada
// em memoria. Cada trecho assim esta comentado no lugar.
// =================================================================
const db = require('../db');

const limparIdEstoque = (id) => {
  if (!id) return null;
  const idString = String(id);
  if (idString.startsWith('manual-')) return null;
  return idString;
};

// Campos de data das solicitacoes que voltam para o front como ISO (ou null).
const solicitacaoParaFront = (r) => ({
  ...r,
  data_necessidade: db.dt(r.data_necessidade),
  data_entrega: db.dt(r.data_entrega),
  data_aprovacao_pl: db.dt(r.data_aprovacao_pl),
  prazo_finalizacao_pl: db.dt(r.prazo_finalizacao_pl),
  created_at: db.dt(r.created_at),
  updated_at: db.dt(r.updated_at),
});

// Gera um PS unico. O indice unico do banco e' a garantia final; se dois
// pedidos sortearem o mesmo numero no mesmo segundo, tentamos de novo.
const gerarPS = () => {
  const dataAtual = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const numeroAleatorio = Math.floor(1000 + Math.random() * 9000);
  return `PS-${dataAtual}-${numeroAleatorio}`;
};

const salvarNoBanco = async (dadosPrincipais, itensArray, anexosArray = [], numeroDaNota = null) => {
  if (!dadosPrincipais.filial_origem_id || dadosPrincipais.filial_origem_id === 'TODOS') {
    throw new Error('Acao bloqueada: Por favor, selecione uma filial fisica no topo da pagina.');
  }

  let solicitacaoCriada = null;
  let psGerado = null;

  for (let tentativa = 0; tentativa < 5 && !solicitacaoCriada; tentativa++) {
    psGerado = gerarPS();
    console.log(`💾 Iniciando gravacao da solicitacao: ${psGerado}`);

    try {
      solicitacaoCriada = await db.criar('solicitacoes', {
        ps: psGerado,
        pl: dadosPrincipais.pl || '',
        nome_solicitante: dadosPrincipais.nome_solicitante || '',
        tipo: dadosPrincipais.tipo,
        filial_origem_id: dadosPrincipais.filial_origem_id,
        destino: dadosPrincipais.destino || '',
        wbs_origem: dadosPrincipais.wbs_origem || '',
        wbs_destino: dadosPrincipais.wbs_destino || '',
        data_necessidade: db.paraData(dadosPrincipais.data_necessidade),
        observacoes: dadosPrincipais.observacoes || '',
        entrega_urgente: dadosPrincipais.entrega_urgente || false,
        status: dadosPrincipais.status || 'Pendente',
      });
    } catch (erro) {
      // 400 aqui costuma ser o indice unico do PS; qualquer outro erro sobe.
      const ehPsRepetido = erro && erro.status === 400 && tentativa < 4;
      if (!ehPsRepetido) throw erro;
      console.warn(`⚠️  PS ${psGerado} ja existia, sorteando outro...`);
    }
  }

  if (!solicitacaoCriada) throw new Error('Nao foi possivel gerar um numero de PS unico.');

  const idGerado = solicitacaoCriada.id;

  if (itensArray && itensArray.length > 0) {
    await db.criarVarios(
      'solicitacoes_itens',
      itensArray.map((item) => ({ ...item, solicitacao_id: idGerado }))
    );
  }

  if (anexosArray && anexosArray.length > 0) {
    await db.criarVarios(
      'anexos',
      anexosArray.map((anexo) => ({
        solicitacao_id: idGerado,
        nome_arquivo: anexo.nome_arquivo,
        url_arquivo: anexo.url_arquivo,
        origem: anexo.origem || 'cliente',
      }))
    );
  }

  if (numeroDaNota) {
    await db.criar('notas_fiscais', { solicitacao_id: idGerado, numero_nf: String(numeroDaNota) });
  }

  return { id: idGerado, ps: psGerado };
};

const listarSolicitacoes = async (page = 1, limit = 10, busca = '', tipo = '', filial = '') => {
  const condicoes = [];
  const parametros = {};

  if (tipo && tipo !== 'Todos') {
    condicoes.push('tipo = {:tipo}');
    parametros.tipo = tipo;
  }

  if (filial && filial !== 'TODOS') {
    condicoes.push('filial_origem_id = {:filial}');
    parametros.filial = String(filial);
  }

  if (busca) {
    // O "~" do PocketBase equivale ao ILIKE %valor% do Postgres.
    condicoes.push('(ps ~ {:busca} || nome_solicitante ~ {:busca} || wbs_destino ~ {:busca} || wbs_origem ~ {:busca})');
    parametros.busca = busca;
  }

  const resultado = await db.pagina('solicitacoes', page, limit, {
    filter: condicoes.length ? db.f(condicoes.join(' && '), parametros) : '',
    sort: '-created_at',
  });

  const solicitacoes = resultado.items;
  const ids = solicitacoes.map((s) => s.id);

  // ---- O que o PostgREST trazia junto no select, buscado em bloco --------
  // Uma consulta por tabela relacionada (e nao uma por solicitacao).
  const [itens, anexos, packingLists, notasFiscais] = await Promise.all([
    db.listarPorIds('solicitacoes_itens', 'solicitacao_id', ids),
    db.listarPorIds('anexos', 'solicitacao_id', ids),
    db.listarPorIds('packing_lists', 'solicitacao_id', ids),
    db.listarPorIds('notas_fiscais', 'solicitacao_id', ids),
  ]);

  const agrupar = (lista) => {
    const mapa = {};
    for (const registro of lista) {
      (mapa[registro.solicitacao_id] = mapa[registro.solicitacao_id] || []).push(registro);
    }
    return mapa;
  };

  const itensPorSol = agrupar(itens);
  const anexosPorSol = agrupar(anexos);
  const plPorSol = agrupar(packingLists);
  const nfPorSol = agrupar(notasFiscais);

  const dadosFormatados = solicitacoes.map((registro) => {
    const sol = solicitacaoParaFront(registro);

    const listaPL = plPorSol[sol.id] || [];
    const listaNF = nfPorSol[sol.id] || [];
    const numeroPL = listaPL.length > 0 ? listaPL[0].numero_pl : null;

    const plFinal = sol.pl || (numeroPL ? `PL #${numeroPL}` : null);
    const dataAprovacaoValida = sol.data_aprovacao_pl || (sol.status !== 'Pendente' ? sol.updated_at : null);

    return {
      id: sol.id,
      ps: sol.ps,
      tipo: sol.tipo,
      nfCrossdocking: listaNF.length > 0 ? listaNF[0].numero_nf : null,
      solicitante: sol.nome_solicitante || 'Não informado',
      wbs: sol.tipo === 'Transferencia WBS' ? `${sol.wbs_origem} ➔ ${sol.wbs_destino}` : sol.wbs_destino || '—',
      pl: plFinal,
      filial: sol.filial_origem_id || '-',
      dataSolicitacao:
        new Date(sol.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' +
        new Date(sol.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dataCriacaoISO: sol.created_at,
      dataAprovacaoPL: dataAprovacaoValida,
      prazoFinalizacao: sol.prazo_finalizacao_pl,
      criacaoPl: dataAprovacaoValida
        ? new Date(dataAprovacaoValida).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
          ' ' +
          new Date(dataAprovacaoValida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : null,
      dataFinalizacaoISO: sol.status === 'Concluído' && sol.updated_at ? sol.updated_at : null,

      dataEntrega: sol.data_entrega
        ? new Date(sol.data_entrega)
            .toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
            .replace(',', ' às')
        : sol.status === 'Concluído' ? 'Disponível' : null,

      status: sol.status,
      observacoes: db.txt(sol.observacoes),
      entregaUrgente: sol.entrega_urgente,
      anexos: anexosPorSol[sol.id] || [],
      itens: itensPorSol[sol.id] || [],
    };
  });

  return { dados: dadosFormatados, total: resultado.totalItems || 0 };
};

// ===================== CRIACAO POR TIPO DE PEDIDO =====================

const criarMaterial = async (solicitante, itens, anexos) => {
  const dados = {
    tipo: 'Material',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    destino: solicitante.destino,
    data_necessidade: solicitante.dataNecessidade || null,
    observacoes: solicitante.observacoes,
    entrega_urgente: solicitante.entregaUrgente || false,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = itens.map((i) => ({
    estoque_id: limparIdEstoque(i.estoque_id || i.id),
    desenho_sap_manual: i.desenhoSAP || null,
    part_number_manual: i.numPecaFabricante || null,
    descricao_manual: i.materialDescription || 'Sem descrição',
    quantidade_solicitada: Math.max(1, i.qtdSelecionada || 1),
    unidade_medida_manual: i.unidadeMedida || 'Unid',
    fornecedor: i.fornecedor || null,
    referencia: i.referencia || null,
    wbs_element: i.wbs || null,
    alocacao: i.alocacao || null,
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

const criarTransferencia = async (solicitante, itens, anexos) => {
  const wbsOrig = itens && itens.length > 0 ? itens[0].wbsOrigem : null;
  const dados = {
    tipo: 'Transferencia WBS',
    nome_solicitante: solicitante.nome,
    wbs_origem: wbsOrig,
    wbs_destino: solicitante.wbs,
    observacoes: solicitante.observacoes,
    entrega_urgente: solicitante.entregaUrgente || false,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = itens.map((i) => ({
    estoque_id: limparIdEstoque(i.estoque_id || i.id),
    part_number_manual: i.numPecaFabricante || i.pn,
    descricao_manual: i.materialDescription || i.desc,
    quantidade_solicitada: Math.max(1, i.qtd || 1),
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

// Converte "1.234,56" / "1234.56" / "R$ 10" em numero.
const limparValor = (valorFront) => {
  if (!valorFront) return 0;
  let v = String(valorFront).replace(/[^\d.,-]/g, '');
  if (v.includes('.') && v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
  else if (v.includes(',')) v = v.replace(',', '.');
  return parseFloat(v) || 0;
};

const criarEntrada = async (solicitante, itens, anexos) => {
  const dados = {
    tipo: 'Entrada',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = itens.map((i) => ({
    desenho_sap_manual: i.desenho_sap || i.desenhoSAP || '-',
    part_number_manual: i.part_number || i.numPecaFabricante || 'SEM-PN',
    descricao_manual: i.descricao || i.materialDescription || i.vendorDescription || 'Sem descrição',
    quantidade_solicitada: Math.max(1, i.qtd || i.qtdFornecida || 1),
    unidade_medida_manual: i.unidade_medida || i.unidadeMedida || 'Unid',
    valor_unitario_manual: limparValor(i.valor_unitario || i.poNetPrice),
    fornecedor: i.fornecedor || null,
    referencia: i.referencia || null,
    nf_entrada: i.nf_entrada || i.nfEntrada || null,
    wbs_element: i.wbs_element || i.wbsElement || null,
    nome_projeto: i.nome_projeto || i.nomeProjeto || null,
    emissao_nf: i.emissao_nf || i.emissaoNF || null,
    receb_nf: i.receb_nf || i.recebNF || null,
    documento_compras: i.documento_compras || i.docCompras || null,
    centro: i.centro || null,
    deposito: i.deposito || null,
    alocacao: i.alocacao || null,
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

const criarCrossdocking = async (solicitante, itens, anexos) => {
  const dados = {
    tipo: 'Crossdocking',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = (itens || []).map((i) => ({
    desenho_sap_manual: i.desenho_sap_manual,
    quantidade_solicitada: Math.max(1, i.quantidade_solicitada || 1),
    unidade_medida_manual: i.unidade_medida_manual,
  }));

  return salvarNoBanco(dados, itensDB, anexos, solicitante.nf);
};

const criarNotaFiscal = async (solicitante, anexos) => {
  const dados = {
    tipo: 'Nota Fiscal',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = [{
    descricao_manual: solicitante.descricao,
    quantidade_solicitada: 1,
    valor_unitario_manual: limparValor(solicitante.valorEstimado || '0'),
  }];

  return salvarNoBanco(dados, itensDB, anexos);
};

const criarReintegracao = async (solicitante, itens, anexos) => {
  const dados = {
    tipo: 'Reintegracao',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    observacoes: `[Reintegração] Originado da PL #${solicitante.pl_origem}. ${solicitante.observacoes || ''}`.trim(),
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = (itens || []).map((i) => ({
    estoque_id: limparIdEstoque(i.estoque_id || i.id),
    desenho_sap_manual: i.desenho_sap_manual || i.desenhoSAP || '-',
    part_number_manual: i.part_number_manual || i.part_number || '-',
    descricao_manual: i.descricao_manual || i.descricao || 'Sem descrição',
    quantidade_solicitada: Math.max(1, Number(i.quantidade_devolvida || i.quantidade_solicitada || 1)),
    unidade_medida_manual: i.unidade_medida_manual || i.unidade || 'Unid',
    wbs_element: i.wbs_element || null,
    alocacao: i.alocacao || null,
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

const cancelarPL = async (solicitante, anexos) => {
  const dados = {
    tipo: 'Cancelado',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = (solicitante.itens || []).map((i) => ({
    estoque_id: limparIdEstoque(i.estoque_id || i.id),
    desenho_sap_manual: i.desenho_sap_manual || i.desenhoSAP || '-',
    part_number_manual: i.part_number_manual || i.part_number || '-',
    descricao_manual: i.descricao_manual || i.descricao || 'Sem descrição',
    quantidade_solicitada: Math.max(1, Number(i.quantidade_solicitada || 1)),
    unidade_medida_manual: i.unidade_medida_manual || i.unidade || 'Unid',
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

// ===================== APROVACAO / MUDANCA DE STATUS =====================

// O Postgres gerava numero_pl com SERIAL. Aqui o proximo numero e' o maior
// existente + 1, calculado dentro de uma fila para dois pedidos aprovados ao
// mesmo tempo nao receberem o mesmo numero.
const criarPackingList = async (solicitacaoId, status) =>
  db.emFila(async () => {
    // solicitacao_id e' unico: se ja existe PL, nao cria outra (era o
    // erro 23505 que o codigo antigo ignorava de proposito).
    const jaExiste = await db.um(
      'packing_lists',
      db.f('solicitacao_id = {:sid}', { sid: solicitacaoId })
    );
    if (jaExiste) return null;

    const maiores = await db.pagina('packing_lists', 1, 1, {
      sort: '-numero_pl',
      fields: 'numero_pl',
    });
    const ultima = maiores.items[0];

    const proximoNumero = ultima && ultima.numero_pl ? Number(ultima.numero_pl) + 1 : 1;

    const criada = await db.criar('packing_lists', {
      numero_pl: proximoNumero,
      solicitacao_id: solicitacaoId,
      status,
    });

    return criada.numero_pl;
  });

// Acha o id da solicitacao original citada na observacao de um cancelamento.
// O front escreve "(Origem: PS-... / <id>)". O UUID solto e' aceito tambem,
// para dados que vieram do tempo do Supabase.
const acharIdOriginalNoTexto = (observacoes) => {
  if (!observacoes) return null;

  const porFormato = observacoes.match(/\/\s*([A-Za-z0-9_-]{10,})\s*\)/);
  if (porFormato) return porFormato[1];

  const porUuid = observacoes.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  );
  return porUuid ? porUuid[0] : null;
};

const atualizarStatus = async (id, statusRecebido, motivoRecusa, numeroPL) => {
  const solicitacao = await db.porId('solicitacoes', id);
  if (!solicitacao) throw new Error('Solicitação não encontrada.');

  let statusFinal = statusRecebido;

  if (
    ['Entrada', 'Transferencia WBS', 'Cancelado'].includes(solicitacao.tipo) &&
    (statusRecebido === 'Em Separação' || statusRecebido === 'Aprovado' || statusRecebido === 'Concluído')
  ) {
    statusFinal = 'Concluído';
  }

  // updated_at e' autodate no PocketBase: ele mesmo carimba a cada gravacao.
  const atualizacaoPS = { status: statusFinal };

  const foiAprovado = statusFinal === 'Em Separação' || statusFinal === 'Concluído';

  if (foiAprovado && !solicitacao.data_aprovacao_pl) {
    const dataAprovacao = new Date();
    atualizacaoPS.data_aprovacao_pl = db.paraData(dataAprovacao);

    const prazoLimite = new Date(dataAprovacao);
    prazoLimite.setDate(prazoLimite.getDate() + 3);
    atualizacaoPS.prazo_finalizacao_pl = db.paraData(prazoLimite);
  }

  if (numeroPL) atualizacaoPS.pl = numeroPL;

  if (motivoRecusa) {
    const obsAntiga = solicitacao.observacoes || '';
    atualizacaoPS.observacoes = `${obsAntiga}\n[RECUSADO]: ${motivoRecusa}`.trim();
  }

  await db.atualizar('solicitacoes', id, atualizacaoPS);

  let numeroPLGerado = null;

  const acabouDeSerAprovado = solicitacao.status === 'Pendente' && foiAprovado;

  if (!acabouDeSerAprovado && statusFinal === 'Concluído') {
    await db.atualizarOnde(
      'packing_lists',
      db.f('solicitacao_id = {:sid}', { sid: id }),
      { status: 'Concluído' }
    );
  }

  if (acabouDeSerAprovado) {
    numeroPLGerado = await criarPackingList(id, statusFinal === 'Concluído' ? 'Concluído' : 'Em Separação');

    if (numeroPLGerado) {
      await db.atualizar('solicitacoes', id, { pl: `PL #${numeroPLGerado}` });
    }

    const tiposDeSaida = ['Material', 'Transferencia WBS', 'Crossdocking'];

    // ---------- 1. SAIDAS: baixa no estoque ----------
    if (tiposDeSaida.includes(solicitacao.tipo)) {
      const itensPedidos = await db.listar('solicitacoes_itens', {
        filter: db.f('solicitacao_id = {:sid}', { sid: id }),
      });

      for (const item of itensPedidos) {
        if (!item.estoque_id) continue;

        const estoqueAtual = await db.porId('estoque', item.estoque_id);
        if (!estoqueAtual) continue;

        const saldoAtual = Number(estoqueAtual.quantidade_disponivel || 0);
        const quantidadeRetirada = Number(item.quantidade_solicitada || 0);

        const novoSaldo = saldoAtual - quantidadeRetirada;
        const saldoFinalSeguro = novoSaldo < 0 ? 0 : novoSaldo;
        const novoStatusEstoque = saldoFinalSeguro <= 0 ? 'Zerado' : 'Disponível';

        await db.atualizar('estoque', item.estoque_id, {
          quantidade_disponivel: saldoFinalSeguro,
          status: novoStatusEstoque,
        });

        // Transferencia entre WBS: o material sai de um WBS e nasce no outro.
        if (solicitacao.tipo === 'Transferencia WBS') {
          await db.criar('estoque', {
            material_id: estoqueAtual.material_id || '',
            filial_id: estoqueAtual.filial_id || '',
            desenho_sap: estoqueAtual.desenho_sap,
            part_number: estoqueAtual.part_number,
            descricao: estoqueAtual.descricao,
            nf_entrada: estoqueAtual.nf_entrada,
            documento_compras: estoqueAtual.documento_compras,
            quantidade_disponivel: quantidadeRetirada,
            status: 'Disponível',
            wbs: solicitacao.wbs_destino,
            nome_projeto: estoqueAtual.nome_projeto || '',
            is_transferencia: true,
            alocacao: `Origem: ${solicitacao.wbs_origem || estoqueAtual.wbs || 'Desconhecida'}`,
            fornecedor: estoqueAtual.fornecedor || '',
            referencia: estoqueAtual.referencia || '',
            unidade_medida: estoqueAtual.unidade_medida || 'Unid',
            emissao_nf: estoqueAtual.emissao_nf || '',
            receb_nf: estoqueAtual.receb_nf || '',
            valor_unitario: estoqueAtual.valor_unitario || 0,
            centro: estoqueAtual.centro || '',
            deposito: estoqueAtual.deposito || '',
          });
        }
      }
    }

    // ---------- 2. ENTRADAS: cria estoque e alimenta o crossdocking ----------
    else if (solicitacao.tipo === 'Entrada') {
      const itensEntrada = await db.listar('solicitacoes_itens', {
        filter: db.f('solicitacao_id = {:sid}', { sid: id }),
      });

      if (itensEntrada.length > 0) {
        const estoqueCriado = await db.criarVarios(
          'estoque',
          itensEntrada.map((item) => ({
            material_id: item.material_id || '',
            desenho_sap: item.desenho_sap_manual || item.desenho_sap || '-',
            part_number: item.part_number_manual || 'SEM-PN',
            descricao: item.descricao_manual || 'Sem descrição',
            filial_id: solicitacao.filial_origem_id || '',
            nf_entrada: item.nf_entrada || 'SEM-NF',
            documento_compras: item.documento_compras || '-',
            wbs: item.wbs_element || '-',
            nome_projeto: item.nome_projeto || '',
            alocacao: item.alocacao || 'Pendente',
            quantidade_disponivel: item.quantidade_solicitada,
            status: 'Disponível',
            fornecedor: item.fornecedor || '',
            referencia: item.referencia || '',
            unidade_medida: item.unidade_medida_manual || 'Unid',
            emissao_nf: item.emissao_nf || '',
            receb_nf: item.receb_nf || '',
            valor_unitario: item.valor_unitario_manual || 0,
            centro: item.centro || '',
            deposito: item.deposito || '',
          }))
        );

        // ---- Crossdocking: fila FIFO por numero de NF ----
        const nfParaProcurar = itensEntrada[0].nf_entrada;

        if (nfParaProcurar && nfParaProcurar !== 'SEM-NF') {
          // O PostgREST filtrava a solicitacao pela NF com um join
          // (notas_fiscais!inner). Aqui: primeiro as NFs com esse numero,
          // depois as solicitacoes de crossdocking pendentes dessas NFs.
          const notasComEsseNumero = await db.listar('notas_fiscais', {
            filter: db.f('numero_nf = {:nf}', { nf: String(nfParaProcurar) }),
            fields: 'solicitacao_id',
          });

          const idsCandidatos = notasComEsseNumero.map((n) => n.solicitacao_id).filter(Boolean);

          if (idsCandidatos.length > 0) {
            const candidatos = await db.listarPorIds('solicitacoes', 'id', idsCandidatos);

            // O mais antigo primeiro - a fila de verdade.
            const crossdockingsPendentes = candidatos
              .filter((s) => s.tipo === 'Crossdocking' && s.status === 'Pendente')
              .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

            for (const cross of crossdockingsPendentes) {
              // Ja consumiu uma Entrada antes: passa para o proximo da fila.
              if (cross.observacoes && cross.observacoes.includes('[NF VINCULADA]')) continue;

              let vinculouAlgo = false;
              const isParcial = cross.observacoes && cross.observacoes.includes('[Saída Parcial]');

              if (!isParcial) {
                // Crossdocking total: libera tudo de uma vez.
                await db.criarVarios(
                  'solicitacoes_itens',
                  itensEntrada.map((item, index) => ({
                    solicitacao_id: cross.id,
                    estoque_id: estoqueCriado[index] ? estoqueCriado[index].id : null,
                    desenho_sap_manual: item.desenho_sap_manual,
                    part_number_manual: item.part_number_manual,
                    descricao_manual: item.descricao_manual,
                    quantidade_solicitada: item.quantidade_solicitada,
                    unidade_medida_manual: item.unidade_medida_manual,
                    valor_unitario_manual: item.valor_unitario_manual,
                    fornecedor: item.fornecedor,
                    referencia: item.referencia,
                    nf_entrada: item.nf_entrada,
                    wbs_element: item.wbs_element,
                    nome_projeto: item.nome_projeto,
                    centro: item.centro,
                    deposito: item.deposito,
                    alocacao: 'CROSSDOCKING (TOTAL)',
                  }))
                );
                vinculouAlgo = true;
              } else {
                // Crossdocking parcial: cruza os SAPs pedidos com os que chegaram.
                const itensPedidosCross = await db.listar('solicitacoes_itens', {
                  filter: db.f('solicitacao_id = {:sid}', { sid: cross.id }),
                });

                for (const pedido of itensPedidosCross) {
                  if (!pedido.desenho_sap_manual) continue;

                  const itemEstoqueCriado = estoqueCriado.find(
                    (e) =>
                      e.desenho_sap &&
                      e.desenho_sap !== '-' &&
                      e.desenho_sap.toUpperCase() === String(pedido.desenho_sap_manual).toUpperCase()
                  );

                  if (itemEstoqueCriado) {
                    await db.atualizar('solicitacoes_itens', pedido.id, {
                      estoque_id: itemEstoqueCriado.id,
                      alocacao: 'Vinculado à NF (Aguardando Aprovação)',
                    });
                    vinculouAlgo = true;
                  }
                }
              }

              // Fecha a fila: uma Entrada alimenta um Crossdocking so.
              if (vinculouAlgo) {
                await db.atualizar('solicitacoes', cross.id, {
                  observacoes: (cross.observacoes || '') + '\n[NF VINCULADA]',
                });
                break;
              }
            }
          }
        }
      }
    }

    // ---------- 3. DEVOLUCOES: reintegracao e cancelamento ----------
    else if (
      solicitacao.tipo === 'Reintegracao' ||
      solicitacao.tipo === 'Reintegração' ||
      solicitacao.tipo === 'Cancelado'
    ) {
      let deveDevolverAoEstoque = true;

      if (solicitacao.tipo === 'Cancelado' && solicitacao.observacoes) {
        const idOriginalParaCancelar = acharIdOriginalNoTexto(solicitacao.observacoes);

        if (idOriginalParaCancelar) {
          const solOriginal = await db.porId('solicitacoes', idOriginalParaCancelar);

          if (solOriginal) {
            // Pedido que ainda nem saiu do estoque: nao ha o que devolver.
            if (solOriginal.status === 'Pendente') deveDevolverAoEstoque = false;

            await db.atualizar('solicitacoes', idOriginalParaCancelar, { status: 'Cancelado' });

            await db.atualizarOnde(
              'packing_lists',
              db.f('solicitacao_id = {:sid}', { sid: idOriginalParaCancelar }),
              { status: 'Cancelado' }
            );
          }
        }
      }

      if (deveDevolverAoEstoque) {
        const itensReintegracao = await db.listar('solicitacoes_itens', {
          filter: db.f('solicitacao_id = {:sid}', { sid: id }),
        });

        for (const item of itensReintegracao) {
          if (!item.estoque_id) continue;

          const estoqueAtual = await db.porId('estoque', item.estoque_id);
          if (!estoqueAtual) continue;

          const saldoAtual = Number(estoqueAtual.quantidade_disponivel || 0);
          const quantidadeDevolvida = Number(item.quantidade_solicitada || 0);

          await db.atualizar('estoque', item.estoque_id, {
            quantidade_disponivel: saldoAtual + quantidadeDevolvida,
            status: 'Disponível',
          });
        }
      }
    }
  }

  return { sucesso: true, numeroPL: numeroPLGerado };
};

// ===================== ANEXOS =====================

// URL gravada pelo upload: "/api/arquivos/<idDocumento>/<nome>"
const extrairIdDocumento = (url) => {
  const m = String(url).match(/\/api\/arquivos\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
};

const salvarAnexosExtras = async (solicitacaoId, anexosArray) => {
  if (!anexosArray || anexosArray.length === 0) return false;

  await db.criarVarios(
    'anexos',
    anexosArray.map((anexo) => ({
      solicitacao_id: solicitacaoId,
      nome_arquivo: anexo.nome_arquivo,
      url_arquivo: anexo.url_arquivo,
      origem: 'logistica',
    }))
  );

  return true;
};

const deletarAnexo = async (anexoId) => {
  const anexo = await db.porId('anexos', anexoId);

  // Apaga tambem o arquivo em si. No Supabase era o bucket "documentos";
  // agora e' a colecao "documentos", e a URL guarda o id do registro.
  if (anexo && anexo.url_arquivo) {
    const idDocumento = extrairIdDocumento(anexo.url_arquivo);
    if (idDocumento) {
      try {
        await db.remover('documentos', idDocumento);
      } catch (erro) {
        // Arquivo ja removido antes: nao impede apagar o anexo.
        console.warn(`[Anexo ${anexoId}] arquivo ja nao existia: ${erro.message}`);
      }
    }
  }

  await db.remover('anexos', anexoId);
  return true;
};

// ===================== ITENS =====================

const reverterItemParaEstoque = async (idItem, qtdDevolver) => {
  const itemPedido = await db.porId('solicitacoes_itens', idItem);
  if (!itemPedido) throw new Error('Item não encontrado na solicitação.');
  if (!itemPedido.estoque_id) {
    throw new Error('Este item não possui vínculo direto com uma prateleira de estoque para devolução.');
  }

  const itemEstoque = await db.porId('estoque', itemPedido.estoque_id);
  if (!itemEstoque) throw new Error('Material não encontrado no estoque para devolução.');

  const qtdRealDevolver = qtdDevolver ? Number(qtdDevolver) : Number(itemPedido.quantidade_solicitada);

  await db.atualizar('estoque', itemEstoque.id, {
    quantidade_disponivel: Number(itemEstoque.quantidade_disponivel || 0) + qtdRealDevolver,
    status: 'Disponível',
  });

  const novaQtdPedido = Number(itemPedido.quantidade_solicitada) - qtdRealDevolver;

  if (novaQtdPedido <= 0) {
    await db.remover('solicitacoes_itens', idItem);
  } else {
    await db.atualizar('solicitacoes_itens', idItem, { quantidade_solicitada: novaQtdPedido });
  }

  return true;
};

const buscarHistoricoItem = async (estoqueId) => {
  const itens = await db.listar('solicitacoes_itens', {
    filter: db.f('estoque_id = {:eid}', { eid: String(estoqueId) }),
  });

  // Uma consulta so para todas as solicitacoes envolvidas (em vez de uma por item).
  const solicitacoes = await db.listarPorIds(
    'solicitacoes',
    'id',
    itens.map((i) => i.solicitacao_id)
  );
  const porId = Object.fromEntries(solicitacoes.map((s) => [s.id, s]));

  return itens.map((item) => {
    const sol = porId[item.solicitacao_id];
    return {
      quantidade: item.quantidade_solicitada,
      dataSaida: new Date(db.dt(item.created_at)).toLocaleDateString('pt-BR'),
      solicitacao: sol?.id,
      solicitante: sol?.nome_solicitante,
      status: sol?.status,
      wbs: sol?.wbs_destino,
    };
  });
};

const atualizarLocalizacao = async (id, dadosLocal) => {
  const atualizacaoSol = {};

  if (dadosLocal.filial) atualizacaoSol.filial_origem_id = dadosLocal.filial;

  if (dadosLocal.data_entrega !== undefined) {
    atualizacaoSol.data_entrega = db.paraData(dadosLocal.data_entrega);
  }

  if (Object.keys(atualizacaoSol).length > 0) {
    await db.atualizar('solicitacoes', id, atualizacaoSol);
  }

  if (dadosLocal.centro || dadosLocal.deposito) {
    const atualizacaoItens = {};
    if (dadosLocal.centro) atualizacaoItens.centro = dadosLocal.centro;
    if (dadosLocal.deposito) atualizacaoItens.deposito = dadosLocal.deposito;

    await db.atualizarOnde(
      'solicitacoes_itens',
      db.f('solicitacao_id = {:sid}', { sid: id }),
      atualizacaoItens
    );
  }

  return true;
};

const atualizarItensDaSolicitacao = async (solicitacaoId, itens) => {
  await db.removerOnde('solicitacoes_itens', db.f('solicitacao_id = {:sid}', { sid: solicitacaoId }));

  if (!itens || itens.length === 0) return true;

  const itensDB = itens.map((i) => ({
    solicitacao_id: solicitacaoId,
    desenho_sap_manual: i.desenho_sap || i.desenhoSAP || i.desenho_sap_manual || null,
    part_number_manual: i.part_number || i.numPecaFabricante || i.part_number_manual || null,
    fornecedor: i.fornecedor || null,
    referencia: i.referencia || null,
    quantidade_solicitada: Math.max(
      1,
      Number(i.qtd || i.qtdFornecida || i.quantidade_solicitada || i.quantidade || 1)
    ),
    nf_entrada: i.nf_entrada || i.nfEntrada || null,
    unidade_medida_manual: i.unidade_medida || i.unidadeMedida || i.unidade_medida_manual || 'Unid',
    descricao_manual:
      i.descricao || i.vendorDescription || i.materialDescription || i.descricao_manual || 'Sem descrição',
    wbs_element: i.wbs_element || i.wbsElement || i.wbs || null,
    nome_projeto: i.nome_projeto || i.nomeProjeto || null,
    emissao_nf: i.emissao_nf || i.emissaoNF || null,
    receb_nf: i.receb_nf || i.recebNF || null,
    documento_compras: i.documento_compras || i.docCompras || null,
    valor_unitario_manual: limparValor(i.valor_unitario || i.poNetPrice || i.valor_unitario_manual),
    centro: i.centro || null,
    deposito: i.deposito || null,
    alocacao: i.alocacao || null,
  }));

  await db.criarVarios('solicitacoes_itens', itensDB);
  return true;
};

const listarDemandasPorEstoque = async (estoqueId) => {
  const itens = await db.listar('solicitacoes_itens', {
    filter: db.f('estoque_id = {:eid}', { eid: String(estoqueId) }),
  });

  // O "solicitacoes!inner" do PostgREST vira: busca as solicitacoes dos itens
  // e descarta os itens cuja solicitacao nao existe mais (era isso que o
  // "inner" fazia).
  const solicitacoes = await db.listarPorIds(
    'solicitacoes',
    'id',
    itens.map((i) => i.solicitacao_id)
  );
  const porId = Object.fromEntries(solicitacoes.map((s) => [s.id, solicitacaoParaFront(s)]));

  const demandas = itens
    .filter((item) => porId[item.solicitacao_id])
    .map((item) => ({
      quantidade_solicitada: item.quantidade_solicitada,
      unidade_medida_manual: item.unidade_medida_manual,
      solicitacoes: porId[item.solicitacao_id],
    }));

  const edicoesCruas = await db.listar('historico_edicoes', {
    filter: db.f('estoque_id = {:eid}', { eid: String(estoqueId) }),
  });

  const edicoes = edicoesCruas.map((e) => ({ ...e, created_at: db.dt(e.created_at) }));

  return { demandas, edicoes };
};

module.exports = {
  listarSolicitacoes,
  criarMaterial,
  criarTransferencia,
  criarEntrada,
  atualizarLocalizacao,
  criarCrossdocking,
  criarNotaFiscal,
  criarReintegracao,
  cancelarPL,
  atualizarStatus,
  deletarAnexo,
  reverterItemParaEstoque,
  buscarHistoricoItem,
  salvarAnexosExtras,
  atualizarItensDaSolicitacao,
  listarDemandasPorEstoque,
};
