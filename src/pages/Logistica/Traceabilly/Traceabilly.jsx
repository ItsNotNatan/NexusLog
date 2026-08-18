import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, Archive, Calendar, User, Box, ArrowRight, RotateCcw, ArrowUpRight, ArrowRightLeft, ArrowDownLeft, XCircle, FileText } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import './Traceabilly.css';

export default function Traceabilly({ perfil }) {
  const { estoqueAtual, filiaisGlobais, usuario } = useContext(AuthContext);
  const { showAlert, showConfirm } = useAlert();

  const [itensArquivados, setItensArquivados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  // Gatilho para recarregar a tabela após uma reversão bem sucedida
  const [recarregar, setRecarregar] = useState(0);

  // ✨ VERIFICAÇÃO DE PERMISSÃO: Apenas ADM e LÍDER no perfil logística podem reverter
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

  // ==========================================
  // ✨ NOVO: FUNÇÃO PARA RENDERIZAR O FLUXO
  // ==========================================
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
        
        // ✨ 1. Busca TODO o estoque para ver quais estão Zerados (Quantidade = 0)
        const urlEstoque = estoqueAtual === 'TODOS' ? '/estoque/listar?rastreabilidade=true' : `/estoque/listar?filial_id=${estoqueAtual}&rastreabilidade=true`;
        const resEstoque = await apiFetch(urlEstoque);
        
        // ✨ 2. Busca todas as solicitações para pegar os fluxos
        const urlSol = estoqueAtual === 'TODOS' ? '?limit=1000' : `?filial=${estoqueAtual}&limit=1000`;
        const resSol = await apiFetch(`/solicitacoes/listar${urlSol}`);
        
        if (resEstoque.sucesso && resSol.sucesso) {
          
          // ✨ MÁGICA: Filtramos apenas os materiais do estoque que chegaram a ZERO!
          const itensZerados = resEstoque.dados.filter(e => e.status === 'Zerado' || e.quantidade_disponivel <= 0);
          
          // Criamos um mapa super rápido com os IDs dos itens que morreram
          const setIdsZerados = new Set(itensZerados.map(e => e.id));

          const movimentos = resSol.dados.filter(sol => 
            ['Em Separação', 'Concluído', 'Reintegrado', 'Cancelado'].includes(sol.status)
          );

          const itemsList = [];
          movimentos.forEach(sol => {
            if (sol.itens && sol.itens.length > 0) {
              sol.itens.forEach(it => {
                
                // ✨ AQUI ESTÁ A REGRA DE OURO: Só passa para a tabela se o estoque_id deste movimento
                // estiver dentro da nossa lista de itens que chegaram a 0.
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
                    
                    // Dados para a Nova Lógica de Quantidade
                    isEntrada,
                    qtdMovimentada: it.quantidade_solicitada || 0,
                    unidadeMedida: it.unidade_medida_manual || 'Un',
                    
                    wbs: sol.wbs || '-',
                    dataSaida: formatarData(sol.dataFinalizacaoISO || sol.dataCriacaoISO),
                    dataSort: new Date(sol.dataFinalizacaoISO || sol.dataCriacaoISO).getTime()
                  });
                }
              });
            }
          });

          // Ordenar cronologicamente, do fluxo mais recente para o mais antigo
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

  // ✨ LÓGICA DE REVERTER ITEM AO ESTOQUE
  const handleReverterItem = async (idItem) => {
    if (!idItem) {
      showAlert("Erro", "ID do item não encontrado.", "error");
      return;
    }

    const confirmar = await showConfirm(
      "Reverter Item",
      "Tem a certeza que deseja devolver este item ao estoque? A quantidade será reposta e o registo de saída apagado permanentemente.",
      "warning",
      "Sim, Reverter"
    );

    if (!confirmar) return;

    try {
      setCarregando(true);
      const resposta = await apiFetch('/solicitacoes/reverter', {
        method: 'POST',
        body: JSON.stringify({ id_item: idItem })
      });

      if (resposta.sucesso) {
        showAlert("Sucesso", "Item revertido para o estoque com sucesso!", "success");
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
                  {/* ✨ COLUNAS NOVAS DO FLUXO */}
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
                    
                    {/* ✨ EXIBE O TIPO DE FLUXO */}
                    <td>{renderFluxo(item.tipoOriginal)}</td>

                    {/* ✨ EXIBE A QUANTIDADE MOVIMENTADA (COM SINAL + OU -) */}
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
                    
                    {/* ✨ AÇÃO REVERTER */}
                    {isAdminOuLider && (
                      <td style={{ textAlign: 'center' }}>
                        {['Material', 'Transferencia WBS', 'Crossdocking'].includes(item.tipoOriginal) ? (
                          <button 
                            onClick={() => handleReverterItem(item.idItem)} 
                            className="btn-reverter"
                            title="Reverter item para o estoque"
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
    </div>
  );
}