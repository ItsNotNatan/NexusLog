import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, Archive, Calendar, User, Box, ArrowUpRight, ArrowRightLeft, ArrowDownLeft, XCircle, FileText, X, ChevronLeft, ChevronRight, Filter, RotateCcw, Activity } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import PaginacaoTabela from "../../../components/PaginacaoTabela/PaginacaoTabela";
import FiltroTraceabillyModal from "../../../components/FiltroTraceabillyModal/FiltroTraceabillyModal";
import './Traceabilly.css';

export default function Traceabilly({ perfil }) {
  const { estoqueAtual, usuario } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [itensArquivados, setItensArquivados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  const [recarregar, setRecarregar] = useState(0);

  const [modalReverter, setModalReverter] = useState(false);
  const [itemReverter, setItemReverter] = useState(null);
  const [qtdReverter, setQtdReverter] = useState(1);

  // ✨ ESTADOS DO NOVO MODAL DE CICLO DE VIDA (DUPLO CLIQUE)
  const [modalCicloVida, setModalCicloVida] = useState(false);
  const [detalhesCicloVida, setDetalhesCicloVida] = useState(null);
  const [movimentosCicloVida, setMovimentosCicloVida] = useState([]);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    tipoOriginal: '', desenhoSAP: '', partNumber: '', nfEntrada: '', bsSaida: '', solicitante: '', wbs: '', alocacao: ''
  });

  const isAdminOuLider = perfil !== 'cliente' && (usuario?.cargo === 'ADM' || usuario?.cargo === 'LIDER');

  useEffect(() => {
    setPaginaAtual(1);
  }, [termoPesquisa, filtrosAvancados]);

  const formatarData = (dataISO) => {
    if (!dataISO) return '-';
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return '-';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  const getIniciais = (nome) => {
    if (!nome) return '?';
    return nome.charAt(0).toUpperCase();
  };

  const renderFluxo = (tipo) => {
    switch(tipo) {
      case 'Material': 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}><ArrowUpRight size={14}/> Retirada de Material</span>;
      case 'Transferencia WBS':
      case 'Transfer. WBS': 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fefce8', color: '#ca8a04', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fde047', whiteSpace: 'nowrap' }}><ArrowRightLeft size={14}/> Transferência WBS</span>;
      case 'Reintegracao':
      case 'Reintegração': 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #a7f3d0', whiteSpace: 'nowrap' }}><RotateCcw size={14}/> Reintegração de Item</span>;
      case 'Entrada': 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #a7f3d0', whiteSpace: 'nowrap' }}><ArrowDownLeft size={14}/> Entrada de Estoque</span>;
      case 'Crossdocking': 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#faf5ff', color: '#9333ea', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #e9d5ff', whiteSpace: 'nowrap' }}><ArrowUpRight size={14}/> Saída Crossdocking</span>;
      case 'Cancelado': 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}><XCircle size={14}/> Estorno / Cancelado</span>;
      case 'Nota Fiscal': 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}><FileText size={14}/> Nota Fiscal</span>;
      default: 
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{tipo || 'Operação Padrão'}</span>;
    }
  };

  useEffect(() => {
    const buscarHistorico = async () => {
      try {
        setCarregando(true);
        
        const urlEstoque = estoqueAtual === 'TODOS' ? '/estoque/listar?rastreabilidade=true' : `/estoque/listar?filial_id=${estoqueAtual}&rastreabilidade=true`;
        const resEstoque = await apiFetch(urlEstoque);
        
        const urlSol = estoqueAtual === 'TODOS' ? '?limit=1000' : `?filial=${estoqueAtual}&limit=1000`;
        const resSol = await apiFetch(`/solicitacoes/listar${urlSol}`);
        
        if (resEstoque.sucesso && resSol.sucesso) {
          const itensZerados = resEstoque.dados.filter(e => e.status === 'Zerado' || e.quantidade_disponivel <= 0);
          const setIdsZerados = new Set(itensZerados.map(e => e.id));

          const movimentos = resSol.dados.filter(sol => 
            ['Em Separação', 'Concluído', 'Reintegrado', 'Cancelado'].includes(sol.status)
          );

          const itemsList = [];
          movimentos.forEach(sol => {
            if (sol.itens && sol.itens.length > 0) {
              sol.itens.forEach(it => {
                if (it.estoque_id && setIdsZerados.has(it.estoque_id)) {
                  const isEntrada = sol.tipo === 'Entrada' || sol.tipo === 'Reintegracao' || sol.tipo === 'Reintegração';
                  const notaFiscalFinal = it.nf_entrada || it.nfEntrada || it.nf || sol.nfCrossdocking || sol.nf_entrada || '-';

                  itemsList.push({
                    idUnico: `${sol.id}-${it.id}`,
                    idItem: it.id, 
                    estoqueId: it.estoque_id, // ✨ NOVO: Guarda o ID físico para cruzar o ciclo de vida
                    tipoOriginal: sol.tipo, 
                    desenhoSAP: it.desenho_sap_manual || '-',
                    partNumber: it.part_number_manual || '-',
                    descricao: it.descricao_manual || 'Sem descrição',
                    nfEntrada: notaFiscalFinal,
                    bsSaida: sol.pl || '-', 
                    solicitacao: sol.ps || '-',
                    solicitante: sol.solicitante || '-',
                    alocacao: it.alocacao || sol.tipo || '-',
                    
                    isEntrada,
                    qtdMovimentada: Number(it.quantidade_solicitada || 0),
                    unidadeMedida: it.unidade_medida_manual || 'Un',
                    
                    wbs: sol.wbs || '-',
                    dataSaida: formatarData(sol.dataFinalizacaoISO || sol.dataCriacaoISO),
                    dataSort: new Date(sol.dataFinalizacaoISO || sol.dataCriacaoISO).getTime()
                  });
                }
              });
            }
          });

          itemsList.sort((a, b) => b.dataSort - a.dataSort);
          setItensArquivados(itemsList);
        } else {
          showAlert("Erro", resSol.erro || resEstoque.erro, "error");
        }
      } catch (error) {
        showAlert("Erro de Conexão", "Não foi possível carregar o histórico de movimentações.", "error");
      } finally {
        setCarregando(false);
      }
    };
    
    if (estoqueAtual) {
      buscarHistorico();
    }
  }, [estoqueAtual, showAlert, recarregar]);

  // ✨ FUNÇÃO PARA ABRIR O CICLO DE VIDA (DUPLO CLIQUE)
  const handleDoubleClickRow = (item) => {
    if (!item.estoqueId) return;
    
    // Filtra todas as movimentações deste ID de estoque específico, ordenadas da mais antiga para a mais recente
    const historicoCompleto = itensArquivados
      .filter(i => i.estoqueId === item.estoqueId)
      .sort((a, b) => a.dataSort - b.dataSort);
      
    setMovimentosCicloVida(historicoCompleto);
    setDetalhesCicloVida({
      partNumber: item.partNumber,
      desenhoSAP: item.desenhoSAP,
      descricao: item.descricao,
      nfEntrada: item.nfEntrada
    });
    setModalCicloVida(true);
  };

  const abrirModalReverter = (item) => {
    setItemReverter(item);
    setQtdReverter(item.qtdMovimentada); 
    setModalReverter(true);
  };

  const confirmarReversao = async () => {
    const qtdNum = Number(qtdReverter);
    if (!qtdNum || qtdNum <= 0 || qtdNum > itemReverter.qtdMovimentada) {
      showAlert("Quantidade Inválida", `A quantidade a devolver deve ser maior que 0 e no máximo ${itemReverter.qtdMovimentada}.`, "warning");
      return;
    }

    try {
      setCarregando(true);
      const resposta = await apiFetch('/solicitacoes/reverter', {
        method: 'POST',
        body: JSON.stringify({ id_item: itemReverter.idItem, quantidade: qtdNum })
      });

      if (resposta.sucesso) {
        showAlert("Sucesso", "A quantidade foi revertida para o estoque com sucesso!", "success");
        setModalReverter(false);
        setRecarregar(prev => prev + 1); 
      } else {
        showAlert("Erro de Servidor", resposta.erro, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível comunicar com o servidor ao reverter o item.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const handleLimparFiltros = () => {
    setFiltrosAvancados({ tipoOriginal: '', desenhoSAP: '', partNumber: '', nfEntrada: '', bsSaida: '', solicitante: '', wbs: '', alocacao: '' });
  };

  const passaNoFiltro = (valorItem, valorFiltro) => {
    if (!valorFiltro) return true;
    const tagsArray = String(valorFiltro).split(',');
    return tagsArray.includes(String(valorItem));
  };

  const historicoFiltrado = itensArquivados.filter(item => {
    if (termoPesquisa) {
      const termo = termoPesquisa.toLowerCase();
      const textoBuscavel = `${item.partNumber} ${item.nfEntrada} ${item.bsSaida} ${item.wbs} ${item.solicitante} ${item.solicitacao} ${item.desenhoSAP}`.toLowerCase();
      if (!textoBuscavel.includes(termo)) return false;
    }

    if (!passaNoFiltro(item.tipoOriginal, filtrosAvancados.tipoOriginal)) return false;
    if (!passaNoFiltro(item.desenhoSAP, filtrosAvancados.desenhoSAP)) return false;
    if (!passaNoFiltro(item.partNumber, filtrosAvancados.partNumber)) return false;
    if (!passaNoFiltro(item.nfEntrada, filtrosAvancados.nfEntrada)) return false;
    if (!passaNoFiltro(item.solicitante, filtrosAvancados.solicitante)) return false;
    if (!passaNoFiltro(item.wbs, filtrosAvancados.wbs)) return false;
    if (!passaNoFiltro(item.alocacao, filtrosAvancados.alocacao)) return false;

    if (filtrosAvancados.bsSaida) {
      const bsOuSolicitacao = item.bsSaida !== '-' ? item.bsSaida : item.solicitacao;
      if (!passaNoFiltro(bsOuSolicitacao, filtrosAvancados.bsSaida)) return false;
    }

    return true;
  });

  const totalRegistrosFiltrados = historicoFiltrado.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistrosFiltrados / itensPorPagina));
  const indexPrimeiroItem = (paginaAtual - 1) * itensPorPagina;
  const indexUltimoItem = Math.min(paginaAtual * itensPorPagina, totalRegistrosFiltrados);
  const dadosPaginados = historicoFiltrado.slice(indexPrimeiroItem, indexUltimoItem);

  return (
    <div className="traceabilly-wrapper">
      <div className="traceabilly-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        <div className="traceabilly-header">
          <div className="header-esquerda">
            <Archive size={20} className="icone-azul" />
            <h2>Itens Arquivados</h2>
            <span className="badge-contador">{totalRegistrosFiltrados}</span>
          </div>
          <div className="header-direita" style={{ display: 'flex', gap: '12px', height: '42px', alignItems: 'stretch' }}>
            <div style={{ position: 'relative', height: '100%', width: '350px' }}>
              <Search size={16} className="icone-pesquisa" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por PN, NF, BS, WBS, Solicitante..." 
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                style={{ height: '100%', width: '100%', boxSizing: 'border-box', paddingLeft: '36px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <button 
              onClick={() => setModalFiltroAberto(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderRadius: '8px', 
                border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '0.875rem', 
                fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', height: '100%'
              }}
            >
              <Filter size={18} color="#475569" />
              Filtros
              {Object.values(filtrosAvancados).some(v => v !== '') && (
                <span style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
              )}
            </button>
          </div>
        </div>

        <div className="traceabilly-subheader">
          <div className="subheader-item"><User size={14} /> Duplo clique numa linha para ver a vida útil do item</div>
          <div className="subheader-item"><Calendar size={14} /> Quando foi a movimentação</div>
          <div className="subheader-item"><Box size={14} /> Qual BS/Solicitação</div>
        </div>

        <div className="tabela-container" style={{ flex: 1, overflowY: 'auto' }}>
          {carregando ? (
            <div className="estado-vazio"><Loader2 className="animate-spin" size={32} /> A analisar o ciclo de vida dos materiais...</div>
          ) : dadosPaginados.length === 0 ? (
            <div className="estado-vazio"><Archive size={48} className="icone-vazio" /> Nenhum fluxo encontrado.</div>
          ) : (
            <table className="tabela-rastreabilidade">
              <thead>
                <tr>
                  <th>DESENHO SAP</th>
                  <th>PART NUMBER</th>
                  <th>DESCRIÇÃO</th>
                  <th>NF ENTRADA</th>
                  <th>BS / SOLICITAÇÃO</th>
                  <th>SOLICITANTE</th>
                  <th>FLUXO DA OPERAÇÃO</th>
                  <th style={{ textAlign: 'center' }}>QUANTIDADE</th>
                  <th>WBS / ALOCAÇÃO</th>
                  <th>DATA DA OPERAÇÃO</th>
                  {isAdminOuLider && <th style={{ textAlign: 'center' }}>AÇÃO</th>}
                </tr>
              </thead>
              <tbody>
                {dadosPaginados.map(item => (
                  <tr 
                    key={item.idUnico} 
                    onDoubleClick={() => handleDoubleClickRow(item)}
                    style={{ cursor: 'pointer' }}
                    title="Dê um duplo clique para ver o histórico completo de entradas e saídas deste material"
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="texto-azul">{item.desenhoSAP}</td>
                    <td className="texto-negrito">{item.partNumber}</td>
                    <td className="texto-truncado" title={item.descricao}>{item.descricao}</td>
                    <td>{item.nfEntrada !== '-' ? <span className="badge-nf">{item.nfEntrada}</span> : '-'}</td>
                    <td>
                      <div className="flex-centro" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                         <span className="badge-bs" style={{ fontSize: '0.75rem' }}>{item.bsSaida !== '-' ? item.bsSaida : 'S/ PL'}</span>
                         <span className="badge-solicitacao" style={{ fontSize: '0.7rem' }}>{item.solicitacao}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-centro-gap" title={item.solicitante}>
                        <div className="avatar-solicitante">{getIniciais(item.solicitante)}</div>
                        <span className="texto-truncado-pequeno">{item.solicitante.split(' ')[0]}</span>
                      </div>
                    </td>
                    
                    <td>{renderFluxo(item.tipoOriginal)}</td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem',
                        fontFamily: 'monospace, sans-serif', minWidth: '60px',
                        backgroundColor: item.isEntrada ? '#ecfdf5' : '#fef2f2', color: item.isEntrada ? '#059669' : '#dc2626',
                        border: `1px solid ${item.isEntrada ? '#a7f3d0' : '#fecaca'}`
                      }}>
                        {item.isEntrada ? '+' : '-'}{item.qtdMovimentada} <span style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>{item.unidadeMedida}</span>
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="texto-azul" title={item.wbs} style={{ fontSize: '0.75rem' }}>{item.wbs}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.alocacao}</span>
                      </div>
                    </td>
                    
                    <td>{item.dataSaida}</td>
                    
                    {isAdminOuLider && (
                      <td style={{ textAlign: 'center' }}>
                        {['Material', 'Transferencia WBS', 'Crossdocking'].includes(item.tipoOriginal) ? (
                          <button onClick={(e) => { e.stopPropagation(); abrirModalReverter(item); }} className="btn-reverter" title="Devolver quantidade ao estoque"><RotateCcw size={18} /></button>
                        ) : (<span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>-</span>)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <PaginacaoTabela 
          paginaAtual={paginaAtual}
          totalPaginas={totalPaginas}
          totalRegistrosFiltrados={totalRegistrosFiltrados}
          indexPrimeiroItem={indexPrimeiroItem}
          indexUltimoItem={indexUltimoItem}
          dadosPaginadosLength={dadosPaginados.length}
          itensPorPagina={itensPorPagina}
          setItensPorPagina={setItensPorPagina}
          setPaginaAtual={setPaginaAtual}
          carregando={carregando}
        />
      </div>

      {/* ✨ MODAL DE CICLO DE VIDA DO MATERIAL */}
      {modalCicloVida && detalhesCicloVida && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '900px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', color: '#2563eb' }}><Activity size={24} /></div>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: '700' }}>Ciclo de Vida do Material</h3>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Rastreabilidade de Entradas e Saídas até zerar no estoque</span>
                </div>
              </div>
              <button onClick={() => setModalCicloVida(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Part Number</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{detalhesCicloVida.partNumber}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Desenho SAP</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{detalhesCicloVida.desenhoSAP}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>NF Principal</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{detalhesCicloVida.nfEntrada}</strong>
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Descrição</span>
                <span style={{ color: '#334155', fontSize: '0.9rem' }}>{detalhesCicloVida.descricao}</span>
              </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '24px', flex: 1, backgroundColor: '#ffffff' }}>
              <div style={{ position: 'relative', paddingLeft: '16px', borderLeft: '2px solid #e2e8f0' }}>
                {movimentosCicloVida.map((mov, index) => (
                  <div key={mov.idUnico} style={{ position: 'relative', marginBottom: index === movimentosCicloVida.length - 1 ? '0' : '24px' }}>
                    
                    {/* Ponto na linha do tempo */}
                    <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: mov.isEntrada ? '#10b981' : '#ef4444', border: '2px solid #fff', boxShadow: '0 0 0 1px #e2e8f0' }}></div>
                    
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            {renderFluxo(mov.tipoOriginal)}
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>{mov.dataSaida}</span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#334155', display: 'flex', gap: '16px' }}>
                            <span><strong>PL/BS:</strong> {mov.bsSaida !== '-' ? mov.bsSaida : 'S/ PL'}</span>
                            <span><strong>PS:</strong> {mov.solicitacao}</span>
                          </div>
                        </div>
                        
                        <div style={{ 
                          backgroundColor: mov.isEntrada ? '#ecfdf5' : '#fef2f2', color: mov.isEntrada ? '#059669' : '#dc2626', 
                          border: `1px solid ${mov.isEntrada ? '#a7f3d0' : '#fecaca'}`, padding: '6px 12px', borderRadius: '8px', 
                          fontWeight: '700', fontSize: '1rem', fontFamily: 'monospace' 
                        }}>
                          {mov.isEntrada ? '+' : '-'}{mov.qtdMovimentada} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{mov.unidadeMedida}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '8px' }}>
                        <div className="avatar-solicitante" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>{getIniciais(mov.solicitante)}</div>
                        <span style={{ fontSize: '0.875rem', color: '#475569' }}>Solicitado por <strong>{mov.solicitante}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: '0.875rem', color: '#475569' }}>Destino/WBS: <strong>{mov.wbs}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      )}

      <FiltroTraceabillyModal
        aberto={modalFiltroAberto}
        onClose={() => setModalFiltroAberto(false)}
        dadosTabela={itensArquivados}
        filtros={filtrosAvancados}
        setFiltros={setFiltrosAvancados} 
        onLimpar={handleLimparFiltros}
      />

      {modalReverter && itemReverter && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '450px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '1.125rem' }}><RotateCcw size={20} color="#2563eb" /> Reverter ao Estoque</h3>
              <button onClick={() => setModalReverter(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#475569' }}>Vai devolver itens retirados pela solicitação <strong>{itemReverter.solicitacao}</strong>.</p>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>{itemReverter.partNumber} — {itemReverter.descricao}</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>QUANTIDADE A DEVOLVER (MÁX: {itemReverter.qtdMovimentada})</label>
              <input type="number" min="1" max={itemReverter.qtdMovimentada} value={qtdReverter} onChange={(e) => setQtdReverter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', color: '#2563eb', fontWeight: 'bold' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setModalReverter(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
              <button onClick={confirmarReversao} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><RotateCcw size={16} /> Confirmar Devolução</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
