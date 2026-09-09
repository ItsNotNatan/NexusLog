import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, Archive, Calendar, User, Box, ArrowRight, RotateCcw, ArrowUpRight, ArrowRightLeft, ArrowDownLeft, XCircle, FileText, X } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import './Traceabilly.css';

export default function Traceabilly({ perfil }) {
  const { estoqueAtual, filiaisGlobais, usuario } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [itensArquivados, setItensArquivados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  const [recarregar, setRecarregar] = useState(0);

  // ✨ NOVOS ESTADOS PARA O MODAL DE REVERSÃO
  const [modalReverter, setModalReverter] = useState(false);
  const [itemReverter, setItemReverter] = useState(null);
  const [qtdReverter, setQtdReverter] = useState(1);

  // VERIFICAÇÃO DE PERMISSÃO: Apenas ADM e LÍDER no perfil logística podem reverter
  const isAdminOuLider = perfil !== 'cliente' && (usuario?.cargo === 'ADM' || usuario?.cargo === 'LIDER');

  const formatarData = (dataISO) => {
    if (!dataISO) return '-';
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return '-';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
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

                  itemsList.push({
                    idUnico: `${sol.id}-${it.id}`,
                    idItem: it.id, 
                    tipoOriginal: sol.tipo, 
                    desenhoSAP: it.desenho_sap_manual || '-',
                    partNumber: it.part_number_manual || '-',
                    descricao: it.descricao_manual || 'Sem descrição',
                    nfEntrada: it.nf_entrada || '-',
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

  // ✨ ABRE O MODAL DE REVERSÃO COM OS DADOS DO ITEM
  const abrirModalReverter = (item) => {
    setItemReverter(item);
    setQtdReverter(item.qtdMovimentada); // Define o valor máximo como padrão
    setModalReverter(true);
  };

  // ✨ LÓGICA DE CONFIRMAR A REVERSÃO PARA A API
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
        body: JSON.stringify({ 
          id_item: itemReverter.idItem,
          quantidade: qtdNum // ✨ ENVIAMOS A QUANTIDADE AGORA!
        })
      });

      if (resposta.sucesso) {
        showAlert("Sucesso", "A quantidade foi revertida para o estoque com sucesso!", "success");
        setModalReverter(false);
        setRecarregar(prev => prev + 1); // Dispara a recarga da tabela
      } else {
        showAlert("Erro de Servidor", resposta.erro, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível comunicar com o servidor ao reverter o item.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const historicoFiltrado = itensArquivados.filter(item => 
    (item.partNumber && item.partNumber.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.nfEntrada && item.nfEntrada.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.bsSaida && item.bsSaida.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.wbs && item.wbs.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.solicitante && item.solicitante.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.solicitacao && item.solicitacao.toLowerCase().includes(termoPesquisa.toLowerCase()))
  );

  return (
    <div className="traceabilly-wrapper">
      <div className="traceabilly-card">
        
        <div className="traceabilly-header">
          <div className="header-esquerda">
            <Archive size={20} className="icone-azul" />
            <h2>Itens Arquivados</h2>
            <span className="badge-contador">{historicoFiltrado.length}</span>
          </div>
          <div className="header-direita">
            <Search size={16} className="icone-pesquisa" />
            <input 
              type="text" 
              placeholder="Buscar por PN, NF, BS, WBS, Solicitante..." 
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className="input-pesquisa"
            />
          </div>
        </div>

        <div className="traceabilly-subheader">
          <div className="subheader-item">
            <User size={14} /> Quem solicitou
          </div>
          <div className="subheader-item">
            <Calendar size={14} /> Quando foi a movimentação
          </div>
          <div className="subheader-item">
            <Box size={14} /> Qual BS/Solicitação
          </div>
        </div>

        <div className="tabela-container">
          {carregando ? (
            <div className="estado-vazio"><Loader2 className="animate-spin" size={32} /> A analisar o ciclo de vida dos materiais...</div>
          ) : historicoFiltrado.length === 0 ? (
            <div className="estado-vazio"><Archive size={48} className="icone-vazio" /> Nenhum fluxo encontrado para materiais zerados.</div>
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
                {historicoFiltrado.map(item => (
                  <tr key={item.idUnico}>
                    <td className="texto-azul">{item.desenhoSAP}</td>
                    <td className="texto-negrito">{item.partNumber}</td>
                    <td className="texto-truncado" title={item.descricao}>{item.descricao}</td>
                    <td>
                      {item.nfEntrada !== '-' ? <span className="badge-nf">{item.nfEntrada}</span> : '-'}
                    </td>
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
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace, sans-serif',
                        textAlign: 'center',
                        minWidth: '60px',
                        backgroundColor: item.isEntrada ? '#ecfdf5' : '#fef2f2',
                        color: item.isEntrada ? '#059669' : '#dc2626',
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
                    
                    {/* ✨ O BOTÃO AGORA ABRE A CAIXA (MODAL) */}
                    {isAdminOuLider && (
                      <td style={{ textAlign: 'center' }}>
                        {['Material', 'Transferencia WBS', 'Crossdocking'].includes(item.tipoOriginal) ? (
                          <button 
                            onClick={() => abrirModalReverter(item)} 
                            className="btn-reverter"
                            title="Devolver quantidade ao estoque"
                          >
                            <RotateCcw size={18} />
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ==============================================
          ✨ MODAL DE REVERSÃO COM CAMPO DE QUANTIDADE
          ============================================== */}
      {modalReverter && itemReverter && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '450px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '1.125rem' }}>
                <RotateCcw size={20} color="#2563eb" /> Reverter ao Estoque
              </h3>
              <button onClick={() => setModalReverter(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#475569' }}>
                Vai devolver itens retirados pela solicitação <strong>{itemReverter.solicitacao}</strong>.
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                {itemReverter.partNumber} — {itemReverter.descricao}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>
                QUANTIDADE A DEVOLVER (MÁX: {itemReverter.qtdMovimentada})
              </label>
              <input
                type="number"
                min="1"
                max={itemReverter.qtdMovimentada}
                value={qtdReverter}
                onChange={(e) => setQtdReverter(e.target.value)}
                style={{ 
                  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  fontSize: '1rem', outline: 'none', boxSizing: 'border-box', color: '#2563eb', fontWeight: 'bold'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setModalReverter(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                Cancelar
              </button>
              <button onClick={confirmarReversao} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={16} /> Confirmar Devolução
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}