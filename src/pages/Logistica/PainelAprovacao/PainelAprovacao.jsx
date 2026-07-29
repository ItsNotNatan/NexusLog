import React, { useState, useEffect, useContext } from 'react';
import './PainelAprovacao.css';
import { 
  Search, 
  Clock, 
  FileText, 
  Check, 
  X, 
  Eye, 
  Loader2,
  AlertCircle,
  ChevronLeft, 
  ChevronRight,
  Edit,       // ✨ NOVO ÍCONE PARA EDIÇÃO
  Plus,       // ✨ NOVO ÍCONE PARA ADICIONAR LINHA
  Trash2      // ✨ NOVO ÍCONE PARA REMOVER LINHA
} from 'lucide-react';

import { AuthContext } from '../../../contexts/AuthContext'; 
import DetalhesSolicitacao from '../../Cliente/AcompanhamentoSolicitacoes/Detalhes/DetalhesSolicitacao';

// FUNÇÃO AUXILIAR: Traduz os códigos brutos para os nomes reais dos galpões
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

export default function PainelAprovacao() {
  const { token: tokenContexto, estoqueAtual } = useContext(AuthContext);
  const token = tokenContexto || localStorage.getItem('token'); 

  // --- ESTADOS DO COMPONENTE ---
  const [dadosTabela, setDadosTabela] = useState([]);
  const [estoque, setEstoque] = useState([]); 
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [linhaExpandida, setLinhaExpandida] = useState(null);

  // ✨ --- ESTADOS DO MODAL DE EDIÇÃO DE ITENS ---
  const [modalEdicaoItensAberto, setModalEdicaoItensAberto] = useState(false);
  const [solicitacaoSendoEditada, setSolicitacaoSendoEditada] = useState(null);
  const [itensEdicao, setItensEdicao] = useState([]);

  // --- ESTADOS DE PAGINAÇÃO ---
  const [paginaGeral, setPaginaGeral] = useState(1);
  const [paginaEntradas, setPaginaEntradas] = useState(1);
  const itensPorPagina = 5;

  // --- BUSCA INICIAL DOS DADOS ---
  useEffect(() => {
    const buscarDados = async () => {
      try {
        setCarregando(true);
        const cabecalhosComAuth = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        const urlSolicitacoes = `http://localhost:3001/api/solicitacoes/listar?limit=1000&filial=${estoqueAtual || ''}&t=${Date.now()}`;
        const urlEstoque = `http://localhost:3001/api/estoque/listar?t=${Date.now()}`;

        const [resSolicitacoes, resEstoque] = await Promise.all([
          fetch(urlSolicitacoes, { headers: cabecalhosComAuth, cache: 'no-store' }),
          fetch(urlEstoque, { headers: cabecalhosComAuth, cache: 'no-store' })
        ]);

        const resultadoSol = await resSolicitacoes.json();
        const resultadoEst = await resEstoque.json();

        if (resEstoque.ok && resultadoEst.sucesso) {
          setEstoque(resultadoEst.dados);
        }

        if (resSolicitacoes.ok && resultadoSol.sucesso) {
          const dadosFormatados = resultadoSol.dados
            .filter(item => item.status === 'Pendente')
            .map((item) => {
              let valorTotal = 0;
              let centro = '-';
              let dep = '-';
              
              if (String(item.tipo).trim() === 'Entrada' && item.itens && item.itens.length > 0) {
                valorTotal = item.itens.reduce((acc, it) => acc + (Number(it.quantidade_solicitada || it.quantidade || 0) * Number(it.valor_unitario_manual || 0)), 0);
                centro = item.itens[0].centro || 'BR06';
                dep = item.itens[0].deposito || '0020';
              }

              return {
                ...item,
                idOriginal: item.id, 
                ps: item.ps || 'PS-Pendente', 
                bs: item.bs || null,           
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
      } finally {
        setCarregando(false);
      }
    };

    if (token) {
      buscarDados();
    } else {
      setCarregando(false);
    }
  }, [token, estoqueAtual]);

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

  useEffect(() => {
    setPaginaGeral(1);
    setPaginaEntradas(1);
  }, [termoPesquisa]);

  const toggleLinha = (idUnico) => {
    setLinhaExpandida(linhaExpandida === idUnico ? null : idUnico);
  };

  // ✨ --- LÓGICA DE EDIÇÃO DE ITENS --- ✨
  const abrirModalEdicaoItens = (linha) => {
    setSolicitacaoSendoEditada(linha);
    // Cria uma cópia segura dos itens atuais para edição
    setItensEdicao(linha.itens ? JSON.parse(JSON.stringify(linha.itens)) : []);
    setModalEdicaoItensAberto(true);
  };

  const adicionarLinhaItem = () => {
    setItensEdicao([...itensEdicao, {
      id_temporario: `novo-${Date.now()}`,
      numPecaFabricante: '',
      materialDescription: '',
      quantidade_solicitada: 1
    }]);
  };

  const removerLinhaItem = (indexParaRemover) => {
    setItensEdicao(itensEdicao.filter((_, index) => index !== indexParaRemover));
  };

  const atualizarCampoItem = (index, campo, valor) => {
    const novosItens = [...itensEdicao];
    novosItens[index][campo] = valor;
    setItensEdicao(novosItens);
  };

  const salvarEdicaoItens = async () => {
    if (!solicitacaoSendoEditada) return;

    try {
      // 1. Atualização Otimista na Interface
      setDadosTabela(prev => prev.map(item => {
        if (item.idOriginal === solicitacaoSendoEditada.idOriginal) {
          return { ...item, itens: itensEdicao };
        }
        return item;
      }));
      setModalEdicaoItensAberto(false); // Fecha o modal imediatamente

      // 2. Envio para a API (AJUSTA A ROTA CONFORME O TEU BACKEND)
      const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${solicitacaoSendoEditada.idOriginal}/itens`, {
        method: 'PATCH', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ itens: itensEdicao })
      });

      if (!resposta.ok) {
        console.warn("O servidor recusou a atualização dos itens.");
        // Opcional: Reverter a interface se a API falhar
      }
    } catch (error) {
      console.error('Erro de rede ao tentar atualizar os itens:', error);
    }
  };

  // --- AÇÃO DE APROVAÇÃO ---
  const handleAprovar = async (e, idOriginal) => {
    e.stopPropagation();
    if (window.confirm(`Aprovar esta solicitação?`)) {
      try {
        const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${idOriginal}/status`, {
          method: 'PATCH', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'Em Separação' }) 
        });
        
        if (resposta.ok) {
          setDadosTabela(prev => prev.filter(item => item.idOriginal !== idOriginal));
          setLinhaExpandida(null);
        }
      } catch (error) {
        console.error("Erro na aprovação:", error);
      }
    }
  };

  // --- AÇÃO DE RECUSA ---
  const handleRecusar = async (e, idOriginal) => {
    e.stopPropagation();
    const motivo = window.prompt(`Motivo da recusa para esta solicitação?`);
    if (motivo) {
      try {
        const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${idOriginal}/status`, {
          method: 'PATCH', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'Recusado', motivo_recusa: motivo }) 
        });
        
        if (resposta.ok) {
          setDadosTabela(prev => prev.filter(item => item.idOriginal !== idOriginal));
          setLinhaExpandida(null);
        }
      } catch (error) {
        console.error("Erro na recusa:", error);
      }
    }
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
                            <span className="badge-tipo-lista azul">{linha.tipo}</span>
                          </div>
                          
                          <div className="item-meta-info">
                            WBS: <a href="#" className="link-wbs">{linha.wbs}</a> &middot;
                            {linha.itens?.length || 0} itens &middot;
                            {linha.solicitante}
                          </div>
                        </div>

                        <div className="item-acoes-grupo">
                          {/* ✨ BOTÃO EDITAR ITENS */}
                          <button className="btn-acao-lista" style={{ color: '#0369a1' }} onClick={() => abrirModalEdicaoItens(linha)}>
                            <Edit size={16} /> Editar Itens
                          </button>

                          <button className="btn-acao-lista btn-ver-itens" onClick={() => toggleLinha(idUnico)}>
                            <Eye size={16} /> Ver Itens
                          </button>

                          {isCrossdocking && !nfNoEstoque ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', marginLeft: '12px' }}>
                              <AlertCircle size={16} /> Aguardando NF {linha.nfCrossdocking}
                            </div>
                          ) : (
                            <>
                              <button className="btn-acao-lista btn-recusar-outline" onClick={(e) => handleRecusar(e, linha.idOriginal)}>
                                <X size={16} /> Recusar
                              </button>
                              <button className="btn-acao-lista btn-aprovar-solid btn-atualizado-azul" onClick={(e) => handleAprovar(e, linha.idOriginal)}>
                                <Check size={16} /> Aprovar
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isExpandida && (
                        <div className="gaveta-detalhes">
                          <DetalhesSolicitacao item={linha} perfil="logistica" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
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
                            <span className="badge-tipo-lista verde">Entrada</span>
                          </div>
                          
                          <div className="item-meta-info">
                            WBS: <a href="#" className="link-wbs">{linha.wbs}</a> &middot;
                            {linha.itens?.length || 0} itens &middot;
                            {linha.solicitante}
                          </div>
                        </div>

                        <div className="item-acoes-grupo">
                          {/* ✨ BOTÃO EDITAR ITENS */}
                          <button className="btn-acao-lista" style={{ color: '#0369a1' }} onClick={() => abrirModalEdicaoItens(linha)}>
                            <Edit size={16} /> Editar Itens
                          </button>

                          <button className="btn-acao-lista btn-ver-itens" onClick={() => toggleLinha(idUnico)}>
                            <Eye size={16} /> Ver Itens
                          </button>
                          <button className="btn-acao-lista btn-recusar-outline" onClick={(e) => handleRecusar(e, linha.idOriginal)}>
                            <X size={16} /> Recusar
                          </button>
                          <button className="btn-acao-lista btn-aprovar-solid" onClick={(e) => handleAprovar(e, linha.idOriginal)}>
                            <Check size={16} /> Aprovar
                          </button>
                        </div>
                      </div>

                      {isExpandida && (
                        <div className="gaveta-detalhes">
                          <DetalhesSolicitacao item={linha} perfil="logistica" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ✨ MODAL DE EDIÇÃO DE ITENS ✨ */}
      {modalEdicaoItensAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '24px', borderRadius: '12px', 
            width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <Edit size={20} color="#0284c7" /> Editar Itens da Solicitação {solicitacaoSendoEditada?.ps}
              </h3>
              <button onClick={() => setModalEdicaoItensAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '8px', fontSize: '0.85rem', color: '#475569' }}>Part Number</th>
                    <th style={{ padding: '8px', fontSize: '0.85rem', color: '#475569' }}>Descrição</th>
                    <th style={{ padding: '8px', fontSize: '0.85rem', color: '#475569', width: '80px' }}>Qtd</th>
                    <th style={{ padding: '8px', fontSize: '0.85rem', color: '#475569', width: '50px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensEdicao.map((item, index) => (
                    <tr key={item.id || item.id_temporario || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>
                        <input 
                          type="text" 
                          value={item.numPecaFabricante || item.part_number || ''} 
                          onChange={(e) => atualizarCampoItem(index, 'numPecaFabricante', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          placeholder="PN"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input 
                          type="text" 
                          value={item.materialDescription || item.descricao || ''} 
                          onChange={(e) => atualizarCampoItem(index, 'materialDescription', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          placeholder="Descrição"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input 
                          type="number" 
                          value={item.quantidade_solicitada || item.quantidade || item.qtd || 1} 
                          onChange={(e) => atualizarCampoItem(index, 'quantidade_solicitada', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          min="1"
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button 
                          onClick={() => removerLinhaItem(index)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {itensEdicao.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', margin: '20px 0' }}>Nenhum item na lista.</p>
              )}
            </div>

            <button 
              onClick={adicionarLinhaItem}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', marginBottom: '24px' }}
            >
              <Plus size={16} /> Adicionar Linha
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                onClick={() => setModalEdicaoItensAberto(false)}
                style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: '500', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={salvarEdicaoItens}
                style={{ padding: '8px 16px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '500', cursor: 'pointer' }}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}