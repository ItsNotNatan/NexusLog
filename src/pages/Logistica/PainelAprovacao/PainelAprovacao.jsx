import React, { useState, useEffect } from 'react';
import './PainelAprovacao.css';
import { 
  Search, 
  Clock, 
  FileText, 
  Check, 
  X, 
  Eye, 
  Loader2,
  AlertCircle // 👈 Novo ícone importado para o aviso
} from 'lucide-react';

import DetalhesSolicitacao from '../../Cliente/AcompanhamentoSolicitacoes/Detalhes/DetalhesSolicitacao';

export default function PainelAprovacao() {
  const [dadosTabela, setDadosTabela] = useState([]);
  const [estoque, setEstoque] = useState([]); // ✨ NOVO: Estado para guardar o estoque atual
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [linhaExpandida, setLinhaExpandida] = useState(null);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        // ✨ NOVO: Busca as solicitações e o estoque ao mesmo tempo
        const [resSolicitacoes, resEstoque] = await Promise.all([
          fetch('http://localhost:3001/api/solicitacoes/listar'),
          fetch('http://localhost:3001/api/estoque/listar')
        ]);

        const resultadoSol = await resSolicitacoes.json();
        const resultadoEst = await resEstoque.json();

        // 1. Guarda o estoque
        if (resEstoque.ok && resultadoEst.sucesso) {
          setEstoque(resultadoEst.dados);
        }

        // 2. Guarda as solicitações
        if (resSolicitacoes.ok && resultadoSol.sucesso) {
          const dadosFormatados = resultadoSol.dados
            .filter(item => item.status === 'Pendente')
            .map((item) => {
              let prefixo = 'PS';
              if (item.tipo === 'Crossdocking') prefixo = 'CD';
              else if (item.tipo === 'Nota Fiscal') prefixo = 'NF';
              else if (item.tipo === 'Transferencia WBS') prefixo = 'TR';
              else if (item.tipo === 'Reintegracao') prefixo = 'REI';
              else if (item.tipo === 'Entrada') prefixo = 'ENT';

              const idNumerico = item.id.replace(/\D/g, '');

              // Calcula o total para as Entradas
              let valorTotal = 0;
              let centro = '-';
              let dep = '-';
              if (item.tipo === 'Entrada' && item.itens && item.itens.length > 0) {
                valorTotal = item.itens.reduce((acc, it) => acc + (Number(it.quantidade_solicitada) * Number(it.valor_unitario_manual || 0)), 0);
                centro = item.itens[0].centro || 'BR06';
                dep = item.itens[0].deposito || '0020';
              }

              return {
                ...item,
                idOriginal: item.id,
                id: idNumerico || item.id,
                prefixo: prefixo,
                dataSolicitacao: item.dataSolicitacao || '-',
                valorTotalFormatado: valorTotal > 0 ? `R$ ${valorTotal.toFixed(2)}` : null,
                centro,
                deposito: dep
              };
            });

          setDadosTabela(dadosFormatados);
        } else {
          console.error("Erro retornado do servidor nas solicitações:", resultadoSol.erro);
        }
      } catch (error) {
        console.error("Falha ao conectar à API:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarDados();
  }, []);

  const dadosFiltrados = dadosTabela.filter((linha) => {
    const termoLower = termoPesquisa.toLowerCase();
    return (
      linha.id.toString().toLowerCase().includes(termoLower) ||
      (linha.solicitante && linha.solicitante.toLowerCase().includes(termoLower)) ||
      (linha.wbs && linha.wbs.toLowerCase().includes(termoLower))
    );
  });

  // SEPARADOR DE LISTAS
  const entradasPendentes = dadosFiltrados.filter(item => item.tipo === 'Entrada');
  const outrasPendentes = dadosFiltrados.filter(item => item.tipo !== 'Entrada');

  const toggleLinha = (idUnico) => {
    setLinhaExpandida(linhaExpandida === idUnico ? null : idUnico);
  };

  const handleAprovar = async (e, idOriginal) => {
    e.stopPropagation();
    if (window.confirm(`Aprovar a solicitação ${idOriginal}?`)) {
      try {
        const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${idOriginal}/status`, {
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Em Separação' }) 
        });
        if (resposta.ok) {
          alert(`Solicitação aprovada!`);
          setDadosTabela(prev => prev.filter(item => item.idOriginal !== idOriginal));
          setLinhaExpandida(null);
        } else {
          alert("Erro ao aprovar no servidor.");
        }
      } catch (error) {
        alert("Erro de conexão.");
      }
    }
  };

  const handleRecusar = async (e, idOriginal) => {
    e.stopPropagation();
    const motivo = window.prompt(`Motivo da recusa para ${idOriginal}?`);
    if (motivo) {
      try {
        const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${idOriginal}/status`, {
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Recusado', motivo_recusa: motivo }) 
        });
        if (resposta.ok) {
          alert(`Solicitação recusada.`);
          setDadosTabela(prev => prev.filter(item => item.idOriginal !== idOriginal));
          setLinhaExpandida(null);
        } else {
          alert("Erro ao recusar no servidor.");
        }
      } catch (error) {
        alert("Erro de conexão.");
      }
    }
  };

  return (
    <div className="dashboard-container">
      
      <header className="acompanhamento-cabecalho">
        <h1>Painel de Aprovação</h1>
        <p>Analise e aprove as solicitações pendentes para dar andamento à operação.</p>
      </header>

      <div className="pesquisa-wrapper-direita">
        <Search className="icone-pesquisa-dir" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por ID, WBS ou Solicitante..." 
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
          {/* ======================================================== */}
          {/* SECÇÃO 1: SOLICITAÇÕES GERAIS (Amarelo)                  */}
          {/* ======================================================== */}
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
                {outrasPendentes.map((linha) => {
                  const idUnico = `geral-${linha.idOriginal}`;
                  const isExpandida = linhaExpandida === idUnico;
                  
                  // ✨ NOVO: A NOSSA REGRA DE CROSSDOCKING AQUI ✨
                  const isCrossdocking = linha.tipo === 'Crossdocking';
                  let nfNoEstoque = true; // Por defeito assumimos que pode aprovar

                  if (isCrossdocking && linha.nfCrossdocking) {
                    // Verifica se existe alguma linha no estoque com esta NF
                    nfNoEstoque = estoque.some(itemEstoque => itemEstoque.nf_entrada === linha.nfCrossdocking);
                  }

                  return (
                    <React.Fragment key={idUnico}>
                      <div className="item-lista-horizontal">
                        
                        <div className="item-info-principal">
                          <div className="item-linha-id">
                            {linha.prefixo}:{linha.id}
                            <span className="badge-tipo-lista azul">{linha.tipo}</span>
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

                        {/* ✨ RENDEREIZAÇÃO CONDICIONAL DOS BOTÕES */}
                        <div className="item-acoes-grupo">
                          <button className="btn-acao-lista btn-ver-itens" onClick={() => toggleLinha(idUnico)}>
                            <Eye size={16} /> Ver Itens
                          </button>

                          {isCrossdocking && !nfNoEstoque ? (
                            // 🔒 BLOQUEADO: Se for Crossdocking e não tiver NF no estoque, mostra o aviso
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', marginLeft: '12px' }}>
                              <AlertCircle size={16} /> Aguardando NF {linha.nfCrossdocking} no estoque
                            </div>
                          ) : (
                            // 🟢 LIBERADO: Se não for crossdocking OU se a NF já estiver no estoque, mostra os botões
                            <>
                              <button className="btn-acao-lista btn-recusar-outline" onClick={(e) => handleRecusar(e, linha.idOriginal)}>
                                <X size={16} /> Recusar
                              </button>
                              <button className="btn-acao-lista btn-aprovar-solid azul" onClick={(e) => handleAprovar(e, linha.idOriginal)}>
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

          {/* ======================================================== */}
          {/* SECÇÃO 2: ENTRADAS DE ESTOQUE (Verde)                    */}
          {/* ======================================================== */}
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
                {entradasPendentes.map((linha) => {
                  const idUnico = `entrada-${linha.idOriginal}`;
                  const isExpandida = linhaExpandida === idUnico;
                  
                  return (
                    <React.Fragment key={idUnico}>
                      <div className="item-lista-horizontal">
                        
                        <div className="item-info-principal">
                          <div className="item-linha-id">
                            {linha.prefixo}:{linha.id}
                            <span className="badge-tipo-lista verde">Entrada</span>
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
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}