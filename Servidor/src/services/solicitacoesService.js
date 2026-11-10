// =================================================================
// ARQUIVO: src/services/solicitacoesService.js
// DESCRICAO: Lógica de negócio (Fuso Horário Brasil UTC-3 + Curas Universais)
// =================================================================
const db = require('../db');

const LIMITE_CARACTERES = 2000;

const limitarTexto = (texto) => {
  if (!texto) return '-';
  const str = String(texto).trim();
  if (str.length <= LIMITE_CARACTERES) return str;
  const textoCortado = str.substring(0, LIMITE_CARACTERES - 25);
  return `${textoCortado}... [LIMITE ATINGIDO]`;
};

const limparIdEstoque = (id) => {
  if (!id) return null;
  const idString = String(id);
  if (idString.startsWith('manual-')) return null;
  return idString;
};

const formatarDataBrasil = (isoString) => {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).replace(',', ' às');
  } catch (e) {
    return isoString;
  }
};

const normalizar = (txt) => String(txt || '').trim().replace(/\s+/g, ' ').toUpperCase();

const solicitacaoParaFront = (r) => ({
  ...r,
  observacoes_logistica: db.txt(r.observacoes_logistica),
  data_necessidade: db.dt(r.data_necessidade),
  data_entrega: db.dt(r.data_entrega),
  data_aprovacao_pl: db.dt(r.data_aprovacao_pl),
  prazo_finalizacao_pl: db.dt(r.prazo_finalizacao_pl),
  created_at: db.dt(r.created_at),
  updated_at: db.dt(r.updated_at),
});

const gerarPS = () => {
  const dataAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).substring(0, 10).replace(/\//g, '');
  const numeroAleatorio = Math.floor(1000 + Math.random() * 9000);
  return `PS-${dataAtual}-${numeroAleatorio}`;
};

const salvarNoBanco = async (dadosPrincipais, itensArray, anexosArray = [], numeroDaNota = null) => {
  if (!dadosPrincipais.filial_origem_id || dadosPrincipais.filial_origem_id === 'TODOS') {
    throw new Error('Ação bloqueada: Por favor, selecione uma filial física no topo da página.');
  }

  let solicitacaoCriada = null;
  let psGerado = null;

  for (let tentativa = 0; tentativa < 5 && !solicitacaoCriada; tentativa++) {
    psGerado = gerarPS();
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
        observacoes_logistica: '', 
        entrega_urgente: dadosPrincipais.entrega_urgente || false,
        status: dadosPrincipais.status || 'Pendente',
      });
    } catch (erro) {
      const ehPsRepetido = erro && erro.status === 400 && tentativa < 4;
      if (!ehPsRepetido) throw erro;
    }
  }

  if (!solicitacaoCriada) throw new Error('Não foi possível gerar um número de PS único.');

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
    await db.criar('notas_fiscais', { solicitacao_id: idGerado, numero_nf: normalizar(numeroDaNota) });
  }

  return { id: idGerado, ps: psGerado };
};

const listarSolicitacoes = async (page = 1, limit = 10, busca = '', tipo = '', filial = '', status = '', resumido = false) => {
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

  if (status && status !== 'Todos') {
    condicoes.push('status = {:status}');
    parametros.status = status;
  }

  if (busca) {
    condicoes.push('(ps ~ {:busca} || nome_solicitante ~ {:busca} || wbs_destino ~ {:busca} || wbs_origem ~ {:busca} || pl ~ {:busca})');
    parametros.busca = busca;
  }

  const resultado = await db.pagina('solicitacoes', page, limit, {
    filter: condicoes.length ? db.f(condicoes.join(' && '), parametros) : '',
    sort: '-created_at',
  });

  const solicitacoes = resultado.items;
  const ids = solicitacoes.map((s) => s.id);

  const opcoesItens = resumido 
    ? { fields: 'id,solicitacao_id,quantidade_solicitada,wbs_element,wbsOrigem,wbs_origem,wbs,desenho_sap_manual,fornecedor,nf_entrada' } 
    : {};
  const opcoesAnexos = resumido 
    ? { fields: 'id,solicitacao_id' } 
    : {};

  const [itens, anexos, packingLists, notasFiscais] = await Promise.all([
    db.listarPorIds('solicitacoes_itens', 'solicitacao_id', ids, opcoesItens),
    db.listarPorIds('anexos', 'solicitacao_id', ids, opcoesAnexos),
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
    const listaItens = itensPorSol[sol.id] || [];
    const listaAnexos = anexosPorSol[sol.id] || [];
    const numeroPL = listaPL.length > 0 ? listaPL[0].numero_pl : null;

    const plFinal = sol.pl || (numeroPL ? `PL #${numeroPL}` : null);
    const dataAprovacaoValida = sol.data_aprovacao_pl || (sol.status !== 'Pendente' ? sol.updated_at : null);

    let wbsExibicao = sol.wbs_destino || '';

    if (sol.tipo === 'Transferencia WBS' || sol.tipo === 'Transfer. WBS') {
      let origemLimpa = (sol.wbs_origem && sol.wbs_origem !== 'N/A' && sol.wbs_origem !== 'null') ? sol.wbs_origem : null;
      let destinoLimpo = (sol.wbs_destino && sol.wbs_destino !== 'N/A' && sol.wbs_destino !== 'null') ? sol.wbs_destino : null;

      if ((!origemLimpa || !destinoLimpo) && listaItens.length > 0) {
        const primeiroItem = listaItens[0];
        if (!origemLimpa) origemLimpa = primeiroItem.wbsOrigem || primeiroItem.wbs_origem || 'Estoque / Desconhecida';
        if (!destinoLimpo) destinoLimpo = primeiroItem.wbs_element || primeiroItem.wbs || '—';
      }

      origemLimpa = origemLimpa || 'Estoque / Desconhecida';
      destinoLimpo = destinoLimpo || '—';
      wbsExibicao = `${origemLimpa} ➔ ${destinoLimpo}`;
    } else {
      if (!wbsExibicao && listaItens.length > 0) {
        wbsExibicao = listaItens[0].wbs_element || listaItens[0].wbs || '—';
      } else {
        wbsExibicao = wbsExibicao || '—';
      }
    }

    const nfCross = listaNF.length > 0 ? listaNF[0].numero_nf : (listaItens.length > 0 ? listaItens[0].nf_entrada : null);

    return {
      id: sol.id,
      ps: sol.ps,
      tipo: sol.tipo,
      nfCrossdocking: nfCross,
      solicitante: sol.nome_solicitante || 'Não informado',
      wbs: wbsExibicao,
      pl: plFinal,
      filial: sol.filial_origem_id || '-',
      destino: sol.destino || 'Não informado',
      dataSolicitacao: formatarDataBrasil(sol.created_at) || "-",
      dataCriacaoISO: sol.created_at,
      dataAprovacaoPL: dataAprovacaoValida,
      prazoFinalizacao: sol.prazo_finalizacao_pl,
      criacaoPl: formatarDataBrasil(dataAprovacaoValida),
      dataFinalizacaoISO: sol.status === 'Concluído' && sol.updated_at ? sol.updated_at : null,
      dataEntrega: sol.data_entrega ? formatarDataBrasil(sol.data_entrega) : sol.status === 'Concluído' ? 'Disponível' : null,

      status: sol.status,
      observacoes: db.txt(sol.observacoes),
      observacoes_logistica: sol.observacoes_logistica, 
      entregaUrgente: sol.entrega_urgente,
      
      anexos: resumido ? listaAnexos.map(a => ({ id: a.id })) : listaAnexos,
      itens: listaItens,
      totalItens: listaItens.length,
      totalAnexos: listaAnexos.length,
    };
  });

  return { dados: dadosFormatados, total: resultado.totalItems || 0 };
};

