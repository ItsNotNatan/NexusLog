import React, { useState, useEffect } from 'react';
import './PainelGeralSolicitacoes.css';
import {
  Search,
  ChevronRight,
  GitBranch,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Edit2,
  AlertCircle 
} from 'lucide-react';

const filtrosArray = ['Todos', 'Material', 'Transferencia WBS', 'Nota Fiscal', 'Entrada', 'Crossdocking', 'Reintegracao'];

const renderBadgeStatus = (status) => {
  switch (status) {
    case 'Em Separação':
      return (
        <span className="badge-status status-separacao">
          <RefreshCw size={14} /> Em Separação
        </span>
      );
    case 'Pendente':
      return (
        <span className="badge-status status-pendente" style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          Pendente
        </span>
      );
    case 'Concluído':
      return (
        <span className="badge-status status-concluido">
          <CheckCircle2 size={14} /> Concluído
        </span>
      );
    case 'Cancelado':
    case 'Recusado':
      return (
        <span className="badge-status status-cancelado">
          <XCircle size={14} /> {status}
        </span>
      );
    default:
      return <span>{status}</span>;
  }
};

export default function PainelGeralSolicitacoes() {
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');

  // 1. ✨ ESTADOS REAIS
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // 2. ✨ BUSCA OS DADOS REAIS DO BACKEND AO ABRIR A TELA
  useEffect(() => {
    const buscarDados = async () => {
      try {
        setCarregando(true);
        const [resSolicitacoes, resEstoque] = await Promise.all([
          fetch('http://localhost:3001/api/solicitacoes/listar'),
          fetch('http://localhost:3001/api/estoque/listar')
        ]);

        const resultadoSol = await resSolicitacoes.json();
        const resultadoEst = await resEstoque.json();

        if (resEstoque.ok && resultadoEst.sucesso) {
          setEstoque(resultadoEst.dados);
        }

        if (resSolicitacoes.ok && resultadoSol.sucesso) {
          // Formatamos os dados para a tabela
          const dadosFormatados = resultadoSol.dados.map(item => ({
            ...item,
            idNumerico: item.id.replace(/\D/g, '') || item.id,
            // A data que vem do banco (dataSolicitacao) ou created_at
            dataCriacaoFormatada: item.dataSolicitacao || new Date(item.created_at).toLocaleDateString('pt-BR'),
            nfCrossdocking: item.notas_fiscais && item.notas_fiscais.length > 0 ? item.notas_fiscais[0].numero_nf : (item.notas_fiscais?.numero_nf || null)
          }));
          setSolicitacoes(dadosFormatados);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do painel geral:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarDados();
  }, []);

  // 3. ✨ FUNÇÃO PARA ATUALIZAR STATUS REAL NO BACKEND
  const lidarComMudancaStatus = async (idSolicitacao, novoStatus) => {
    // Confirmação de segurança
    if (!window.confirm(`Tem certeza que deseja mudar o status da solicitação ${idSolicitacao} para "${novoStatus}"?`)) {
      return;
    }

    let motivo = null;
    if (novoStatus === 'Recusado' || novoStatus === 'Cancelado') {
      motivo = window.prompt("Por favor, informe o motivo do cancelamento/recusa:");
      if (!motivo) return; // Cancela a operação se não houver motivo
    }

    try {
      // Faz a chamada real ao backend
      const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${idSolicitacao}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, motivo_recusa: motivo })
      });

      if (resposta.ok) {
        // Atualizamos a lista localmente para não precisar recarregar a página
        const listaAtualizada = solicitacoes.map(sol => {
          if (sol.id === idSolicitacao) {
            return { ...sol, status: novoStatus };
          }
          return sol;
        });
        setSolicitacoes(listaAtualizada);
        alert(`Status atualizado com sucesso!`);
      } else {
        alert("Erro ao atualizar o status no servidor.");
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
      alert("Falha de conexão com o servidor.");
    }
  };

  // 4. ✨ LÓGICA DE FILTRAGEM
  const dadosFiltrados = solicitacoes.filter((linha) => {
    // Filtro por Aba
    const passaAba = filtroAtivo === 'Todos' || linha.tipo === filtroAtivo || (filtroAtivo === 'Transfer. WBS' && linha.tipo === 'Transferencia WBS');

    // Filtro por Pesquisa
    const termoLower = termoPesquisa.toLowerCase();
    const passaPesquisa = linha.id.toLowerCase().includes(termoLower) ||
      (linha.solicitante && linha.solicitante.toLowerCase().includes(termoLower)) ||
      (linha.wbs && linha.wbs.toLowerCase().includes(termoLower));

    return passaAba && passaPesquisa;
  });

  return (
    <div className="painel-geral-wrapper">

      <header className="painel-cabecalho">
        <h1>Painel Geral de Solicitações</h1>
        <p>Gerencie todas as solicitações — materiais, WBS, NFs, entradas, crossdocking e reintegrações</p>
      </header>

      {/* CARTÕES DE RESUMO SUPERIORES (KPIs) */}
      <div className="kpis-linha-5">
        <div className="kpi-card-resumo kpi-total">
          <span>Total</span>
          <strong>{solicitacoes.length}</strong>
        </div>
        <div className="kpi-card-resumo kpi-pendentes">
          <span>Pendentes</span>
          <strong>{solicitacoes.filter(s => s.status === 'Pendente').length}</strong>
        </div>
        <div className="kpi-card-resumo kpi-andamento">
          <span>Em Andamento</span>
          <strong>{solicitacoes.filter(s => s.status === 'Em Separação').length}</strong>
        </div>
        <div className="kpi-card-resumo kpi-concluidos">
          <span>Concluídos</span>
          <strong>{solicitacoes.filter(s => s.status === 'Concluído').length}</strong>
        </div>
        <div className="kpi-card-resumo kpi-recusados">
          <span>Cancelados/Recusados</span>
          <strong>{solicitacoes.filter(s => s.status === 'Cancelado' || s.status === 'Recusado').length}</strong>
        </div>
      </div>

      {/* ÁREA DA TABELA */}
      <div className="tabela-cartao-container">

        <div className="tabela-controlos-topo">
          <div className="filtros-botoes">
            {filtrosArray.map((filtro) => (
              <button
                key={filtro}
                className={`btn-aba ${filtroAtivo === filtro ? 'ativo' : ''}`}
                onClick={() => setFiltroAtivo(filtro)}
              >
                {filtro}
              </button>
            ))}
          </div>

          <div className="controlos-direita">
            <select className="select-periodo">
              <option>Todo Período</option>
              <option>Este Mês</option>
              <option>Hoje</option>
            </select>
            <div className="pesquisa-wrapper-direita">
              <Search className="icone-pesquisa-dir" size={16} />
              <input
                type="text"
                placeholder="Buscar solicitações..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
              />
            </div>
          </div>
        </div>

        {carregando ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Carregando dados do servidor...</div>
        ) : (
          <div className="tabela-scroll-horizontal">
            <table className="tabela-solicitacoes">
              <thead>
                <tr>
                  <th className="col-chevron"></th>
                  <th>TIPO</th>
                  <th>ID / SOLICITANTE / WBS</th>
                  <th>Nº DO BS</th>
                  <th>DATA CRIAÇÃO</th>
                  <th>DATA/HORA FINALIZ.</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((linha) => {
                  // ✨ REGRA DE BLOQUEIO DE CROSSDOCKING ✨
                  const isCrossdocking = linha.tipo === 'Crossdocking';
                  let nfNoEstoque = true; // Por defeito, liberado

                  // Se for Crossdocking e tiver NF, procuramos a NF na lista de estoque usando conversão de texto e trim()
                  if (isCrossdocking && linha.nfCrossdocking) {
                    nfNoEstoque = estoque.some(itemEstoque => {
                      const nfEstoqueLimpa = String(itemEstoque.nf_entrada || '').trim();
                      const nfSolicitacaoLimpa = String(linha.nfCrossdocking || '').trim();
                      return nfEstoqueLimpa === nfSolicitacaoLimpa && nfEstoqueLimpa !== '';
                    });
                  }

                  // A ação fica bloqueada se for Crossdocking E a NF não tiver dado entrada
                  const statusBloqueado = isCrossdocking && !nfNoEstoque;

                  return (
                    <tr key={linha.id}>
                      <td className="col-chevron">
                        <ChevronRight size={18} />
                      </td>

                      <td>
                        <span className="badge-tipo">
                          <GitBranch size={14} /> {linha.tipo}
                        </span>
                      </td>

                      <td>
                        <div className="bloco-id-multiplo">
                          <span className="texto-ps-id">PS : {linha.idNumerico}</span>
                          <span className="nome-solicitante">{linha.solicitante}</span>
                          <a href="#" className="link-wbs">{linha.wbs}</a>
                        </div>
                      </td>

                      <td>
                        {linha.bs ? (
                          <span className="badge-bs">
                            <FileText size={14} /> {linha.bs}
                          </span>
                        ) : (
                          <span className="traco-vazio">—</span>
                        )}
                      </td>

                      <td className="texto-data">{linha.dataCriacaoFormatada}</td>

                      <td>
                        {linha.dataFinalizacao ? (
                          <div className="bloco-finalizacao">
                            <span className="texto-data-verde">{linha.dataFinalizacao}</span>
                            <button className="btn-editar-data"><Edit2 size={12} /> Editar</button>
                          </div>
                        ) : (
                          linha.status !== 'Cancelado' ? (
                            <div className="bloco-finalizacao">
                              <span className="texto-data-amarelo">não definido</span>
                              <button className="btn-editar-data"><Edit2 size={12} /> Editar</button>
                            </div>
                          ) : (
                            <span className="traco-vazio">—</span>
                          )
                        )}
                      </td>

                      <td>
                        {renderBadgeStatus(linha.status)}
                      </td>

                      {/* 🛠️ AÇÕES ATUALIZADAS AQUI */}
                      <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {statusBloqueado ? (
                          // 🔒 BLOQUEADO: Exibe a etiqueta amarela
                          <div 
                            title={`Aguardando NF ${linha.nfCrossdocking} no estoque`} 
                            style={{ 
                              color: '#d97706', 
                              backgroundColor: '#fef3c7', 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          >
                            <AlertCircle size={14} /> Aguardando NF
                          </div>
                        ) : linha.status === 'Pendente' ? (
                          // ✅ LIBERADO E PENDENTE: Exibe o botão de Aprovar
                          <button 
                            className="btn-aprovar-laranja" 
                            style={{
                              backgroundColor: '#f97316',
                              color: 'white',
                              border: 'none',
                              padding: '6px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 'bold',
                              fontSize: '13px'
                            }}
                            onClick={() => lidarComMudancaStatus(linha.id, 'Em Separação')}
                          >
                            <RefreshCw size={14} /> Aprovar
                          </button>
                        ) : (
                          // 🔄 EM ANDAMENTO/OUTROS: Mantém o select para poder concluir ou cancelar posteriormente
                          <select
                            className="select-acao"
                            value={linha.status}
                            onChange={(e) => lidarComMudancaStatus(linha.id, e.target.value)}
                          >
                            <option value="Em Separação">Em Separação</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        )}
                      </td>

                    </tr>
                  );
                })}
                
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}