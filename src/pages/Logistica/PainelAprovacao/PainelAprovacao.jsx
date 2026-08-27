// =================================================================
// ARQUIVO: src/pages/Logistica/PainelAprovacao/PainelAprovacao.jsx
// DESCRIÇÃO: Painel de Aprovação com edição condicional, Modal de Recusa e Sincronização em Tempo Real
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import './PainelAprovacao.css';
import {
  Search, Clock, FileText, Check, X, Eye, Loader2,
  AlertCircle, Plus, Trash2, Save, XCircle
} from 'lucide-react';

// ✨ IMPORTAÇÃO DO SOCKET.IO E FORMATADORES
import { io } from 'socket.io-client';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import { formatarDinheiroTempoReal } from '../../../utils/formatadores';

const obterNomeFilial = (codigo) => {
  if (!codigo || codigo === '-') return 'N/D';
  const codLimpo = String(codigo).toUpperCase().trim();
  switch (codLimpo) {
    case "BR02": return "Santo André";
    case "BR04": return "Goiana";
    case "BR06": return "Betim";
    case "TODOS": return "Todas as Filiais";
    default: return codigo;
  }
};

const obterClasseBadgeTipo = (tipo) => {
  switch (tipo) {
    case "Transfer. WBS":
    case "Transferencia WBS": return "badge-tipo-amarelo";
    case "Nota Fiscal": return "badge-tipo-roxo";
    case "Entrada": return "badge-tipo-verde";
    case "Crossdocking": return "badge-tipo-ciano";
    case "Reintegração":
    case "Reintegracao": return "badge-tipo-laranja";
    case "Cancelado": return "badge-tipo-vermelho";
    case "Material":
    default: return "badge-tipo-azul";
  }
};

