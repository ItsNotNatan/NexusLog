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
  Edit2,
  MapPin
} from 'lucide-react';

import { AuthContext } from '../../../contexts/AuthContext'; 
import DetalhesSolicitacao from '../../Cliente/AcompanhamentoSolicitacoes/Detalhes/DetalhesSolicitacao';

// FUNÇÃO AUXILIAR: Traduz os códigos brutos para os nomes reais dos galpões
const obterNomeFilial = (codigo) => {
  if (!codigo || codigo === '-') return 'N/D';
  
  const codLimpo = String(codigo).toUpperCase().trim();
  
  switch (codLimpo) {
    case "BR02":
      return "Santo André";
    case "BR04":
      return "Goiana";
    case "BR06":
      return "Betim";
    case "TODOS":
      return "Todas as Filiais";
    default:
      return codigo; 
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

  // --- ESTADOS DO MODAL DE EDIÇÃO ---
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [solicitacaoSendoEditada, setSolicitacaoSendoEditada] = useState(null);
  const [dadosEdicao, setDadosEdicao] = useState({ filial: '', centro: '', deposito: '' });

  // --- ESTADOS DE PAGINAÇÃO ---
  const [paginaGeral, setPaginaGeral] = useState(1);
  const [paginaEntradas, setPaginaEntradas] = useState(1);
  const itensPorPagina = 5;

  // --- BUSCA INITIAL DOS DADOS (TOTALMENTE SILENCIOSA) ---
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

        // Armazena dados do estoque auxiliar se a resposta for positiva
        if (resEstoque.ok && resultadoEst.sucesso) {
          setEstoque(resultadoEst.dados);
        }

        // Filtra e formata as solicitações pendentes para exibição
        if (resSolicitacoes.ok && resultadoSol.sucesso) {
          const dadosFormatados = resultadoSol.dados
            .filter(item => item.status === 'Pendente')
            .map((item) => {
              let valorTotal = 0;
              let centro = '-';
              let dep = '-';
              
              if (String(item.tipo).trim() === 'Entrada' && item.itens && item.itens.length > 0) {
                valorTotal = item.itens.reduce((acc, it) => acc + (Number(it.quantidade_solicitada) * Number(it.valor_unitario_manual || 0)), 0);
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

  // --- FILTRAGEM E PESQUISA EM MEMÓRIA ---
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

  // Separação dos blocos visuais da tela (Pedidos Gerais vs Entradas de Estoque)
  const entradasPendentes = dadosFiltrados.filter(item => String(item.tipo).trim() === 'Entrada');
  const outrasPendentes = dadosFiltrados.filter(item => String(item.tipo).trim() !== 'Entrada');

  // Cálculos de paginação para o primeiro bloco
  const totalPaginasGeral = Math.max(1, Math.ceil(outrasPendentes.length / itensPorPagina));
  const indexPrimeiroGeral = (paginaGeral - 1) * itensPorPagina;
  const indexUltimoGeral = paginaGeral * itensPorPagina;
  const outrasPendentesPaginadas = outrasPendentes.slice(indexPrimeiroGeral, indexUltimoGeral);

  // Cálculos de paginação para o segundo bloco (Entradas)
  const totalPaginasEntradas = Math.max(1, Math.ceil(entradasPendentes.length / itensPorPagina));
  const indexPrimeiroEntradas = (paginaEntradas - 1) * itensPorPagina;
  const indexUltimoEntradas = paginaEntradas * itensPorPagina;
  const entradasPendentesPaginadas = entradasPendentes.slice(indexPrimeiroEntradas, indexUltimoEntradas);

  // Reseta páginas caso uma nova busca aconteça
  useEffect(() => {
    setPaginaGeral(1);
    setPaginaEntradas(1);
  }, [termoPesquisa]);

  useEffect(() => {
    if (paginaGeral > totalPaginasGeral) setPaginaGeral(totalPaginasGeral);
  }, [outrasPendentes.length, paginaGeral, totalPaginasGeral]);

  useEffect(() => {
    if (paginaEntradas > totalPaginasEntradas) setPaginaEntradas(totalPaginasEntradas);
  }, [entradasPendentes.length, paginaEntradas, totalPaginasEntradas]);

  const toggleLinha = (idUnico) => {
    setLinhaExpandida(linhaExpandida === idUnico ? null : idUnico);
  };

  // --- CONTROLE DE EDIÇÃO DO LOCAL DE ESTOQUE ---
  const abrirModalEdicao = (linha) => {
    setSolicitacaoSendoEditada(linha);
    setDadosEdicao({
      filial: linha.filial !== '-' ? linha.filial : 'BR06',
      centro: linha.centro !== '-' ? linha.centro : 'BR06',
      deposito: linha.deposito !== '-' ? linha.deposito : '0020'
    });
    setModalEdicaoAberto(true);
  };

  const salvarEdicaoLocal = async () => {
    if (!solicitacaoSendoEditada) return;

    try {
      // Otimismo na interface: Atualiza a tela antes mesmo da resposta do servidor
      setDadosTabela(prev => prev.map(item => {
        if (item.idOriginal === solicitacaoSendoEditada.idOriginal) {
          return { ...item, filial: dadosEdicao.filial, centro: dadosEdicao.centro, deposito: dadosEdicao.deposito };
        }
        return item;
      }));

      const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${solicitacaoSendoEditada.idOriginal}/local`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(dadosEdicao)
      });

      if (resposta.ok) {
        setModalEdicaoAberto(false);
      } else {
        console.warn("O servidor recusou a atualização dos locais de armazenamento.");
      }
    } catch (error) {
      console.error('Erro de rede ao tentar atualizar o local:', error);
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
          // Remove silenciosamente o item aprovado da lista local
          setDadosTabela(prev => prev.filter(item => item.idOriginal !== idOriginal));
          setLinhaExpandida(null);
        } else {
          console.error("Erro retornado pelo servidor ao tentar aprovar.");
        }
      } catch (error) {
        console.error("Erro de comunicação com o servidor durante a aprovação:", error);
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
          // Remove silenciosamente o item recusado da lista local
          setDadosTabela(prev => prev.filter(item => item.idOriginal !== idOriginal));
          setLinhaExpandida(null);
        } else {
          console.error("Erro retornado pelo servidor ao tentar recusar.");
        }
      } catch (error) {
        console.error("Erro de comunicação com o servidor durante a recusa:", error);
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
                            
                            {linha.filial && linha.filial !== '-' && (
                              <span style={{ 
                                marginLeft: '8px', padding: '2px 8px', backgroundColor: '#f1f5f9', 
                                color: '#475569', borderRadius: '4px', fontSize: '0.75rem', 
                                fontWeight: '700', border: '1px solid #cbd5e1' 
                              }}>
                                📍 {obterNomeFilial(linha.filial)}
                              </span>
                            )}
                          </div>
                          
                          <div className="item-meta-info">
                            WBS: <a href="#" className="link-wbs">{linha.wbs}</a> &middot;
                            {linha.itens?.length || 0} itens &middot;
                            {linha.solicitante} &middot;
                            {linha.dataSolicitacao}
                          </div>
                          
                          {linha.observacoes && (
                            <div className="item-obs">Obs: {linha.observacoes}</div>
                          )}
                        </div>

                        <div className="item-acoes-grupo">
                          <button className="btn-acao-lista" style={{ color: '#475569' }} onClick={() => abrirModalEdicao(linha)}>
                            <Edit2 size={16} /> Editar Local
                          </button>

                          <button className="btn-acao-lista btn-ver-itens" onClick={() => toggleLinha(idUnico)}>
                            <Eye size={16} /> Ver Itens
                          </button>

                          {isCrossdocking && !nfNoEstoque ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', marginLeft: '12px' }}>
                              <AlertCircle size={16} /> Aguardando NF {linha.nfCrossdocking} no estoque
                            </div>
                          ) : (
                            <>
                              <button className="btn-acao-lista btn-recusar-outline" onClick={(e) => handleRecusar(e, Commutators => linha.idOriginal)}>
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

                {totalPaginasGeral > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 8px 8px' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Página <strong>{paginaGeral}</strong> de <strong>{totalPaginasGeral}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        onClick={() => setPaginaGeral(p => Math.max(p - 1, 1))} 
                        disabled={paginaGeral === 1}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: paginaGeral === 1 ? 'not-allowed' : 'pointer', opacity: paginaGeral === 1 ? 0.6 : 1 }}
                      >
                        <ChevronLeft size={16} /> Anterior
                      </button>

                      {Array.from({ length: totalPaginasGeral }, (_, i) => {
                        const num = i + 1;
                        const ehAtiva = paginaGeral === num;
                        return (
                          <button
                            key={num}
                            onClick={() => setPaginaGeral(num)}
                            style={{ padding: '6px 12px', backgroundColor: ehAtiva ? '#ea580c' : '#ffffff', color: ehAtiva ? '#ffffff' : '#334155', border: `1px solid ${ehAtiva ? '#ea580c' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '0.875rem', fontWeight: ehAtiva ? '600' : '500', cursor: 'pointer' }}
                          >
                            {num}
                          </button>
                        );
                      })}

                      <button 
                        onClick={() => setPaginaGeral(p => Math.min(p + 1, totalPaginasGeral))} 
                        disabled={paginaGeral === totalPaginasGeral}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: paginaGeral === totalPaginasGeral ? 'not-allowed' : 'pointer', opacity: paginaGeral === totalPaginasGeral ? 0.6 : 1 }}
                      >
                        Próxima <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
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
                            
                            {linha.filial && linha.filial !== '-' && (
                              <span style={{ 
                                marginLeft: '8px', padding: '2px 8px', backgroundColor: '#dcfce7', 
                                color: '#166534', borderRadius: '4px', fontSize: '0.75rem', 
                                fontWeight: '700', border: '1px solid #bbf7d0' 
                              }}>
                                🏢 {obterNomeFilial(linha.filial)}
                              </span>
                            )}
                          </div>
                          
                          <div className="item-meta-info">
                            WBS: <a href="#" className="link-wbs">{linha.wbs}</a> &middot;
                            {linha.itens?.length || 0} itens &middot;
                            {linha.solicitante} &middot;
                            Centro: {linha.centro} &middot;
                            Dep: {linha.deposito} &middot;
                            <span className="texto-valor-rs">{linha.valorTotalFormatado || 'R$ 0,00'}</span>
                          </div>
                          
                          {linha.observacoes && (
                            <div className="item-obs">Obs: {linha.observacoes}</div>
                          )}
                        </div>

                        <div className="item-acoes-grupo">
                          <button className="btn-acao-lista" style={{ color: '#475569' }} onClick={() => abrirModalEdicao(linha)}>
                            <Edit2 size={16} /> Editar Local
                          </button>

                          <button className="btn-acao-lista btn-ver-itens" onClick={() => toggleLinha(idUnico)}>
                            <Eye size={16} /> Ver Itens
                          </button>
                          <button className="btn-acao-lista btn-recusar-outline" onClick={(e) => handleRecusar(e, linha.idOriginal)}>
                            <X size={16} /> Recusar
                          </button>
                          <button className="btn-acao-lista btn-aprovar-solid" onClick={(e) => handleAprovar(e, linha.idOriginal)}>
                            <Check size={16} /> Aprovar Entrada
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

                {totalPaginasEntradas > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 8px 8px' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Página <strong>{paginaEntradas}</strong> de <strong>{totalPaginasEntradas}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        onClick={() => setPaginaEntradas(p => Math.max(p - 1, 1))} 
                        disabled={paginaEntradas === 1}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: paginaEntradas === 1 ? 'not-allowed' : 'pointer', opacity: paginaEntradas === 1 ? 0.6 : 1 }}
                      >
                        <ChevronLeft size={16} /> Anterior
                      </button>

                      {Array.from({ length: totalPaginasEntradas }, (_, i) => {
                        const num = i + 1;
                        const ehAtiva = paginaEntradas === num;
                        return (
                          <button
                            key={num}
                            onClick={() => setPaginaEntradas(num)}
                            style={{ padding: '6px 12px', backgroundColor: ehAtiva ? '#16a34a' : '#ffffff', color: ehAtiva ? '#ffffff' : '#334155', border: `1px solid ${ehAtiva ? '#16a34a' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '0.875rem', fontWeight: ehAtiva ? '600' : '500', cursor: 'pointer' }}
                          >
                            {num}
                          </button>
                        );
                      })}

                      <button 
                        onClick={() => setPaginaEntradas(p => Math.min(p + 1, totalPaginasEntradas))} 
                        disabled={paginaEntradas === totalPaginasEntradas}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: paginaEntradas === totalPaginasEntradas ? 'not-allowed' : 'pointer', opacity: paginaEntradas === totalPaginasEntradas ? 0.6 : 1 }}
                      >
                        Próxima <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL DE EDIÇÃO DE DESTINO */}
      {modalEdicaoAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '24px', borderRadius: '12px', 
            width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <MapPin size={20} color="#ea580c" /> Editar Destino
              </h3>
              <button onClick={() => setModalEdicaoAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>
              Ajuste as informações de armazenamento da solicitação <strong>{solicitacaoSendoEditada?.ps}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Filial
              </label>
              <select 
                value={dadosEdicao.filial}
                onChange={(e) => setDadosEdicao({...dadosEdicao, filial: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="BR02">Santo André</option>
                <option value="BR04">Goiana</option>
                <option value="BR06">Betim</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Centro</label>
                <input 
                  type="text" 
                  value={dadosEdicao.centro}
                  onChange={(e) => setDadosEdicao({...dadosEdicao, centro: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Depósito</label>
                <input 
                  type="text" 
                  value={dadosEdicao.deposito}
                  onChange={(e) => setDadosEdicao({...dadosEdicao, deposito: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setModalEdicaoAberto(false)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', fontWeight: '500', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={salvarEdicaoLocal}
                style={{ padding: '8px 16px', background: '#ea580c', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '500', cursor: 'pointer' }}
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