import React, { useState } from 'react';
import { Search, X, PackageOpen, Loader, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, RotateCcw, XCircle, FileText, Edit } from 'lucide-react'; // ✨ EDIT IMPORTADO

import { apiFetch } from '../../services/api';

export default function TabelaDemandas({ dados = [] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historicoItem, setHistoricoItem] = useState([]);

  const [tipoSolicitacao, setTipoSolicitacao] = useState('');
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [filtoStatus, setFiltoStatus] = useState('Todos os Status');

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
      // ✨ ADIÇÃO DO BADGE DE EDIÇÃO
      case 'Edição Manual': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fffbeb', color: '#d97706', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fde68a' }}><Edit size={14}/> Edição de Item</span>;
      default: return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>{tipo || 'Operação Padrão'}</span>;
    }
  };

  const handleDuploClique = async (linha) => {
    if (linha.tipo === 'Edição Manual') return; // ✨ IMPEDE ABERTURA DO MODAL SE FOR SÓ UMA EDIÇÃO MANUAL

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

  const listaStatusUnicos = ['Todos os Status', ...new Set(dados.map(item => item.status).filter(Boolean))];

  return (
    <div className="tabela-cartao" style={{ position: 'relative' }}>

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

      <div className="tabela-scroll">
        <table className="dados-table">
          <thead>
            <tr>
              <th>ID (PS/ED)</th>
              <th>USUÁRIO / SOLICITANTE</th>
              <th>WBS</th>
              <th>PL</th>
              <th>FLUXO DA OPERAÇÃO</th>
              <th>DETALHES / QUANTIDADE</th>
              <th>DATA DA OPERAÇÃO</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.map((linha, index) => {
              const isEntrada = linha.tipo === 'Entrada' || linha.tipo === 'Reintegracao' || linha.tipo === 'Reintegração';

              return (
                <tr
                  key={index}
                  onDoubleClick={() => handleDuploClique(linha)}
                  style={{ cursor: linha.tipo === 'Edição Manual' ? 'default' : 'pointer' }}
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

                  {/* ✨ EXIBE AS INFORMAÇÕES DE MUDANÇA OU A QUANTIDADE */}
                  <td>
                    {linha.tipo === 'Edição Manual' ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        fontFamily: 'monospace, sans-serif',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        border: '1px dashed #cbd5e1'
                      }}>
                        {linha.contagem}
                      </span>
                    ) : linha.qtdMovimentada ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace, sans-serif',
                        textAlign: 'center',
                        minWidth: '60px',
                        backgroundColor: isEntrada ? '#ecfdf5' : '#fef2f2',
                        color: isEntrada ? '#059669' : '#dc2626',
                        border: `1px solid ${isEntrada ? '#a7f3d0' : '#fecaca'}`
                      }}>
                        {isEntrada ? '+' : '-'}{linha.qtdMovimentada} <span style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>{linha.unidadeMedida}</span>
                      </span>
                    ) : (
                      <span className="texto-cinza fonte-negrito">{linha.contagem || '-'}</span>
                    )}
                  </td>

                  <td className="texto-cinza">{linha.criacaoPl || linha.dataEntrega || '—'}</td>
                  
                  <td>
                    <span className="badge-status-simples">{linha.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                      const isTransferencia =
                        tipoSolicitacao === 'Transferencia WBS' ||
                        tipoSolicitacao === 'Transfer. WBS' ||
                        hist.is_transferencia ||
                        hist.isTransferencia;

                      const corFundoLinha = isTransferencia ? '#fefce8' : 'transparent';
                      const corBordaLinha = isTransferencia ? '#fde047' : '#eee';

                      return (
                        <tr key={idx} style={{ backgroundColor: corFundoLinha, borderBottom: `1px solid ${corBordaLinha}`, transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '8px', color: isTransferencia ? '#a16207' : '#666', fontFamily: 'monospace' }}>
                            {hist.desenho_sap_manual || '-'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: isTransferencia ? '#854d0e' : 'inherit', fontFamily: 'monospace' }}>
                            {hist.part_number_manual || '-'}
                          </td>
                          <td style={{ padding: '8px', color: isTransferencia ? '#854d0e' : 'inherit' }}>
                            {hist.descricao_manual || '-'}
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
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: isTransferencia ? '#a16207' : '#0056b3', fontWeight: 'bold' }}>
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