// =================================================================
// ARQUIVO: src/components/TabelaDemandas/TabelaDemandas.jsx
// DESCRIÇÃO: Tabela de listagem com duplo-clique para ver Itens da Solicitação
// =================================================================
import React, { useState } from 'react';
import { Search, X, PackageOpen, Loader } from 'lucide-react';

import { apiFetch } from '../../services/api';

export default function TabelaDemandas({ dados = [] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historicoItem, setHistoricoItem] = useState([]);
  
  // ✨ NOVO STATE: Guarda o tipo da solicitação (ex: "Transferencia WBS")
  const [tipoSolicitacao, setTipoSolicitacao] = useState('');
  
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [filtoStatus, setFiltoStatus] = useState('Todos os Status');

  // ==========================================
  // AÇÃO: Duplo clique para abrir itens
  // ==========================================
  const handleDuploClique = async (linha) => {
    setItemSelecionado(linha);
    setModalAberto(true);
    setCarregandoHistorico(true);

    try {
      // 1. A linha.id tem o PS exato (ex: "PS-20260809-8331")
      const psBusca = linha.id;
      
      // 2. Buscamos os detalhes completos da solicitação na API
      const resultado = await apiFetch(`/solicitacoes/listar?busca=${psBusca}`);
      
      // 3. Verificamos se encontrou e extraímos os itens e o tipo
      if (resultado.sucesso && resultado.dados && resultado.dados.length > 0) {
        // Encontra a solicitação que tem exatamente esse PS
        const solicitacaoExata = resultado.dados.find(d => d.ps === psBusca);
        
        if (solicitacaoExata && solicitacaoExata.itens) {
          setHistoricoItem(solicitacaoExata.itens);
          
          // ✨ SALVA O TIPO DA SOLICITAÇÃO (Se for undefined, guarda string vazia)
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
    setTipoSolicitacao(''); // ✨ Limpa o tipo ao fechar
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
        <span className="info-registros">{dadosFiltrados.length} registros</span>
        <span className="info-target">Dica: Dê duplo clique numa linha para ver os itens da solicitação</span>
      </div>

      <div className="tabela-scroll">
        <table className="dados-table">
          <thead>
            <tr>
              <th>PS ID</th>
              <th>SOLICITANTE</th>
              <th>WBS</th>
              <th>STATUS PS</th>
              <th>PL</th>
              <th>CRIAÇÃO DE PL</th>
              <th>DATA E HORA DE ENTREGA</th>
              <th>CONTAGEM</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.map((linha, index) => (
              <tr 
                key={index} 
                onDoubleClick={() => handleDuploClique(linha)} 
                style={{ cursor: 'pointer' }}
                title="Duplo clique para ver os itens da solicitação"
              >
                <td className="fonte-negrito">{linha.id}</td>
                <td>{linha.solicitante}</td>
                <td><a href="#" className="link-azul" onClick={(e)=>e.preventDefault()}>{linha.wbs}</a></td>
                <td>
                  <span className="badge-status-simples">{linha.status}</span>
                </td>
                <td>
                  {(linha.pl || linha.bs) && (linha.pl || linha.bs) !== '-' ? (
                    <span className="link-azul">{linha.pl || linha.bs}</span>
                  ) : (
                    <span className="texto-cinza">-</span>
                  )}
                </td>
                <td className="texto-cinza">{linha.criacaoPl || linha.criacaoBs || '—'}</td>
                <td className={linha.dataEntrega === 'não definido' ? 'texto-amarelo' : 'texto-cinza'}>
                  {linha.dataEntrega || '—'}
                </td>
                <td>
                  {linha.contagem && String(linha.contagem).includes('d') ? (
                    <span className={`badge-countdown countdown-${linha.contagemStatus}`}>
                      {linha.contagem}
                    </span>
                  ) : (
                    <span className="texto-cinza fonte-negrito">{linha.contagem || '—'}</span>
                  )}
                </td>
              </tr>
            ))}
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
                      // ✨ LÓGICA DE IDENTIFICAÇÃO: Verifica se é uma transferência WBS
                      const isTransferencia = 
                        tipoSolicitacao === 'Transferencia WBS' || 
                        tipoSolicitacao === 'Transfer. WBS' || 
                        hist.is_transferencia || 
                        hist.isTransferencia;

                      // ✨ NOVA LÓGICA DE CORES: Se for transferência, a linha inteira fica amarela!
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
                            
                            {/* ✨ ETIQUETA MANTIDA para dar ainda mais destaque */}
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