export default function PainelAprovacao() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert, showConfirm } = useAlert();

  const [dadosTabela, setDadosTabela] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [solicitacaoSendoEditada, setSolicitacaoSendoEditada] = useState(null);
  const [itensEdicao, setItensEdicao] = useState([]);

  const [modalRecusa, setModalRecusa] = useState({ aberto: false, idOriginal: null, motivo: '' });

  const [paginaGeral, setPaginaGeral] = useState(1);
  const [paginaEntradas, setPaginaEntradas] = useState(1);
  const itensPorPagina = 5;

  let usuarioLogado = {};
  try {
    const dadosUsuario = localStorage.getItem('@NexusLog:usuario');
    if (dadosUsuario && dadosUsuario !== 'undefined') {
      usuarioLogado = JSON.parse(dadosUsuario);
    }
  } catch (erro) { }

  const podeEditar = usuarioLogado?.cargo === 'ADM' || usuarioLogado?.cargo === 'LIDER';

  useEffect(() => {
    const buscarDados = async (silencioso = false) => {
      try {
        if (!silencioso) setCarregando(true);

        const urlSolicitacoes = `/solicitacoes/listar?limit=1000&filial=${estoqueAtual || ''}&t=${Date.now()}`;
        const urlEstoque = `/estoque/listar?t=${Date.now()}`;

        const [resultadoSol, resultadoEst] = await Promise.all([
          apiFetch(urlSolicitacoes),
          apiFetch(urlEstoque)
        ]);

        if (resultadoEst.sucesso) {
          setEstoque(resultadoEst.dados);
        }

        if (resultadoSol.sucesso) {
          const dadosFormatados = resultadoSol.dados
            .filter(item => item.status === 'Pendente')
            .map((item) => {
              let valorTotal = 0;
              let centro = '-';
              let dep = '-';

              if (String(item.tipo).trim() === 'Entrada' && item.itens && item.itens.length > 0) {
                valorTotal = item.itens.reduce((acc, it) => acc + (Number(it.quantidade_solicitada || it.qtdFornecida || it.quantidade || 0) * Number(it.valor_unitario_manual || 0)), 0);
                centro = item.itens[0].centro || 'BR06';
                dep = item.itens[0].deposito || '0020';
              }

              return {
                ...item,
                idOriginal: item.id,
                ps: item.ps || 'PS-Pendente',
                pl: item.pl || item.bs || null,
                dataSolicitacao: item.dataSolicitacao || '-',
                valorTotalFormatado: valorTotal > 0 ? `R$ ${valorTotal.toFixed(2)}` : null,
                centro,
                deposito: dep,
                filial: item.filial || '-'
              };
            });

          setDadosTabela(dadosFormatados);
        }
      } catch (error) {
        console.error("Falha ao conectar à API do NexusLog:", error.message);
        if (!silencioso) showAlert("Erro de Conexão", "Não foi possível carregar as solicitações do servidor.", "error");
      } finally {
        if (!silencioso) setCarregando(false);
      }
    };

    buscarDados();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const SOCKET_URL = API_URL.replace(/\/api\/?$/, ''); 

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('solicitacoes_atualizadas', () => {
      buscarDados(true); 
    });

    return () => {
      socket.disconnect(); 
    };
  }, [estoqueAtual]);

  // ✨ FUNÇÃO INTELIGENTE (À PROVA DE BALAS): Agora ignora completamente nulos, undefined e vazios!
  const obterValorSeguro = (item, chaveFront, chaveBack, chaveEstoque) => {
    
    const validarValor = (valor) => {
      if (valor === undefined || valor === null) return false;
      const str = String(valor).trim();
      if (str === '' || str === '-' || str === 'null') return false;
      return true;
    };

    // 1. Tenta pegar do que o utilizador acabou de editar no Front
    if (validarValor(item[chaveFront])) return item[chaveFront];
    
    // 2. Tenta pegar do que veio da tabela de solicitações (Back)
    if (validarValor(item[chaveBack])) return item[chaveBack];
    
    // 3. Se for Retirada/Transferência, cruza as colunas em falta com o Estoque físico real!
    if (item.estoque_id && estoque.length > 0) {
      const itemFisico = estoque.find(e => e.id === item.estoque_id);
      if (itemFisico && validarValor(itemFisico[chaveEstoque])) {
        return itemFisico[chaveEstoque];
      }
    }
    
    return ''; // Se não achar de todo, devolve vazio limpo para a tabela
  };

  const dadosFiltrados = dadosTabela.filter((linha) => {
    if (!termoPesquisa) return true;
    const termoLower = termoPesquisa.toLowerCase();
    return (
      (linha.ps && linha.ps.toLowerCase().includes(termoLower)) ||
      (linha.solicitante && linha.solicitante.toLowerCase().includes(termoLower)) ||
      (linha.wbs && linha.wbs.toLowerCase().includes(termoLower)) ||
      (linha.filial && linha.filial.toLowerCase().includes(termoLower))
    );
  });

  const entradasPendentes = dadosFiltrados.filter(item => String(item.tipo).trim() === 'Entrada');
  const outrasPendentes = dadosFiltrados.filter(item => String(item.tipo).trim() !== 'Entrada');

  const totalPaginasGeral = Math.max(1, Math.ceil(outrasPendentes.length / itensPorPagina));
  const indexPrimeiroGeral = (paginaGeral - 1) * itensPorPagina;
  const indexUltimoGeral = paginaGeral * itensPorPagina;
  const outrasPendentesPaginadas = outrasPendentes.slice(indexPrimeiroGeral, indexUltimoGeral);

  const totalPaginasEntradas = Math.max(1, Math.ceil(entradasPendentes.length / itensPorPagina));
  const indexPrimeiroEntradas = (paginaEntradas - 1) * itensPorPagina;
  const indexUltimoEntradas = paginaEntradas * itensPorPagina;
  const entradasPendentesPaginadas = entradasPendentes.slice(indexPrimeiroEntradas, indexUltimoEntradas);

  const toggleLinha = (idUnico, linha) => {
    if (linhaExpandida === idUnico) {
      setLinhaExpandida(null);
      setSolicitacaoSendoEditada(null);
      setItensEdicao([]);
    } else {
      setLinhaExpandida(idUnico);
      setSolicitacaoSendoEditada(linha);
      setItensEdicao(linha.itens ? JSON.parse(JSON.stringify(linha.itens)) : []);
    }
  };

  const adicionarLinhaItem = () => {
    if (itensEdicao.length >= 20) {
      showAlert("Limite Atingido", "Não é possível adicionar mais do que 20 itens nesta solicitação.", "warning");
      return;
    }

    setItensEdicao([...itensEdicao, {
      id_temporario: `novo-${Date.now()}`,
      desenhoSAP: '',
      referencia: '',
      vendorDescription: '',
      numPecaFabricante: '',
      qtdFornecida: 1,
      unidadeMedida: 'Unid',
      nfEntrada: '',
      fornecedor: '',
      wbsElement: '',
      nomeProjeto: '',
      emissaoNF: '',
      recebNF: '',
      docCompras: '',
      poNetPrice: '',
      centro: '',
      deposito: '',
      alocacao: ''
    }]);
  };

  const removerLinhaItem = (indexParaRemover) => {
    if (itensEdicao.length <= 1) {
      showAlert("Ação Bloqueada", "A solicitação deve conter pelo menos 1 item.", "warning");
      return;
    }
    setItensEdicao(itensEdicao.filter((_, index) => index !== indexParaRemover));
  };

  const atualizarCampoItem = (index, campo, valor) => {
    const novosItens = [...itensEdicao];
    let valorValidado = valor;
    
    if (campo === 'qtdFornecida') {
      if (valor === '') {
        valorValidado = ''; 
      } else {
        valorValidado = parseInt(valor, 10);
        if (isNaN(valorValidado) || valorValidado < 1) valorValidado = 1;
      }
    }
    
    novosItens[index][campo] = valorValidado;
    setItensEdicao(novosItens);
  };

  const salvarEdicaoItens = async () => {
    if (!solicitacaoSendoEditada) return;
    
    if (itensEdicao.some(i => !i.qtdFornecida && !i.quantidade_solicitada)) {
      showAlert("Atenção", "Preencha a quantidade em todos os itens antes de salvar.", "warning");
      return;
    }

    const itensParaEnviar = itensEdicao.map(i => ({
      ...i,
      desenho_sap_manual: obterValorSeguro(i, 'desenhoSAP', 'desenho_sap_manual', 'desenho_sap') || '-',
      part_number_manual: obterValorSeguro(i, 'numPecaFabricante', 'part_number_manual', 'part_number') || '-',
      descricao_manual: obterValorSeguro(i, 'vendorDescription', 'descricao_manual', 'descricao') || 'Sem descrição',
      quantidade_solicitada: parseInt(i.qtdFornecida || i.quantidade_solicitada, 10) || 1,
      unidade_medida_manual: obterValorSeguro(i, 'unidadeMedida', 'unidade_medida_manual', 'unidade_medida') || 'Unid',
      fornecedor: obterValorSeguro(i, 'fornecedor', 'fornecedor', 'fornecedor') || null,
      referencia: obterValorSeguro(i, 'referencia', 'referencia', 'referencia') || null,
      nf_entrada: obterValorSeguro(i, 'nfEntrada', 'nf_entrada', 'nf_entrada') || null,
      wbs_element: obterValorSeguro(i, 'wbsElement', 'wbs_element', 'wbs') || null,
      nome_projeto: obterValorSeguro(i, 'nomeProjeto', 'nome_projeto', 'nome_projeto') || null,
      emissao_nf: obterValorSeguro(i, 'emissaoNF', 'emissao_nf', 'emissao_nf') || null,
      receb_nf: obterValorSeguro(i, 'recebNF', 'receb_nf', 'receb_nf') || null,
      documento_compras: obterValorSeguro(i, 'docCompras', 'documento_compras', 'documento_compras') || null,
      valor_unitario_manual: obterValorSeguro(i, 'poNetPrice', 'valor_unitario_manual', 'valor_unitario') || null,
      centro: obterValorSeguro(i, 'centro', 'centro', 'centro') || null,
      deposito: obterValorSeguro(i, 'deposito', 'deposito', 'deposito') || null,
      alocacao: obterValorSeguro(i, 'alocacao', 'alocacao', 'alocacao') || null
    }));

    try {
      const resposta = await apiFetch(`/solicitacoes/${solicitacaoSendoEditada.idOriginal}/itens`, {
        method: 'PATCH',
        body: JSON.stringify({ itens: itensParaEnviar })
      });

      if (resposta.sucesso) {
        setDadosTabela(prev => prev.map(item => {
          if (item.idOriginal === solicitacaoSendoEditada.idOriginal) {
            return { ...item, itens: itensParaEnviar }; 
          }
          return item;
        }));
        setLinhaExpandida(null);
        showAlert("Sucesso!", "Os itens da solicitação foram salvos com sucesso.", "success");
      } else {
        showAlert("Erro", resposta.erro || "O servidor recusou a atualização dos itens.", "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", "Falha ao conectar com o servidor.", "error");
    }
  };

  const handleAprovar = async (e, idOriginal) => {
    e.stopPropagation();
    const confirmado = await showConfirm(
      "Aprovar Solicitação",
      "Tem certeza que deseja aprovar esta solicitação?",
      "warning",
      "Sim, Aprovar"
    );

    if (confirmado) {
      try {
        const resposta = await apiFetch(`/solicitacoes/${idOriginal}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Em Separação' })
        });

        if (resposta.sucesso) {
          const solAprovada = dadosTabela.find(s => s.idOriginal === idOriginal);
          setDadosTabela(prev => prev.filter(item => item.idOriginal !== idOriginal));
          setLinhaExpandida(null);

          if (solAprovada && solAprovada.tipo === 'Cancelado') {
            showAlert("Cancelamento Aprovado", "O pedido original foi cancelado no sistema e o estoque devolvido com sucesso.", "success");
            setTimeout(() => window.location.reload(), 1500); 
            return;
          }
          showAlert("Solicitação Aprovada", "A solicitação foi aprovada e enviada para separação com sucesso!", "success");
        } else {
          showAlert("Erro no Servidor", resposta.erro || "Não foi possível aprovar a solicitação.", "error");
        }
      } catch (error) {
        showAlert("Erro de Conexão", "Falha de comunicação com o servidor.", "error");
      }
    }
  };

  const abrirModalRecusa = (e, idOriginal) => {
    e.stopPropagation();
    setModalRecusa({ aberto: true, idOriginal, motivo: '' });
  };

  const confirmarRecusa = async () => {
    if (!modalRecusa.motivo.trim()) {
      showAlert("Atenção", "Por favor, informe um motivo para recusar esta solicitação.", "warning");
      return;
    }

    try {
      const resposta = await apiFetch(`/solicitacoes/${modalRecusa.idOriginal}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Recusado', motivo_recusa: modalRecusa.motivo })
      });

      if (resposta.sucesso) {
        setDadosTabela(prev => prev.filter(item => item.idOriginal !== modalRecusa.idOriginal));
        setLinhaExpandida(null);
        setModalRecusa({ aberto: false, idOriginal: null, motivo: '' }); 
        showAlert("Solicitação Recusada", "A solicitação foi recusada e o solicitante será notificado.", "info");
      } else {
        showAlert("Erro no Servidor", resposta.erro || "Não foi possível recusar a solicitação.", "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", "Falha de comunicação com o servidor.", "error");
    }
  };

  const renderizarGavetaEdicao = () => {
    const editavel = solicitacaoSendoEditada?.tipo === 'Entrada';
    
    const limiteAtingido = itensEdicao.length >= 20;
    const limiteMinimo = itensEdicao.length <= 1;

    const estiloInput = { 
      width: '100%', padding: '6px', border: editavel ? '1px solid #cbd5e1' : 'none', 
      borderRadius: '4px', fontSize: '0.85rem', backgroundColor: editavel ? '#ffffff' : 'transparent',
      color: '#334155', appearance: editavel ? 'auto' : 'none', fontFamily: 'inherit'
    };

    return (
      <div className="gaveta-detalhes" style={{ padding: '24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h4 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#0284c7" /> 
              {editavel ? 'Itens da Entrada (Modo de Edição)' : `Itens da Solicitação (${solicitacaoSendoEditada?.tipo})`}
            </h4>
            
            {editavel && (
              <span style={{ fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px' }}>
                {itensEdicao.length} / 20 itens
              </span>
            )}
          </div>
          
          {editavel && (
            <button
              onClick={adicionarLinhaItem}
              disabled={limiteAtingido}
              title={limiteAtingido ? "Limite de 20 itens atingido" : "Adicionar Nova Linha"}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
                background: '#fff', color: limiteAtingido ? '#94a3b8' : '#334155', 
                border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', 
                cursor: limiteAtingido ? 'not-allowed' : 'pointer', opacity: limiteAtingido ? 0.6 : 1
              }}
            >
              <Plus size={14} /> Adicionar Nova Linha
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto', marginBottom: '20px', paddingBottom: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2400px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {editavel && <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569', textAlign: 'center', width: '60px' }}>AÇÕES</th>}
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>NUM SAP | DESENHO</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>REFERÊNCIA</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569', minWidth: '200px' }}>DESCRIÇÃO</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>FABRICANTE</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569', width: '120px', textAlign: 'center' }}>QTDE</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569', width: '140px' }}>UNID. MEDIDA</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>NUM DA NOTA FISCAL</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>FORNECEDOR / REGISTRO</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>CENTRO DE CUSTO - WBS</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>NOME CENTRO DE CUSTO / PROJETO</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>EMISSÃO NF</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>RECEB. NF</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>Nº PEDIDO DE COMPRA / CPV</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>VLR. UNITÁRIO NOTA FISCAL</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569', width: '100px' }}>FILIAL</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569', width: '100px' }}>DEPÓSITO</th>
                <th style={{ padding: '8px', fontSize: '0.75rem', color: '#475569' }}>ALOCAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {itensEdicao.map((item, index) => (
                <tr key={item.id || item.id_temporario || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  
                  {editavel && (
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <button 
                        onClick={() => removerLinhaItem(index)} 
                        disabled={limiteMinimo}
                        title={limiteMinimo ? "A solicitação precisa de pelo menos 1 item." : "Remover linha"}
                        style={{ background: 'none', border: 'none', padding: '4px', color: limiteMinimo ? '#cbd5e1' : '#ef4444', cursor: limiteMinimo ? 'not-allowed' : 'pointer' }} 
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                  
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'desenhoSAP', 'desenho_sap_manual', 'desenho_sap')} onChange={(e) => atualizarCampoItem(index, 'desenhoSAP', e.target.value)} style={estiloInput} placeholder="SAP / Desenho" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'referencia', 'referencia', 'referencia')} onChange={(e) => atualizarCampoItem(index, 'referencia', e.target.value)} style={estiloInput} placeholder="Referência" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'vendorDescription', 'descricao_manual', 'descricao')} onChange={(e) => atualizarCampoItem(index, 'vendorDescription', e.target.value)} style={estiloInput} placeholder="Descrição" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'numPecaFabricante', 'part_number_manual', 'part_number')} onChange={(e) => atualizarCampoItem(index, 'numPecaFabricante', e.target.value)} style={estiloInput} placeholder="PN" />
                  </td>

                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    {editavel ? (
                      <input 
                        type="number" min="1" step="1"
                        value={item.qtdFornecida || item.quantidade_solicitada || 1} 
                        onKeyDown={(e) => { if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                        onBlur={(e) => { if (!e.target.value || parseInt(e.target.value, 10) < 1) atualizarCampoItem(index, 'qtdFornecida', 1); }}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val === '0') val = '1';
                          atualizarCampoItem(index, 'qtdFornecida', val);
                        }} 
                        style={{ ...estiloInput, width: '75px', textAlign: 'center', color: '#2563eb', fontWeight: '700', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }} 
                      />
                    ) : (
                      <span style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '6px', fontWeight: '700' }}>
                        {item.qtdFornecida || item.quantidade_solicitada || 1}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '6px 8px' }}>
                    <select disabled={!editavel} value={obterValorSeguro(item, 'unidadeMedida', 'unidade_medida_manual', 'unidade_medida') || 'Unid'} onChange={(e) => atualizarCampoItem(index, 'unidadeMedida', e.target.value)} style={estiloInput}>
                      <option value="Unid">Unid</option>
                      <option value="Kg">Kg</option>
                      <option value="Metro">Metro</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Litro">Litro</option>
                      <option value="NR">NR</option>
                    </select>
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'nfEntrada', 'nf_entrada', 'nf_entrada')} onChange={(e) => atualizarCampoItem(index, 'nfEntrada', e.target.value)} style={estiloInput} placeholder="NF Entrada" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'fornecedor', 'fornecedor', 'fornecedor')} onChange={(e) => atualizarCampoItem(index, 'fornecedor', e.target.value)} style={estiloInput} placeholder="Fornecedor" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'wbsElement', 'wbs_element', 'wbs')} onChange={(e) => atualizarCampoItem(index, 'wbsElement', e.target.value)} style={{...estiloInput, color: '#2563eb', fontFamily: 'monospace'}} placeholder="WBS" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'nomeProjeto', 'nome_projeto', 'nome_projeto')} onChange={(e) => atualizarCampoItem(index, 'nomeProjeto', e.target.value)} style={estiloInput} placeholder="Nome Projeto" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="date" readOnly={!editavel} value={obterValorSeguro(item, 'emissaoNF', 'emissao_nf', 'emissao_nf')} onChange={(e) => atualizarCampoItem(index, 'emissaoNF', e.target.value)} style={estiloInput} />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="date" readOnly={!editavel} value={obterValorSeguro(item, 'recebNF', 'receb_nf', 'receb_nf')} onChange={(e) => atualizarCampoItem(index, 'recebNF', e.target.value)} style={estiloInput} />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'docCompras', 'documento_compras', 'documento_compras')} onChange={(e) => atualizarCampoItem(index, 'docCompras', e.target.value)} style={estiloInput} placeholder="Doc Compras" />
                  </td>
                  
                  <td style={{ padding: '6px 8px' }}>
                    <input 
                      type="text" 
                      readOnly={!editavel} 
                      value={obterValorSeguro(item, 'poNetPrice', 'valor_unitario_manual', 'valor_unitario')} 
                      onChange={(e) => {
                        const valorLimpo = formatarDinheiroTempoReal(e.target.value);
                        atualizarCampoItem(index, 'poNetPrice', valorLimpo);
                      }} 
                      style={estiloInput} 
                      placeholder="R$ 0,00" 
                    />
                  </td>

                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'centro', 'centro', 'centro')} onChange={(e) => atualizarCampoItem(index, 'centro', e.target.value)} style={estiloInput} placeholder="Centro" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'deposito', 'deposito', 'deposito')} onChange={(e) => atualizarCampoItem(index, 'deposito', e.target.value)} style={estiloInput} placeholder="Depósito" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" readOnly={!editavel} value={obterValorSeguro(item, 'alocacao', 'alocacao', 'alocacao')} onChange={(e) => atualizarCampoItem(index, 'alocacao', e.target.value)} style={{...estiloInput, color: '#3b82f6', fontFamily: 'monospace'}} placeholder="Alocação" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {itensEdicao.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.875rem' }}>
              Não existem itens nesta solicitação.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={() => toggleLinha(linhaExpandida, solicitacaoSendoEditada)}
            style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {editavel ? 'Cancelar' : 'Fechar Visão'}
          </button>
          
          {editavel && (
            <button
              onClick={salvarEdicaoItens}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <Save size={16} /> Guardar Alterações
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      <header className="acompanhamento-cabecalho">
        <h1>Painel de Aprovação</h1>
        <p>Analise e aprove as solicitações pendentes para dar andamento à operação.</p>
      </header>

      <div className="pesquisa-wrapper-direita">
        <Search className="icone-pesquisa-dir" size={18} />
        <input
          type="text"
          placeholder="Buscar por PS, WBS, Filial ou Solicitante..."
          value={termoPesquisa}
          onChange={(e) => setTermoPesquisa(e.target.value)}
        />
      </div>

      {carregando ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#94a3b8' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
          <span>Carregando solicitações...</span>
        </div>
      ) : (
        <>
          {/* SECÇÃO 1: SOLICITAÇÕES GERAIS */}
          <div className="seccao-painel tema-amarelo">
            <div className="seccao-header borda-amarela">
              <div className="seccao-titulo amarelo">
                <Clock size={20} />
                Solicitações Pendentes
              </div>
              <span className="badge-contagem-seccao amarelo">{outrasPendentes.length}</span>
            </div>

            {outrasPendentes.length === 0 ? (
              <div className="estado-vazio-seccao">
                <div className="circulo-check verde-claro">
                  <Check size={24} />
                </div>
                <span>Nenhuma solicitação pendente</span>
              </div>
            ) : (
              <>
                <div className="lista-solicitacoes">
                  {outrasPendentesPaginadas.map((linha) => {
                    const idUnico = `geral-${linha.idOriginal}`;
                    const isExpandida = linhaExpandida === idUnico;
                    const isCrossdocking = linha.tipo === 'Crossdocking';
                    let nfNoEstoque = true;

                    if (isCrossdocking && linha.nfCrossdocking) {
                      nfNoEstoque = estoque.some(itemEstoque => itemEstoque.nf_entrada === linha.nfCrossdocking);
                    }

                    return (
                      <React.Fragment key={idUnico}>
                        <div className="item-lista-horizontal">
                          <div className="item-info-principal">
                            <div className="item-linha-id">
                              {linha.ps}
                              <span className={`badge-tipo-lista ${obterClasseBadgeTipo(linha.tipo)}`}>{linha.tipo}</span>
                            </div>
                            <div className="item-meta-info">
                              WBS: <a href="#" className="link-wbs">{linha.wbs}</a> &middot;
                              {linha.itens?.length || 0} itens &middot;
                              {linha.solicitante}
                            </div>
                          </div>

                          <div className="item-acoes-grupo">
                            <button className="btn-acao-lista btn-ver-itens" onClick={() => toggleLinha(idUnico, linha)}>
                              <Eye size={16} /> {isExpandida ? "Fechar Itens" : "Ver Itens"}
                            </button>

                            {isCrossdocking && !nfNoEstoque ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', marginLeft: '12px' }}>
                                <AlertCircle size={16} /> Aguardando NF {linha.nfCrossdocking}
                              </div>
                            ) : (
                              <>
                                <button className="btn-acao-lista btn-recusar-outline" onClick={(e) => abrirModalRecusa(e, linha.idOriginal)}>
                                  <X size={16} /> Recusar
                                </button>
                                <button className="btn-acao-lista btn-aprovar-solid azul" onClick={(e) => handleAprovar(e, linha.idOriginal)}>
                                  <Check size={16} /> Aprovar
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isExpandida && renderizarGavetaEdicao()}

                      </React.Fragment>
                    );
                  })}
                </div>

                {totalPaginasGeral > 1 && (
                  <div className="paginacao-container">
                    <button
                      className="btn-paginacao"
                      disabled={paginaGeral === 1}
                      onClick={() => setPaginaGeral(p => p - 1)}
                    >
                      Anterior
                    </button>
                    <span className="texto-paginacao">Página {paginaGeral} de {totalPaginasGeral}</span>
                    <button
                      className="btn-paginacao"
                      disabled={paginaGeral === totalPaginasGeral}
                      onClick={() => setPaginaGeral(p => p + 1)}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* SECÇÃO 2: ENTRADAS DE ESTOQUE */}
          <div className="seccao-painel tema-verde">
            <div className="seccao-header borda-verde">
              <div className="seccao-titulo verde">
                <FileText size={20} />
                Entradas de Estoque Pendentes
              </div>
              <span className="badge-contagem-seccao verde">{entradasPendentes.length}</span>
            </div>

            {entradasPendentes.length === 0 ? (
              <div className="estado-vazio-seccao">
                <div className="circulo-check verde-claro">
                  <Check size={24} />
                </div>
                <span>Nenhuma entrada pendente</span>
              </div>
            ) : (
              <>
                <div className="lista-solicitacoes">
                  {entradasPendentesPaginadas.map((linha) => {
                    const idUnico = `entrada-${linha.idOriginal}`;
                    const isExpandida = linhaExpandida === idUnico;

                    return (
                      <React.Fragment key={idUnico}>
                        <div className="item-lista-horizontal">
                          <div className="item-info-principal">
                            <div className="item-linha-id">
                              {linha.ps}
                              <span className={`badge-tipo-lista ${obterClasseBadgeTipo(linha.tipo)}`}>{linha.tipo}</span>
                            </div>
                            <div className="item-meta-info">
                              WBS: <a href="#" className="link-wbs">{linha.wbs}</a> &middot;
                              {linha.itens?.length || 0} itens &middot;
                              {linha.solicitante}
                            </div>
                          </div>

                          <div className="item-acoes-grupo">
                            <button className="btn-acao-lista btn-ver-itens" onClick={() => toggleLinha(idUnico, linha)}>
                              <Eye size={16} /> {isExpandida ? "Fechar Itens" : "Ver / Editar Itens"}
                            </button>

                            <button className="btn-acao-lista btn-recusar-outline" onClick={(e) => abrirModalRecusa(e, linha.idOriginal)}>
                              <X size={16} /> Recusar
                            </button>
                            <button className="btn-acao-lista btn-aprovar-solid" onClick={(e) => handleAprovar(e, linha.idOriginal)}>
                              <Check size={16} /> Aprovar
                            </button>
                          </div>
                        </div>

                        {isExpandida && renderizarGavetaEdicao()}

                      </React.Fragment>
                    );
                  })}
                </div>

                {totalPaginasEntradas > 1 && (
                  <div className="paginacao-container">
                    <button
                      className="btn-paginacao"
                      disabled={paginaEntradas === 1}
                      onClick={() => setPaginaEntradas(p => p - 1)}
                    >
                      Anterior
                    </button>
                    <span className="texto-paginacao">Página {paginaEntradas} de {totalPaginasEntradas}</span>
                    <button
                      className="btn-paginacao"
                      disabled={paginaEntradas === totalPaginasEntradas}
                      onClick={() => setPaginaEntradas(p => p + 1)}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ✨ O NOVO MODAL DE RECUSA */}
      {modalRecusa.aberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px',
            width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: '#dc2626' }}>
              <div style={{ backgroundColor: '#fef2f2', padding: '8px', borderRadius: '50%' }}>
                <XCircle size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>Recusar Solicitação</h3>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px', marginTop: 0, lineHeight: '1.5' }}>
              Por favor, informe o motivo da recusa. Esta informação será enviada e ficará visível para o solicitante.
            </p>
            
            <textarea
              autoFocus
              value={modalRecusa.motivo}
              onChange={(e) => setModalRecusa({ ...modalRecusa, motivo: e.target.value })}
              placeholder="Digite o motivo aqui..."
              style={{
                width: '100%', minHeight: '120px', padding: '12px', borderRadius: '8px',
                border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical',
                fontSize: '0.875rem', color: '#334155', boxSizing: 'border-box',
                marginBottom: '24px', backgroundColor: '#f8fafc'
              }}
            />
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalRecusa({ aberto: false, idOriginal: null, motivo: '' })}
                style={{
                  padding: '10px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRecusa}
                style={{
                  padding: '10px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#dc2626', color: '#fff', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s'
                }}
              >
                <X size={16} /> Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}