const obterSolicitacaoDetalhada = async (id) => {
  const registro = await db.porId('solicitacoes', id);
  if (!registro) return null;

  const sol = solicitacaoParaFront(registro);

  const [itens, anexos, packingLists, notasFiscais] = await Promise.all([
    db.listar('solicitacoes_itens', { filter: db.f('solicitacao_id = {:sid}', { sid: id }) }),
    db.listar('anexos', { filter: db.f('solicitacao_id = {:sid}', { sid: id }) }),
    db.listar('packing_lists', { filter: db.f('solicitacao_id = {:sid}', { sid: id }) }),
    db.listar('notas_fiscais', { filter: db.f('solicitacao_id = {:sid}', { sid: id }) }),
  ]);

  const numeroPL = packingLists.length > 0 ? packingLists[0].numero_pl : null;
  const plFinal = sol.pl || (numeroPL ? `PL #${numeroPL}` : null);
  const dataAprovacaoValida = sol.data_aprovacao_pl || (sol.status !== 'Pendente' ? sol.updated_at : null);

  let wbsExibicao = sol.wbs_destino || '';

  if (sol.tipo === 'Transferencia WBS' || sol.tipo === 'Transfer. WBS') {
    let origemLimpa = (sol.wbs_origem && sol.wbs_origem !== 'N/A' && sol.wbs_origem !== 'null') ? sol.wbs_origem : null;
    let destinoLimpo = (sol.wbs_destino && sol.wbs_destino !== 'N/A' && sol.wbs_destino !== 'null') ? sol.wbs_destino : null;

    if ((!origemLimpa || !destinoLimpo) && itens.length > 0) {
      const primeiroItem = itens[0];
      if (!origemLimpa) origemLimpa = primeiroItem.wbsOrigem || primeiroItem.wbs_origem || 'Estoque / Desconhecida';
      if (!destinoLimpo) destinoLimpo = primeiroItem.wbs_element || primeiroItem.wbs || '—';
    }

    origemLimpa = origemLimpa || 'Estoque / Desconhecida';
    destinoLimpo = destinoLimpo || '—';
    wbsExibicao = `${origemLimpa} ➔ ${destinoLimpo}`;
  } else {
    if (!wbsExibicao && itens.length > 0) {
      wbsExibicao = itens[0].wbs_element || itens[0].wbs || '—';
    } else {
      wbsExibicao = wbsExibicao || '—';
    }
  }

  const nfCross = notasFiscais.length > 0 ? notasFiscais[0].numero_nf : (itens.length > 0 ? itens[0].nf_entrada : null);

  return {
    id: sol.id,
    ps: sol.ps,
    tipo: sol.tipo,
    nfCrossdocking: nfCross,
    solicitante: sol.nome_solicitante || 'Não informado',
    wbs: wbsExibicao,
    wbs_origem: sol.wbs_origem,
    wbs_destino: sol.wbs_destino,
    pl: plFinal,
    filial: sol.filial_origem_id || '-',
    destino: sol.destino || 'Não informado',
    dataSolicitacao: formatarDataBrasil(sol.created_at) || "-",
    dataCriacaoISO: sol.created_at,
    dataAprovacaoPL: dataAprovacaoValida,
    prazoFinalizacao: sol.prazo_finalizacao_pl,
    criacaoPl: formatarDataBrasil(dataAprovacaoValida),
    dataFinalizacaoISO: sol.status === 'Concluído' && sol.updated_at ? sol.updated_at : null,
    dataEntrega: sol.data_entrega ? formatarDataBrasil(sol.data_entrega) : sol.status === 'Concluído' ? 'Disponível' : null,
    status: sol.status,
    observacoes: db.txt(sol.observacoes),
    observacoes_logistica: sol.observacoes_logistica, 
    entregaUrgente: sol.entrega_urgente,
    anexos: anexos,
    itens: itens,
    packingLists: packingLists,
    notasFiscais: notasFiscais,
  };
};

