// =================================================================
// ARQUIVO: src/components/TabelaDemandas/TabelaDemandas.jsx
// DESCRIÇÃO: Tabela de listagem com duplo-clique para ver Itens da Solicitação
// =================================================================
import React, { useState, useEffect } from 'react';
import { Search, X, PackageOpen, Loader, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, RotateCcw, XCircle, FileText, Edit, ChevronLeft, ChevronRight } from 'lucide-react'; 

import { apiFetch } from '../../services/api';

export default function TabelaDemandas({ dados = [] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historicoItem, setHistoricoItem] = useState([]);

  const [tipoSolicitacao, setTipoSolicitacao] = useState('');
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [filtoStatus, setFiltoStatus] = useState('Todos os Status');

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 7;

  const formatarDataHora = (timestamp, dataAlternativa) => {
    if (timestamp) {
      const d = new Date(timestamp);
      const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${data} às ${hora}`;
    }
    return dataAlternativa || '—';
  };

  const renderFluxo = (tipo) => {
    switch(tipo) {
      case 'Material': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fecaca' }}><ArrowUpRight size={14}/> Retirada de Material</span>;
      case 'Transferencia WBS':
      case 'Transfer. WBS': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fefce8', color: '#ca8a04', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fde047' }}><ArrowRightLeft size={14}/> Transferência WBS</span>;
      case 'Reintegracao':
      case 'Reintegração': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #a7f3d0' }}><RotateCcw size={14}/> Reintegração de Item</span>;
      case 'Entrada': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #a7f3d0' }}><ArrowDownLeft size={14}/> Entrada de Estoque</span>;
      case 'Crossdocking': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#faf5ff', color: '#9333ea', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #e9d5ff' }}><ArrowUpRight size={14}/> Saída Crossdocking</span>;
      case 'Cancelado': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #cbd5e1' }}><XCircle size={14}/> Estorno / Cancelado</span>;
      case 'Nota Fiscal': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #bfdbfe' }}><FileText size={14}/> Nota Fiscal</span>;
      case 'Edição Manual': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fffbeb', color: '#d97706', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fde68a' }}><Edit size={14}/> Edição de Item</span>;
      default: return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>{tipo || 'Operação Padrão'}</span>;
    }
  };

  const handleDuploClique = async (linha) => {
    if (linha.tipo === 'Edição Manual') return; 

    setItemSelecionado(linha);
    setModalAberto(true);
    setCarregandoHistorico(true);

    try {
      const psBusca = linha.id;
      const resultado = await apiFetch(`/solicitacoes/listar?busca=${psBusca}`);

      if (resultado.sucesso && resultado.dados && resultado.dados.length > 0) {
        const solicitacaoExata = resultado.dados.find(d => d.ps === psBusca);
        if (solicitacaoExata && solicitacaoExata.itens) {
          setHistoricoItem(solicitacaoExata.itens);
          setTipoSolicitacao(solicitacaoExata.tipo || '');
        } else {
          setHistoricoItem([]);
          setTipoSolicitacao('');
        }
      } else {
        setHistoricoItem([]);
        setTipoSolicitacao('');
      }
    } catch (error) {
      console.error("Erro ao buscar os itens da solicitação:", error.message);
      setHistoricoItem([]);
      setTipoSolicitacao('');
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setHistoricoItem([]);
    setTipoSolicitacao(''); 
  };

  useEffect(() => {
    setPaginaAtual(1);
  }, [termoPesquisa, filtoStatus, dados]);

  const dadosFiltrados = dados.filter((linha) => {
    const termo = termoPesquisa.toLowerCase();

    const batePesquisa =
      (linha.id && String(linha.id).toLowerCase().includes(termo)) ||
      (linha.solicitante && linha.solicitante.toLowerCase().includes(termo)) ||
      (linha.wbs && linha.wbs.toLowerCase().includes(termo)) ||
      ((linha.pl || linha.bs) && String(linha.pl || linha.bs).toLowerCase().includes(termo));

    const bateStatus =
      filtoStatus === 'Todos os Status' ||
      (linha.status && linha.status === filtoStatus);

    return batePesquisa && bateStatus;
  });

  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina) || 1;
  const indexInicio = (paginaAtual - 1) * itensPorPagina;
  const itensPaginados = dadosFiltrados.slice(indexInicio, indexInicio + itensPorPagina);

  const listaStatusUnicos = ['Todos os Status', ...new Set(dados.map(item => item.status).filter(Boolean))];

  return (
    <div className="tabela-cartao" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div className="tabela-controles">
        <div className="controles-esquerdos">
          <select className="select-filtro">
            <option>Todo Período</option>
          </select>

          <select
            className="select-filtro"
            value={filtoStatus}
            onChange={(e) => setFiltoStatus(e.target.value)}
          >
            {listaStatusUnicos.map((status, idx) => (
              <option key={idx} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="pesquisa-wrapper">
          <Search className="icone-pesquisa" size={16} />
          <input
            type="text"
            placeholder="Buscar PS, PL, WBS..."
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
          />
        </div>
      </div>

      <div className="tabela-info">
        <span className="info-registros">{dadosFiltrados.length} operações registradas</span>
        <span className="info-target">Dica: Dê duplo clique numa linha para ver todos os itens da solicitação</span>
      </div>

      <div className="tabela-scroll" style={{ flex: 1 }}>
        <table className="dados-table">
          <thead>
            <tr>
              <th>ID (PS/ED)</th>
              <th>USUÁRIO / SOLICITANTE</th>
              <th>WBS</th>
              <th>PL</th>
              <th>FLUXO DA OPERAÇÃO</th>
              <th>DETALHES / QUANTIDADE</th>
              <th>DATA E HORA</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {itensPaginados.map((linha, index) => {
              const isEntrada = linha.tipo === 'Entrada' || linha.tipo === 'Reintegracao' || linha.tipo === 'Reintegração';
              const isExpirado = linha.contagemStatus === 'expirado';

              return (
                <tr
                  key={index}
                  onDoubleClick={() => handleDuploClique(linha)}
                  style={{ 
                    cursor: linha.tipo === 'Edição Manual' ? 'default' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  title={linha.tipo === 'Edição Manual' ? "As edições manuais não possuem itens detalhados." : "Duplo clique para ver todos os itens da solicitação"}
                >
                  <td className="fonte-negrito">{linha.id}</td>
                  <td>{linha.solicitante}</td>
                  <td><a href="#" className="link-azul" onClick={(e) => e.preventDefault()}>{linha.wbs}</a></td>
                  
                  <td>
                    {(linha.pl || linha.bs) && (linha.pl || linha.bs) !== '-' ? (
                      <span className="link-azul">{linha.pl || linha.bs}</span>
                    ) : (
                      <span className="texto-cinza">-</span>
                    )}
                  </td>

                  <td>{renderFluxo(linha.tipo)}</td>

                  <td>
                    {linha.tipo === 'Edição Manual' ? (
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
                        fontSize: '0.75rem', fontWeight: '600', fontFamily: 'monospace, sans-serif',
                        backgroundColor: '#f8fafc', color: '#475569', border: '1px dashed #cbd5e1'
                      }}>
                        {linha.contagem}
                      </span>
                    ) : linha.qtdMovimentada ? (
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
                        fontWeight: '700', fontSize: '0.85rem', fontFamily: 'monospace, sans-serif',
                        textAlign: 'center', minWidth: '60px',
                        backgroundColor: isEntrada ? '#ecfdf5' : '#fef2f2',
                        color: isEntrada ? '#059669' : '#dc2626',
                        border: `1px solid ${isEntrada ? '#a7f3d0' : '#fecaca'}`
                      }}>
                        {isEntrada ? '+' : '-'}{linha.qtdMovimentada} <span style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>{linha.unidadeMedida}</span>
                      </span>
                    ) : linha.contagemStatus ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace, sans-serif',
                        textAlign: 'center',
                        minWidth: '95px',
                        backgroundColor: linha.contagemStatus === 'expirado' ? '#fef2f2' : '#ffffff',
                        color: linha.contagemStatus === 'verde' ? '#059669' : 
                               linha.contagemStatus === 'amarelo' ? '#d97706' : 
                               linha.contagemStatus === 'vermelho' ? '#dc2626' : 
                               linha.contagemStatus === 'expirado' ? '#b91c1c' : '#475569',
                        border: `2px solid ${
                               linha.contagemStatus === 'verde' ? '#10b981' : 
                               linha.contagemStatus === 'amarelo' ? '#f59e0b' : 
                               linha.contagemStatus === 'vermelho' ? '#ef4444' : 
                               linha.contagemStatus === 'expirado' ? '#b91c1c' : '#cbd5e1'}`,
                        boxShadow: linha.contagemStatus === 'expirado' ? '0 0 8px rgba(220, 38, 38, 0.4)' : 'none'
                      }}>
                        {linha.contagem}
                      </span>
                    ) : (
                      <span className="texto-cinza fonte-negrito">{linha.contagem || '-'}</span>
                    )}
                  </td>

                  <td className="texto-cinza" style={{ whiteSpace: 'nowrap' }}>
                    {formatarDataHora(linha.timestamp, linha.criacaoPl)}
                  </td>
                  
                  <td>
                    <span className="badge-status-simples">{linha.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dadosFiltrados.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Página <strong style={{ color: '#1e293b' }}>{paginaAtual}</strong> de <strong style={{ color: '#1e293b' }}>{totalPaginas}</strong> &middot; Exibindo {indexInicio + 1} a <strong>{Math.min(indexInicio + itensPorPagina, dadosFiltrados.length)}</strong> de <strong>{dadosFiltrados.length}</strong> operações
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
              disabled={paginaAtual === 1}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                backgroundColor: paginaAtual === 1 ? '#f8fafc' : '#ffffff',
                border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500',
                color: paginaAtual === 1 ? '#94a3b8' : '#334155',
                cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button 
              onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))}
              disabled={paginaAtual === totalPaginas}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                backgroundColor: paginaAtual === totalPaginas ? '#f8fafc' : '#ffffff',
                border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500',
                color: paginaAtual === totalPaginas ? '#94a3b8' : '#334155',
                cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer'
              }}
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL DE ITENS (ABRE COM DUPLO CLIQUE)
          ============================================================== */}
      {modalAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '24px', borderRadius: '8px',
            width: '750px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackageOpen size={20} color="#0056b3" />
                Itens da Solicitação
              </h3>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#666" />
              </button>
            </div>

            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
              A mostrar os itens retirados ou vinculados ao pedido: <strong>{itemSelecionado?.id}</strong>
            </p>

            {carregandoHistorico ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Loader size={24} className="icone-girando" color="#0056b3" />
                <p style={{ color: '#666', marginTop: '10px' }}>Buscando itens na base de dados...</p>
              </div>
            ) : historicoItem.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                      <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Desenho SAP</th>
                      <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Part Number</th>
                      <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Descrição</th>
                      <th style={{ padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'center' }}>Qtd. Solicitada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoItem.map((hist, idx) => {
                      // ✨ LÓGICA DE CORES PARA OS DESTAQUES
                      const isTransferencia =
                        tipoSolicitacao === 'Transferencia WBS' ||
                        tipoSolicitacao === 'Transfer. WBS' ||
                        hist.is_transferencia ||
                        hist.isTransferencia;

                      const isCrossdocking = tipoSolicitacao === 'Crossdocking';
                      
                      // ✨ LÓGICA PARA VERIFICAR SE O CROSSDOCKING FOI PARCIAL
                      const isCrossdockingParcial = isCrossdocking && hist.alocacao && hist.alocacao.toUpperCase().includes('PARCIAL');

                      // Variáveis dinâmicas para o visual da linha
                      let corFundoLinha = 'transparent';
                      let corBordaLinha = '#eee';
                      let corTextoPadrao = 'inherit';
                      let corTextoSap = '#666';

                      if (isTransferencia) {
                        corFundoLinha = '#fefce8';
                        corBordaLinha = '#fde047';
                        corTextoPadrao = '#854d0e'; // Marrom/Laranja Escuro
                        corTextoSap = '#a16207';
                      } else if (isCrossdocking) {
                        corFundoLinha = '#faf5ff';
                        corBordaLinha = '#e9d5ff';
                        corTextoPadrao = '#6b21a8'; // Roxo Escuro
                        corTextoSap = '#7e22ce';
                      }

                      return (
                        <tr key={idx} style={{ backgroundColor: corFundoLinha, borderBottom: `1px solid ${corBordaLinha}`, transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '8px', color: corTextoSap, fontFamily: 'monospace' }}>
                            {hist.desenho_sap_manual || '-'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: corTextoPadrao, fontFamily: 'monospace' }}>
                            {hist.part_number_manual || '-'}
                          </td>
                          <td style={{ padding: '8px', color: corTextoPadrao }}>
                            {hist.descricao_manual || '-'}
                            
                            {/* TAG TRANSFERÊNCIA */}
                            {isTransferencia && (
                              <div style={{ marginTop: '6px' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  backgroundColor: '#fef08a',
                                  color: '#854d0e',
                                  border: '1px solid #eab308',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}>
                                  ★ Transferência WBS
                                </span>
                              </div>
                            )}

                            {/* ✨ TAG CROSSDOCKING COM VALIDAÇÃO DE "PARCIAL" OU "TOTAL" */}
                            {isCrossdocking && (
                              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  backgroundColor: '#f3e8ff',
                                  color: '#7e22ce',
                                  border: '1px solid #d8b4fe',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}>
                                  📦 Saída Crossdocking
                                </span>
                                
                                {isCrossdockingParcial && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: '#fffbeb',
                                    color: '#d97706',
                                    border: '1px solid #fde68a',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                  }}>
                                    Parcial
                                  </span>
                                )}
                              </div>
                            )}

                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: isCrossdocking ? '#9333ea' : (isTransferencia ? '#a16207' : '#0056b3'), fontWeight: 'bold' }}>
                            {hist.quantidade_solicitada || hist.qtd || 1} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>{hist.unidade_medida_manual || 'Un'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                Nenhum item encontrado para esta solicitação.
              </p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}