const limparValor = (valorFront) => {
  if (!valorFront) return 0;
  let v = String(valorFront).replace(/[^\d.,-]/g, '');
  if (v.includes('.') && v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
  else if (v.includes(',')) v = v.replace(',', '.');
  return parseFloat(v) || 0;
};

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
    desenho_sap_manual: i.desenhoSAP || i.desenho_sap || null,
    part_number_manual: i.numPecaFabricante || i.part_number || null,
    fabricante: i.fabricante || null, 
    descricao_manual: limitarTexto(i.materialDescription || i.descricao || 'Sem descrição'),
    quantidade_solicitada: Math.max(1, Number(i.qtdSelecionada || i.quantidade || 1)),
    unidade_medida_manual: i.unidadeMedida || i.unidade_medida || 'Unid',
    fornecedor: i.fornecedor || null,
    referencia: i.referencia || null,
    wbs_element: i.wbs || i.wbs_element || null,
    alocacao: i.alocacao || null,
    nf_entrada: i.nf_entrada || i.nfEntrada || i.nf || null,
    valor_unitario_manual: limparValor(i.valor_unitario || i.poNetPrice || i.val),
    centro: i.centro || null,
    deposito: i.deposito || null,
    documento_compras: i.documento_compras || i.docCompras || null,
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

const criarTransferencia = async (solicitante, itens, anexos) => {
  let wbsOrig = null;
  if (itens && itens.length > 0) {
    wbsOrig = itens[0].wbsOrigem || itens[0].wbs || itens[0].wbs_element || null;
  }

  const dados = {
    tipo: 'Transferencia WBS',
    nome_solicitante: solicitante.nome,
    wbs_origem: wbsOrig,
    wbs_destino: solicitante.wbs || solicitante.wbs_destino,
    destino: solicitante.destino,
    observacoes: solicitante.observacoes,
    entrega_urgente: solicitante.entregaUrgente || false,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = itens.map((i) => ({
    estoque_id: limparIdEstoque(i.estoque_id || i.id),
    desenho_sap_manual: i.desenho_sap || i.desenhoSAP || null,
    part_number_manual: i.numPecaFabricante || i.pn || i.part_number_manual,
    fabricante: i.fabricante || null, 
    descricao_manual: limitarTexto(i.materialDescription || i.desc || i.descricao_manual),
    quantidade_solicitada: Math.max(1, Number(i.qtd || i.qtdTransferencia || 1)),
    unidade_medida_manual: i.unidade_medida || i.unidadeMedida || 'Unid',
    fornecedor: i.fornecedor || null,
    referencia: i.referencia || null,
    wbs_element: i.wbs || i.wbs_element || null,
    alocacao: i.alocacao || null,
    nf_entrada: i.nf_entrada || i.nfEntrada || i.nf || null,
    valor_unitario_manual: limparValor(i.valor_unitario || i.poNetPrice || i.val),
    centro: i.centro || null,
    deposito: i.deposito || null,
    documento_compras: i.documento_compras || i.docCompras || null,
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

const criarEntrada = async (solicitante, itens, anexos) => {
  const dados = {
    tipo: 'Entrada',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    destino: solicitante.destino,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = itens.map((i) => ({
    desenho_sap_manual: normalizar(i.desenho_sap || i.desenhoSAP || '-'),
    part_number_manual: i.part_number || i.numPecaFabricante || 'SEM-PN',
    fabricante: i.fabricante || null, 
    descricao_manual: limitarTexto(i.descricao || i.materialDescription || i.vendorDescription || 'Sem descrição'),
    quantidade_solicitada: Math.max(1, Number(i.qtd || i.qtdFornecida || 1)),
    unidade_medida_manual: i.unidade_medida || i.unidadeMedida || 'Unid',
    valor_unitario_manual: limparValor(i.valor_unitario || i.poNetPrice),
    fornecedor: normalizar(i.fornecedor),
    referencia: i.referencia || null,
    nf_entrada: normalizar(i.nf_entrada || i.nfEntrada),
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
    destino: solicitante.destino,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const nfSolicitante = normalizar(solicitante.nf);
  const fornSolicitante = normalizar(solicitante.fornecedor);

  const itensDB = (itens || []).map((i) => ({
    desenho_sap_manual: normalizar(i.desenho_sap_manual || i.desenhoSAP || '-'),
    quantidade_solicitada: Math.max(1, Number(i.quantidade_solicitada || i.qtdSelecionada || i.quantidade || 1)),
    unidade_medida_manual: i.unidade_medida_manual || i.unidadeMedida || 'Unid',
    nf_entrada: normalizar(i.nf_entrada || i.nfEntrada || i.nf || nfSolicitante),
    fornecedor: normalizar(i.fornecedor || fornSolicitante),
    fabricante: i.fabricante || null,
    descricao_manual: limitarTexto(i.descricao_manual || i.materialDescription || i.descricao || 'Sem descrição'),
  }));

  return salvarNoBanco(dados, itensDB, anexos, nfSolicitante);
};

const criarNotaFiscal = async (solicitante, anexos) => {
  const dados = {
    tipo: 'Nota Fiscal',
    nome_solicitante: solicitante.nome,
    wbs_destino: solicitante.wbs,
    destino: solicitante.destino,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = [{
    descricao_manual: limitarTexto(solicitante.descricao),
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
    destino: solicitante.destino,
    observacoes: `[Reintegração] Originado da PL #${solicitante.pl_origem}. ${solicitante.observacoes || ''}`.trim(),
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = (itens || []).map((i) => ({
    estoque_id: limparIdEstoque(i.estoque_id || i.id),
    desenho_sap_manual: i.desenho_sap_manual || i.desenhoSAP || '-',
    part_number_manual: i.part_number_manual || i.part_number || '-',
    fabricante: i.fabricante || null,
    descricao_manual: limitarTexto(i.descricao_manual || i.descricao || 'Sem descrição'),
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
    destino: solicitante.destino,
    observacoes: solicitante.observacoes,
    status: 'Pendente',
    filial_origem_id: solicitante.filial_origem || solicitante.filial_id,
  };

  const itensDB = (solicitante.itens || []).map((i) => ({
    estoque_id: limparIdEstoque(i.estoque_id || i.id),
    desenho_sap_manual: i.desenho_sap_manual || i.desenhoSAP || '-',
    part_number_manual: i.part_number_manual || i.part_number || '-',
    fabricante: i.fabricante || null,
    descricao_manual: limitarTexto(i.descricao_manual || i.descricao || 'Sem descrição'),
    quantidade_solicitada: Math.max(1, Number(i.quantidade_solicitada || 1)),
    unidade_medida_manual: i.unidade_medida_manual || i.unidade || 'Unid',
  }));

  return salvarNoBanco(dados, itensDB, anexos);
};

const criarPackingList = async (solicitacaoId, status) =>
  db.emFila(async () => {
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

const acharIdOriginalNoTexto = (observacoes) => {
  if (!observacoes) return null;
  const porFormato = observacoes.match(/\/\s*([A-Za-z0-9_-]{10,})\s*\)/);
  if (porFormato) return porFormato[1];

  const porUuid = porFormato ? null : observacoes.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  );
  return porUuid ? porUuid[0] : null;
};

// ===================== PROCESSAMENTO DE STATUS E DEDUÇÃO =====================

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
    numeroPLGerado = await criarPackingList(id, 'Em Separação');

    if (numeroPLGerado) {
      await db.atualizar('solicitacoes', id, { pl: `PL #${numeroPLGerado}` });
    }

    // =========================================================================
    // CENÁRIO 1: APROVAÇÃO DA ENTRADA DE MATERIAL
    // =========================================================================
    if (solicitacao.tipo === 'Entrada') {
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
            fabricante: item.fabricante || '', 
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

        const nfsDaEntrada = [...new Set(itensEntrada.map(i => normalizar(i.nf_entrada)).filter(nf => nf !== 'SEM-NF' && nf !== '-'))];

        if (nfsDaEntrada.length > 0) {
          const notasCandidatas = await db.listar('notas_fiscais', { fields: 'solicitacao_id,numero_nf' });
          const idsCandidatos = notasCandidatas
            .filter((n) => nfsDaEntrada.includes(normalizar(n.numero_nf)))
            .map((n) => n.solicitacao_id)
            .filter(Boolean);

          if (idsCandidatos.length > 0) {
            const candidatos = await db.listarPorIds('solicitacoes', 'id', idsCandidatos);
            
            const crossdockingsAlvo = candidatos
              .filter((s) => s.tipo === 'Crossdocking' && (s.status === 'Pendente' || s.status === 'Em Separação' || s.status === 'Concluído'))
              .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

            for (const cross of crossdockingsAlvo) {
              if (cross.observacoes && cross.observacoes.includes('[NF VINCULADA]')) continue;

              const nfRec = await db.um('notas_fiscais', db.f('solicitacao_id = {:sid}', { sid: cross.id }));
              let nfCrossLimpa = normalizar(nfRec ? nfRec.numero_nf : '');

              let fornCross = '';
              const matchForn = cross.observacoes?.match(/Fornecedor:\s*([^\]|\n]+)/i);
              if (matchForn) fornCross = normalizar(matchForn[1]);

              const itensPedidosCross = await db.listar('solicitacoes_itens', {
                filter: db.f('solicitacao_id = {:sid}', { sid: cross.id }),
              });

              if (!nfCrossLimpa && itensPedidosCross.length > 0) {
                nfCrossLimpa = normalizar(itensPedidosCross[0].nf_entrada);
              }
              if (!fornCross && itensPedidosCross.length > 0) {
                fornCross = normalizar(itensPedidosCross[0].fornecedor);
              }

              const indicesItensValidos = [];
              itensEntrada.forEach((item, idx) => {
                const nfEnt = normalizar(item.nf_entrada);
                const fornEnt = normalizar(item.fornecedor);
                
                if (nfEnt === nfCrossLimpa && fornEnt === fornCross) {
                  indicesItensValidos.push(idx);
                }
              });

              if (indicesItensValidos.length === 0) continue;

              let vinculouAlgo = false;
              const obs = String(cross.observacoes || '');
              const isParcial = /sa[íi]da\s+parcial/i.test(obs) || (itensPedidosCross.length > 0 && !/sa[íi]da\s+total/i.test(obs));

              if (!isParcial) {
                // ==================== CROSSDOCKING TOTAL ====================
                await db.removerOnde('solicitacoes_itens', db.f('solicitacao_id = {:sid}', { sid: cross.id }));
                
                const novosItens = indicesItensValidos.map((idxOriginal) => {
                  const item = itensEntrada[idxOriginal];
                  return {
                    solicitacao_id: cross.id,
                    estoque_id: estoqueCriado[idxOriginal] ? estoqueCriado[idxOriginal].id : null,
                    desenho_sap_manual: item.desenho_sap_manual,
                    part_number_manual: item.part_number_manual,
                    fabricante: item.fabricante,
                    descricao_manual: item.descricao_manual,
                    quantidade_solicitada: item.quantidade_solicitada,
                    unidade_medida_manual: item.unidade_medida_manual,
                    valor_unitario_manual: item.valor_unitario_manual,
                    fornecedor: item.fornecedor,
                    referencia: item.referencia,
                    nf_entrada: item.nf_entrada,
                    wbs_element: cross.wbs_destino || item.wbs_element,
                    nome_projeto: item.nome_projeto,
                    centro: item.centro,
                    deposito: item.deposito,
                    // ✨ PRESERVA A ALOCAÇÃO ORIGINAL
                    alocacao: item.alocacao || '-', 
                  };
                });
                
                await db.criarVarios('solicitacoes_itens', novosItens);

                if (cross.status !== 'Pendente') {
                  for (const idxOriginal of indicesItensValidos) {
                    const itemEst = estoqueCriado[idxOriginal];
                    if (itemEst) {
                      await db.atualizar('estoque', itemEst.id, { quantidade_disponivel: 0, status: 'Zerado' });
                      itemEst.quantidade_disponivel = 0;
                    }
                  }
                  await db.atualizar('solicitacoes', cross.id, { 
                    observacoes: (cross.observacoes || '') + '\n[NF VINCULADA]' 
                  });
                }
                vinculouAlgo = true;

              } else {
                // ==================== CROSSDOCKING PARCIAL ====================
                for (const pedido of itensPedidosCross) {
                  const sapCross = normalizar(pedido.desenho_sap_manual);
                  if (!sapCross) continue;

                  const indexEncontrado = indicesItensValidos.find(idx => {
                    const e = estoqueCriado[idx];
                    if (!e) return false;
                    return normalizar(e.desenho_sap) === sapCross;
                  });

                  if (indexEncontrado !== undefined) {
                    const itemEstoqueCriado = estoqueCriado[indexEncontrado];
                    const itemEnt = itensEntrada[indexEncontrado];

                    await db.atualizar('solicitacoes_itens', pedido.id, {
                      estoque_id: itemEstoqueCriado.id,
                      part_number_manual: itemEnt.part_number_manual || pedido.part_number_manual,
                      fabricante: itemEnt.fabricante || pedido.fabricante,
                      descricao_manual: itemEnt.descricao_manual || pedido.descricao_manual,
                      valor_unitario_manual: itemEnt.valor_unitario_manual || pedido.valor_unitario_manual,
                      fornecedor: itemEnt.fornecedor || pedido.fornecedor,
                      referencia: itemEnt.referencia || pedido.referencia,
                      nf_entrada: itemEnt.nf_entrada || pedido.nf_entrada,
                      wbs_element: cross.wbs_destino || itemEnt.wbs_element,
                      nome_projeto: itemEnt.nome_projeto,
                      centro: itemEnt.centro,
                      deposito: itemEnt.deposito,
                      // ✨ PRESERVA A ALOCAÇÃO ORIGINAL
                      alocacao: itemEnt.alocacao || pedido.alocacao || '-',
                    });

                    if (cross.status !== 'Pendente') {
                      const qtdPedida = Number(pedido.quantidade_solicitada || 0);
                      const qtdDisp = Number(itemEstoqueCriado.quantidade_disponivel || 0);
                      const novoSaldo = Math.max(0, qtdDisp - qtdPedida);
                       
                      await db.atualizar('estoque', itemEstoqueCriado.id, {
                        quantidade_disponivel: novoSaldo,
                        status: novoSaldo <= 0 ? 'Zerado' : 'Disponível'
                      });
                      itemEstoqueCriado.quantidade_disponivel = novoSaldo;
                    }
                    vinculouAlgo = true;
                  }
                }

                if (cross.status !== 'Pendente') {
                  await db.atualizar('solicitacoes', cross.id, { 
                    observacoes: (cross.observacoes || '') + '\n[NF VINCULADA]' 
                  });
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // CENÁRIO 2: APROVAÇÃO DO CROSSDOCKING (MATERIAL JÁ ESTAVA NO ESTOQUE)
    // =========================================================================
    else if (solicitacao.tipo === 'Crossdocking') {
      const jaFoiDeduzido = solicitacao.observacoes && solicitacao.observacoes.includes('[NF VINCULADA]');
      
      if (!jaFoiDeduzido && foiAprovado) {
        const nfRecord = await db.um('notas_fiscais', db.f('solicitacao_id = {:sid}', { sid: id }));
        let nfCross = normalizar(nfRecord ? nfRecord.numero_nf : '');

        let fornCross = '';
        const matchForn = solicitacao.observacoes?.match(/Fornecedor:\s*([^\]]+)/i);
        if (matchForn) fornCross = normalizar(matchForn[1]);

        let itensCross = await db.listar('solicitacoes_itens', { filter: db.f('solicitacao_id = {:sid}', { sid: id }) });

        if (!nfCross && itensCross.length > 0) nfCross = normalizar(itensCross[0].nf_entrada);
        if (!fornCross && itensCross.length > 0) fornCross = normalizar(itensCross[0].fornecedor);

        const obs = String(solicitacao.observacoes || '');
        const isParcial = /sa[íi]da\s+parcial/i.test(obs) || (itensCross.length > 0 && !/sa[íi]da\s+total/i.test(obs));

        const candidatosEstoque = await db.listar('estoque', { 
          filter: db.f('filial_id = {:filial}', { filial: solicitacao.filial_origem_id }) 
        });

        const estoqueValido = candidatosEstoque.filter(e => {
          const bateuNF = normalizar(e.nf_entrada) === nfCross;
          const bateuForn = fornCross ? normalizar(e.fornecedor) === fornCross : true;
          return bateuNF && bateuForn && Number(e.quantidade_disponivel || 0) > 0;
        });

        if (!isParcial) {
          if (estoqueValido.length > 0) {
            await db.removerOnde('solicitacoes_itens', db.f('solicitacao_id = {:sid}', { sid: id }));

            const novosItens = estoqueValido.map(e => ({
              solicitacao_id: id,
              estoque_id: e.id, 
              desenho_sap_manual: e.desenho_sap,
              part_number_manual: e.part_number,
              fabricante: e.fabricante,
              descricao_manual: e.descricao,
              quantidade_solicitada: Number(e.quantidade_disponivel),
              unidade_medida_manual: e.unidade_medida || 'Unid',
              valor_unitario_manual: e.valor_unitario || 0,
              fornecedor: e.fornecedor,
              referencia: e.referencia,
              nf_entrada: e.nf_entrada,
              wbs_element: solicitacao.wbs_destino || e.wbs,
              nome_projeto: e.nome_projeto,
              centro: e.centro,
              deposito: e.deposito,
              // ✨ PRESERVA A ALOCAÇÃO ORIGINAL DO ESTOQUE
              alocacao: e.alocacao || '-',
            }));

            await db.criarVarios('solicitacoes_itens', novosItens);

            for (const e of estoqueValido) {
              await db.atualizar('estoque', e.id, {
                quantidade_disponivel: 0,
                status: 'Zerado'
              });
            }

            await db.atualizar('solicitacoes', id, { 
              observacoes: (solicitacao.observacoes || '') + '\n[NF VINCULADA]' 
            });
          }
        } else {
          let deduziuAlgo = false;

          for (const itemPedido of itensCross) {
            const sapCross = normalizar(itemPedido.desenho_sap_manual);

            const itemEstoque = estoqueValido.find(e => {
              return sapCross && normalizar(e.desenho_sap) === sapCross;
            });

            if (itemEstoque) {
              const qtdPedida = Number(itemPedido.quantidade_solicitada || 1);
              const qtdDisp = Number(itemEstoque.quantidade_disponivel || 0);
              const novoSaldo = Math.max(0, qtdDisp - qtdPedida);

              await db.atualizar('solicitacoes_itens', itemPedido.id, {
                estoque_id: itemEstoque.id, 
                part_number_manual: itemEstoque.part_number || itemPedido.part_number_manual,
                fabricante: itemEstoque.fabricante || itemPedido.fabricante,
                descricao_manual: itemEstoque.descricao || itemPedido.descricao_manual,
                valor_unitario_manual: itemEstoque.valor_unitario || itemPedido.valor_unitario_manual,
                fornecedor: itemEstoque.fornecedor || itemPedido.fornecedor,
                referencia: itemEstoque.referencia || itemPedido.referencia,
                nf_entrada: itemEstoque.nf_entrada || itemPedido.nf_entrada,
                wbs_element: solicitacao.wbs_destino || itemEstoque.wbs,
                nome_projeto: itemEstoque.nome_projeto,
                centro: itemEstoque.centro,
                deposito: itemEstoque.deposito,
                // ✨ PRESERVA A ALOCAÇÃO ORIGINAL DO ESTOQUE
                alocacao: itemEstoque.alocacao || itemPedido.alocacao || '-'
              });

              await db.atualizar('estoque', itemEstoque.id, {
                quantidade_disponivel: novoSaldo,
                status: novoSaldo <= 0 ? 'Zerado' : 'Disponível'
              });

              deduziuAlgo = true;
            }
          }

          if (deduziuAlgo) {
            await db.atualizar('solicitacoes', id, { 
              observacoes: (solicitacao.observacoes || '') + '\n[NF VINCULADA]' 
            });
          }
        }
      }
    }

    // =========================================================================
    // CENÁRIO 3: SAÍDA DE MATERIAL OU TRANSFERÊNCIA WBS
    // =========================================================================
    else if (solicitacao.tipo === 'Material' || solicitacao.tipo === 'Transferencia WBS') {
      const itensPedidos = await db.listar('solicitacoes_itens', { filter: db.f('solicitacao_id = {:sid}', { sid: id }) });

      for (const item of itensPedidos) {
        let estoqueFisico = null;

        if (item.estoque_id) estoqueFisico = await db.porId('estoque', item.estoque_id);

        if (!estoqueFisico) {
          const sapItem = normalizar(item.desenho_sap_manual);
          const pnItem = normalizar(item.part_number_manual);
          const candidatosEstoque = await db.listar('estoque', { filter: db.f('filial_id = {:filial}', { filial: solicitacao.filial_origem_id }) });

          estoqueFisico = candidatosEstoque.find(e => {
            const sapE = normalizar(e.desenho_sap);
            const pnE = normalizar(e.part_number);
            return (sapE && sapE !== '-' && sapE === sapItem) || (pnE && pnE !== '-' && pnE === pnItem);
          });

          if (estoqueFisico) await db.atualizar('solicitacoes_itens', item.id, { estoque_id: estoqueFisico.id });
        }

        if (!estoqueFisico) continue;

        const saldoAtual = Number(estoqueFisico.quantidade_disponivel || 0);
        const quantidadeRetirada = Number(item.quantidade_solicitada || 0); 

        const novoSaldo = Math.max(0, saldoAtual - quantidadeRetirada);
        const novoStatusEstoque = novoSaldo <= 0 ? 'Zerado' : 'Disponível';

        await db.atualizar('estoque', estoqueFisico.id, { quantidade_disponivel: novoSaldo, status: novoStatusEstoque });

        if (solicitacao.tipo === 'Transferencia WBS') {
          await db.criar('estoque', {
            material_id: estoqueFisico.material_id || '', filial_id: estoqueFisico.filial_id || '',
            desenho_sap: estoqueFisico.desenho_sap, part_number: estoqueFisico.part_number,
            fabricante: estoqueFisico.fabricante || '', descricao: estoqueFisico.descricao,
            nf_entrada: estoqueFisico.nf_entrada, documento_compras: estoqueFisico.documento_compras,
            quantidade_disponivel: quantidadeRetirada, status: 'Disponível', wbs: solicitacao.wbs_destino,
            nome_projeto: estoqueFisico.nome_projeto || '', is_transferencia: true,
            alocacao: estoqueFisico.alocacao || '', fornecedor: estoqueFisico.fornecedor || '',
            referencia: estoqueFisico.referencia || '', unidade_medida: estoqueFisico.unidade_medida || 'Unid',
            emissao_nf: estoqueFisico.emissao_nf || '', receb_nf: estoqueFisico.receb_nf || '',
            valor_unitario: estoqueFisico.valor_unitario || 0, centro: estoqueFisico.centro || '', deposito: estoqueFisico.deposito || '',
          });
        }
      }
    }

    // =========================================================================
    // CENÁRIO 4: REINTEGRAÇÃO / CANCELAMENTO
    // =========================================================================
    else if (solicitacao.tipo === 'Reintegracao' || solicitacao.tipo === 'Reintegração' || solicitacao.tipo === 'Cancelado') {
      let deveDevolverAoEstoque = true;
      let wbsDestinoTransferencia = null; 

      if (solicitacao.tipo === 'Cancelado' && solicitacao.observacoes) {
        const idOriginalParaCancelar = acharIdOriginalNoTexto(solicitacao.observacoes);
        if (idOriginalParaCancelar) {
          const solOriginal = await db.porId('solicitacoes', idOriginalParaCancelar);
          if (solOriginal) {
            if (solOriginal.status === 'Pendente') deveDevolverAoEstoque = false;
            if (solOriginal.tipo === 'Transferencia WBS' && (solOriginal.status === 'Em Separação' || solOriginal.status === 'Concluído')) wbsDestinoTransferencia = solOriginal.wbs_destino;
            await db.atualizar('solicitacoes', idOriginalParaCancelar, { status: 'Cancelado' });
            await db.atualizarOnde('packing_lists', db.f('solicitacao_id = {:sid}', { sid: idOriginalParaCancelar }), { status: 'Cancelado' });
          }
        }
      } else if ((solicitacao.tipo === 'Reintegracao' || solicitacao.tipo === 'Reintegração') && solicitacao.observacoes) {
        const matchPL = solicitacao.observacoes.match(/PL #(\d+)/);
        if (matchPL) {
          const plOrigem = await db.um('packing_lists', db.f('numero_pl = {:n}', { n: Number(matchPL[1]) }));
          if (plOrigem) {
            const solOrigem = await db.porId('solicitacoes', plOrigem.solicitacao_id);
            if (solOrigem && solOrigem.tipo === 'Transferencia WBS') wbsDestinoTransferencia = solOrigem.wbs_destino;
          }
        }
      }

      if (deveDevolverAoEstoque) {
        const itensReintegracao = await db.listar('solicitacoes_itens', { filter: db.f('solicitacao_id = {:sid}', { sid: id }) });
        for (const item of itensReintegracao) {
          if (!item.estoque_id) continue;
          let estoqueAtual = await db.porId('estoque', item.estoque_id);
          const quantidadeDevolvida = Number(item.quantidade_solicitada || 0);

          if (!estoqueAtual) {
            try {
              const novaLinha = await db.criar('estoque', {
                material_id: item.material_id || '', filial_id: solicitacao.filial_origem_id || '',
                desenho_sap: item.desenho_sap_manual || item.desenhoSAP || '-', part_number: item.part_number_manual || '-',
                fabricante: item.fabricante || '', descricao: item.descricao_manual || 'Item Reintegrado',
                nf_entrada: item.nf_entrada || '', documento_compras: item.documento_compras || '',
                quantidade_disponivel: quantidadeDevolvida, status: 'Disponível', wbs: item.wbs_element || '',
                nome_projeto: item.nome_projeto || '', is_transferencia: false, alocacao: item.alocacao || '',
                fornecedor: item.fornecedor || '', referencia: item.referencia || '',
                unidade_medida: item.unidade_medida_manual || 'Unid', emissao_nf: item.emissao_nf || '',
                receb_nf: item.receb_nf || '', valor_unitario: item.valor_unitario_manual || 0,
                centro: item.centro || '', deposito: item.deposito || ''
              });
              estoqueAtual = novaLinha; 
              await db.atualizar('solicitacoes_itens', item.id, { estoque_id: novaLinha.id });
            } catch (e) { continue; }
          } else {
            await db.atualizar('estoque', estoqueAtual.id, { quantidade_disponivel: Number(estoqueAtual.quantidade_disponivel || 0) + quantidadeDevolvida, status: 'Disponível' });
          }

          if (wbsDestinoTransferencia) {
            const sapOrigin = normalizar(estoqueAtual.desenho_sap);
            const pnOrigin = normalizar(estoqueAtual.part_number);
            const wbsDestinoLimpo = normalizar(wbsDestinoTransferencia);
            const candidatosAmarelos = await db.listar('estoque', { filter: db.f('is_transferencia = true && filial_id = {:filial}', { filial: estoqueAtual.filial_id || '' }) });
            const linhaAmarela = candidatosAmarelos.find(e => {
              const bateWbs = normalizar(e.wbs) === wbsDestinoLimpo;
              const bateSapPn = (normalizar(e.desenho_sap) === sapOrigin) || (normalizar(e.part_number) === pnOrigin);
              return bateWbs && bateSapPn;
            });

            if (linhaAmarela) {
              const novoSaldoAmarelo = Math.max(0, Number(linhaAmarela.quantidade_disponivel || 0) - quantidadeDevolvida);
              await db.atualizar('estoque', linhaAmarela.id, { quantidade_disponivel: novoSaldoAmarelo, status: novoSaldoAmarelo <= 0 ? 'Zerado' : 'Disponível' });
            }
          }
        }
      }
    }
  }
  return { sucesso: true, numeroPL: numeroPLGerado };
};

const extrairIdDocumento = (url) => { const m = String(url).match(/\/api\/arquivos\/([A-Za-z0-9_-]+)/); return m ? m[1] : null; }

const salvarAnexosExtras = async (solicitacaoId, anexosArray) => {
  if (!anexosArray || anexosArray.length === 0) return false;
  await db.criarVarios('anexos', anexosArray.map((anexo) => ({ solicitacao_id: solicitacaoId, nome_arquivo: anexo.nome_arquivo, url_arquivo: anexo.url_arquivo, origem: 'logistica' })));
  return true;
};

const atualizarObservacoesLogistica = async (id, texto) => {
  return await db.atualizar('solicitacoes', id, { observacoes_logistica: texto || '' });
};

const deletarAnexo = async (anexoId) => {
  const anexo = await db.porId('anexos', anexoId);
  if (anexo && anexo.url_arquivo) {
    const idDocumento = extrairIdDocumento(anexo.url_arquivo);
    if (idDocumento) { try { await db.remover('documentos', idDocumento); } catch (erro) { } }
  }
  await db.remover('anexos', anexoId);
  return true;
};

const reverterItemParaEstoque = async (idItem, qtdDevolver) => {
  const itemPedido = await db.porId('solicitacoes_itens', idItem);
  if (!itemPedido) throw new Error('Item não encontrado na solicitação.');
  if (!itemPedido.estoque_id) throw new Error('Este item não possui vínculo direto com uma prateleira de estoque para devolução.');
  const itemEstoque = await db.porId('estoque', itemPedido.estoque_id);
  if (!itemEstoque) throw new Error('Material não encontrado no estoque para devolução.');

  const qtdRealDevolver = qtdDevolver ? Number(qtdDevolver) : Number(itemPedido.quantidade_solicitada);
  await db.atualizar('estoque', itemEstoque.id, { quantidade_disponivel: Number(itemEstoque.quantidade_disponivel || 0) + qtdRealDevolver, status: 'Disponível' });

  const novaQtdPedido = Number(itemPedido.quantidade_solicitada) - qtdRealDevolver;
  if (novaQtdPedido <= 0) await db.remover('solicitacoes_itens', idItem);
  else await db.atualizar('solicitacoes_itens', idItem, { quantidade_solicitada: novaQtdPedido });

  return true;
};

const buscarHistoricoItem = async (estoqueId) => {
  const itens = await db.listar('solicitacoes_itens', { filter: db.f('estoque_id = {:eid}', { eid: String(estoqueId) }) });
  const solicitacoes = await db.listarPorIds('solicitacoes', 'id', itens.map((i) => i.solicitacao_id));
  const porId = Object.fromEntries(solicitacoes.map((s) => [s.id, solicitacaoParaFront(s)]));

  return itens.map((item) => {
    const sol = porId[item.solicitacao_id];
    return { quantidade: item.quantidade_solicitada, dataSaida: formatarDataBrasil(sol?.created_at), solicitacao: sol?.id, solicitante: sol?.nome_solicitante, status: sol?.status, wbs: sol?.wbs_destino };
  });
};

const atualizarLocalizacao = async (id, dadosLocal) => {
  const atualizacaoSol = {};
  if (dadosLocal.filial) atualizacaoSol.filial_origem_id = dadosLocal.filial;
  if (dadosLocal.data_entrega !== undefined) atualizacaoSol.data_entrega = db.paraData(dadosLocal.data_entrega);

  if (Object.keys(atualizacaoSol).length > 0) await db.atualizar('solicitacoes', id, atualizacaoSol);

  if (dadosLocal.centro || dadosLocal.deposito) {
    const atualizacaoItens = {};
    if (dadosLocal.centro) atualizacaoItens.centro = dadosLocal.centro;
    if (dadosLocal.deposito) atualizacaoItens.deposito = dadosLocal.deposito;
    await db.atualizarOnde('solicitacoes_itens', db.f('solicitacao_id = {:sid}', { sid: id }), atualizacaoItens);
  }
  return true;
};

const atualizarItensDaSolicitacao = async (solicitacaoId, itens) => {
  await db.removerOnde('solicitacoes_itens', db.f('solicitacao_id = {:sid}', { sid: solicitacaoId }));
  if (!itens || itens.length === 0) return true;

  const itensDB = itens.map((i) => ({
    solicitacao_id: solicitacaoId, estoque_id: limparIdEstoque(i.estoque_id || i.idBD), 
    desenho_sap_manual: i.desenho_sap || i.desenhoSAP || i.desenho_sap_manual || null,
    part_number_manual: i.part_number || i.numPecaFabricante || i.part_number_manual || null,
    fabricante: i.fabricante || null, fornecedor: i.fornecedor || null, referencia: i.referencia || null,
    quantidade_solicitada: Math.max(1, Number(i.qtd || i.qtdFornecida || i.quantidade_solicitada || i.quantidade || 1)),
    nf_entrada: i.nf_entrada || i.nfEntrada || null, unidade_medida_manual: i.unidade_medida || i.unidadeMedida || i.unidade_medida_manual || 'Unid',
    descricao_manual: limitarTexto(i.descricao || i.vendorDescription || i.materialDescription || i.descricao_manual || 'Sem descrição'),
    wbs_element: i.wbs_element || i.wbsElement || i.wbs || null, nome_projeto: i.nome_projeto || i.nomeProjeto || null,
    emissao_nf: i.emissao_nf || i.emissaoNF || null, receb_nf: i.receb_nf || i.recebNF || null,
    documento_compras: i.documento_compras || i.docCompras || null, valor_unitario_manual: limparValor(i.valor_unitario || i.poNetPrice || i.valor_unitario_manual),
    centro: i.centro || null, deposito: i.deposito || null, alocacao: i.alocacao || null,
  }));

  await db.criarVarios('solicitacoes_itens', itensDB);
  return true;
};

const listarDemandasPorEstoque = async (estoqueId) => {
  const itens = await db.listar('solicitacoes_itens', { filter: db.f('estoque_id = {:eid}', { eid: String(estoqueId) }) });
  const solicitacoes = await db.listarPorIds('solicitacoes', 'id', itens.map((i) => i.solicitacao_id));
  const porId = Object.fromEntries(solicitacoes.map((s) => [s.id, solicitacaoParaFront(s)]));

  const demandas = itens.filter((item) => porId[item.solicitacao_id]).map((item) => ({
    quantidade_solicitada: item.quantidade_solicitada,
    unidade_medida_manual: item.unidade_medida_manual,
    solicitacoes: porId[item.solicitacao_id],
  }));

  const edicoesCruas = await db.listar('historico_edicoes', { filter: db.f('estoque_id = {:eid}', { eid: String(estoqueId) }) });
  const edicoes = edicoesCruas.map((e) => ({ ...e, created_at: formatarDataBrasil(e.created_at) }));

  return { demandas, edicoes };
};

module.exports = {
  listarSolicitacoes, obterSolicitacaoDetalhada, criarMaterial, criarTransferencia, criarEntrada, atualizarLocalizacao,
  criarCrossdocking, criarNotaFiscal, criarReintegracao, cancelarPL, atualizarStatus, atualizarObservacoesLogistica, deletarAnexo, reverterItemParaEstoque,
  buscarHistoricoItem, salvarAnexosExtras, atualizarItensDaSolicitacao, listarDemandasPorEstoque,
};
