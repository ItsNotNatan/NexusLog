import React, { useState, useEffect } from 'react';
import './AcompanhamentoSolicitacoes.css';
import { 
  Search, 
  ChevronRight, 
  GitBranch, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Zap,
  Upload,
  RefreshCcw
} from 'lucide-react';

// 👇 IMPORTAÇÃO DOS COMPONENTES
import DetalhesSolicitacao from './Detalhes/DetalhesSolicitacao';
import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';

// --- FUNÇÕES AUXILIARES DE RENDERIZAÇÃO ---
const renderBadgeStatus = (status) => {
  switch (status) {
    case 'Pendente':
    case 'Em Separação':
    case 'Em Andamento':
      return (
        <span className="badge-status status-separacao">
          <RefreshCw size={14} className="animate-spin" /> {status}
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
      return <span className="badge-status">{status}</span>;
  }
};

const obterClasseBadgeTipo = (tipo) => {
  switch (tipo) {
    case 'Transfer. WBS':
    case 'Transferencia WBS': return 'badge-tipo-amarelo';
    case 'Nota Fiscal': return 'badge-tipo-roxo';
    case 'Entrada': return 'badge-tipo-verde';
    case 'Crossdocking': return 'badge-tipo-ciano';
    case 'Reintegração':
    case 'Reintegracao': return 'badge-tipo-laranja';
    case 'Cancelado': return 'badge-tipo-vermelho';
    case 'Material':
    default: return 'badge-tipo-azul';
  }
};

// --- COMPONENTE PRINCIPAL (Agora recebe a prop "perfil") ---
export default function AcompanhamentoSolicitacoes({ perfil = 'cliente' }) {
  const [dadosTabela, setDadosTabela] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  
  // Guarda qual linha está aberta
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  
  // Guarda os anexos da gaveta aberta
  const [anexosNovos, setAnexosNovos] = useState([]);

  const listaFiltros = [
    'Todos', 'Material', 'Transfer. WBS', 'Nota Fiscal', 'Entrada', 'Crossdocking', 'Reintegração'
  ];

  // SIMULAÇÃO DE BUSCA NA API
  useEffect(() => {
    const buscarSolicitacoes = async () => {
      try {
        // Substituir pela tua API real. Por agora, simulamos com um mock que inclui as ações da logística.
        const mockDados = [
          { prefixo: 'REI', id: '1307261016', tipo: 'Reintegração', solicitante: 'DOUG', wbs: '', bs: '-', dataSolicitacao: '13/07/26 13:16', dataEntrega: '-', status: 'Em Andamento', acaoTipo: 'botao', acaoValor: 'Aprovar', entregaUrgente: true },
          { prefixo: 'CD', id: '1307261016', tipo: 'Crossdocking', solicitante: 'DOUGLAS', wbs: 'BB29', bs: '-', dataSolicitacao: '13/07/26 13:16', dataEntrega: '-', status: 'Pendente', acaoTipo: 'select', acaoValor: 'Pendente' },
          { prefixo: 'NF', id: '1307261016', tipo: 'Nota Fiscal', solicitante: 'EMISSÃO DE NOTA FISCAL', wbs: 'TESTE', bs: '-', dataSolicitacao: '13/07/26 13:16', dataEntrega: '-', status: 'Pendente', acaoTipo: 'select', acaoValor: 'Pendente' },
          { prefixo: 'PS', id: '1307261015', tipo: 'Material', solicitante: 'NATAN GUIMARES', wbs: 'BRBRRBA32-MAT-000-WP001', bs: '-', dataSolicitacao: '13/07/26 13:15', dataEntrega: '-', status: 'Em Andamento', acaoTipo: 'select', acaoValor: 'Ag. Lanç. Planilha' }
        ];
        
        setDadosTabela(mockDados);
        setCarregando(false);
      } catch (error) {
        console.error("Falha ao conectar à API:", error);
        setCarregando(false);
      }
    };
    buscarSolicitacoes();
  }, []);

  // LÓGICA DOS KPIs
  const kpiTotal = dadosTabela.length;
  const kpiPendentes = dadosTabela.filter(item => item.status === 'Pendente').length;
  const kpiAndamento = dadosTabela.filter(item => item.status === 'Em Separação' || item.status === 'Em Andamento').length;
  const kpiConcluidos = dadosTabela.filter(item => item.status === 'Concluído').length;
  const kpiRecusados = dadosTabela.filter(item => item.status === 'Recusado' || item.status === 'Cancelado').length;

  // LÓGICA DE FILTRAGEM
  const dadosFiltrados = dadosTabela.filter((linha) => {
    let passaFiltroAba = true;
    if (filtroAtivo !== 'Todos') {
      const tipoMapeado = 
        filtroAtivo === 'Transfer. WBS' ? 'Transferencia WBS' :
        filtroAtivo === 'Reintegração' ? 'Reintegracao' : filtroAtivo;
      passaFiltroAba = linha.tipo === tipoMapeado || linha.tipo === filtroAtivo;
    }

    let passaFiltroStatus = true;
    if (filtroStatus !== 'Todos') {
      if (filtroStatus === 'Em Separação') {
        passaFiltroStatus = linha.status === 'Em Separação' || linha.status === 'Em Andamento';
      } else if (filtroStatus === 'Recusado') {
        passaFiltroStatus = linha.status === 'Recusado' || linha.status === 'Cancelado';
      } else {
        passaFiltroStatus = linha.status === filtroStatus;
      }
    }

    const termoLower = termoPesquisa.toLowerCase();
    const passaPesquisa = 
      linha.id.toString().toLowerCase().includes(termoLower) ||
      (linha.solicitante && linha.solicitante.toLowerCase().includes(termoLower)) ||
      (linha.wbs && linha.wbs.toLowerCase().includes(termoLower)) ||
      (linha.bs && linha.bs.toLowerCase().includes(termoLower));

    return passaFiltroAba && passaFiltroStatus && passaPesquisa;
  });

  const toggleLinha = (id) => {
    setLinhaExpandida(linhaExpandida === id ? null : id);
    setAnexosNovos([]); 
  };

  const handleEnviarAnexosExtras = async (idSolicitacao) => {
    if (anexosNovos.length === 0) return;
    alert(`Pronto para enviar ${anexosNovos.length} novo(s) anexo(s) para a solicitação ${idSolicitacao}!`);
  };

  return (
    <div className="acompanhamento-wrapper">

      {/* ========================================== */}
      {/* CABEÇALHO DINÂMICO (Baseado no Perfil)     */}
      {/* ========================================== */}
      <header className="acompanhamento-cabecalho">
        <h1>
          {perfil === 'logistica' 
            ? 'Painel Geral de Solicitações' 
            : 'Acompanhamento de Solicitações'}
        </h1>
        <p>
          {perfil === 'logistica' 
            ? 'Gerencie todas as solicitações — materiais, WBS, NFs, entradas, crossdocking e reintegrações' 
            : 'Visualize todas as solicitações abertas do sistema'}
        </p>
      </header>

      <div className="kpis-linha">
        <div className={`kpi-card-resumo kpi-total ${filtroStatus === 'Todos' ? 'ativo' : ''}`} onClick={() => setFiltroStatus('Todos')}>
          <span>Total</span><strong>{kpiTotal}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-pendentes ${filtroStatus === 'Pendente' ? 'ativo' : ''}`} onClick={() => setFiltroStatus('Pendente')}>
          <span>Pendentes</span><strong>{kpiPendentes}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-andamento ${filtroStatus === 'Em Separação' ? 'ativo' : ''}`} onClick={() => setFiltroStatus('Em Separação')}>
          <span>Em Andamento</span><strong>{kpiAndamento}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-concluidos ${filtroStatus === 'Concluído' ? 'ativo' : ''}`} onClick={() => setFiltroStatus('Concluído')}>
          <span>Concluídos</span><strong>{kpiConcluidos}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-recusados ${filtroStatus === 'Recusado' ? 'ativo' : ''}`} onClick={() => setFiltroStatus('Recusado')}>
          <span>Recusados</span><strong>{kpiRecusados}</strong>
        </div>
      </div>

      <div className="tabela-cartao-container">
        
        <div className="tabela-controlos-topo">
          <div className="filtros-botoes">
            {listaFiltros.map((filtro) => (
              <button key={filtro} className={`btn-aba ${filtroAtivo === filtro ? 'ativo' : ''}`} onClick={() => setFiltroAtivo(filtro)}>
                {filtro}
              </button>
            ))}
          </div>
          <div className="pesquisa-wrapper-direita">
            <Search className="icone-pesquisa-dir" size={18} />
            <input type="text" placeholder="Buscar por ID, solicitante, WBS..." value={termoPesquisa} onChange={(e) => setTermoPesquisa(e.target.value)} />
          </div>
        </div>

        <div className="tabela-scroll-horizontal">
          {carregando ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>Carregando solicitações...</div>
          ) : dadosFiltrados.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Nenhuma solicitação encontrada.</div>
          ) : (
            <table className="tabela-solicitacoes">
              <thead>
                <tr>
                  <th className="col-chevron"></th>
                  <th>TIPO</th>
                  <th>ID / SOLICITANTE / WBS</th>
                  <th>Nº DO BS</th>
                  <th>DATA CRIAÇÃO</th>
                  <th>DATA ENTREGA</th>
                  <th>STATUS</th>
                  
                  {/* ========================================== */}
                  {/* COLUNA DINÂMICA: AÇÕES (SÓ LOGÍSTICA)      */}
                  {/* ========================================== */}
                  {perfil === 'logistica' && <th>AÇÕES</th>}
                  
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((linha, index) => {
                  const isExpandida = linhaExpandida === linha.id;
                  
                  return (
                    <React.Fragment key={linha.id || index}>
                      
                      <tr className={isExpandida ? 'tr-expandida' : ''}>
                        <td className="col-chevron" onClick={() => toggleLinha(linha.id)}>
                          <ChevronRight size={18} className={isExpandida ? 'icone-rotacionado' : 'icone-normal'} style={{ color: '#94a3b8' }} />
                        </td>
                        
                        <td>
                          <div className="bloco-tipo-id">
                            <span className={`badge-tipo ${obterClasseBadgeTipo(linha.tipo)} ${linha.entregaUrgente ? 'badge-urgente-critico' : ''}`}>
                              {linha.entregaUrgente ? <Zap size={13} color="#ef4444" fill="#ef4444" /> : <GitBranch size={13} />} 
                              {linha.tipo}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b' }}>
                              {linha.prefixo || 'PS'}:{linha.id}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                              {linha.solicitante}
                            </span>
                            {linha.wbs && (
                              <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '500' }}>
                                {linha.wbs}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {linha.bs && linha.bs !== '-' && linha.bs !== '—' ? (
                            <span className="badge-bs"><FileText size={14} /> {linha.bs}</span>
                          ) : (
                            <span className="traco-vazio">—</span>
                          )}
                        </td>
                        <td className="texto-data">{linha.dataSolicitacao}</td>
                        <td>
                          {linha.dataEntrega && linha.dataEntrega !== '-' && linha.dataEntrega !== '—' ? (
                            <span className="texto-data-verde">{linha.dataEntrega}</span>
                          ) : (
                            <span className="traco-vazio">—</span>
                          )}
                        </td>
                        <td>{renderBadgeStatus(linha.status)}</td>
                        
                        {/* ========================================== */}
                        {/* CÉLULA DINÂMICA: AÇÕES (SÓ LOGÍSTICA)      */}
                        {/* ========================================== */}
                        {perfil === 'logistica' && (
                          <td>
                            {linha.acaoTipo === 'botao' ? (
                              <button className="btn-aprovar-acao" style={{ 
                                backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: '20px', 
                                padding: '6px 16px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '6px'
                              }}>
                                <RefreshCcw size={14} /> {linha.acaoValor || 'Aprovar'}
                              </button>
                            ) : (
                              <select className="select-acao" defaultValue={linha.acaoValor} style={{
                                padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '20px', 
                                backgroundColor: '#f8fafc', fontSize: '0.875rem', color: '#334155', outline: 'none', cursor: 'pointer'
                              }}>
                                <option value={linha.acaoValor}>{linha.acaoValor}</option>
                                <option value="Concluído">Concluído</option>
                                <option value="Cancelado">Cancelado</option>
                              </select>
                            )}
                          </td>
                        )}

                      </tr>

                      {/* GAVETA EXPANDIDA (GERENCIADOR DE ANEXOS) */}
                      {isExpandida && (
                        <tr>
                          {/* O colSpan é dinâmico (8 para logística, 7 para cliente) para não "partir" a tabela */}
                          <td colSpan={perfil === 'logistica' ? 8 : 7} className="td-expandida">
                            <DetalhesSolicitacao item={linha} />
                            
                            <div style={{ padding: '0 32px 24px 32px', backgroundColor: '#f8fafc' }}>
                              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0 0 16px 0' }} />
                              
                              <GerenciadorAnexos 
                                anexos={anexosNovos} 
                                setAnexos={setAnexosNovos} 
                                titulo="ADICIONAR NOVOS ANEXOS A ESTA SOLICITAÇÃO" 
                              />
                              
                              {anexosNovos.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                                  <button 
                                    onClick={() => handleEnviarAnexosExtras(linha.id)}
                                    style={{ 
                                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                                      backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', 
                                      fontWeight: '600', cursor: 'pointer' 
                                    }}
                                  >
                                    <Upload size={16} /> Salvar Novos Anexos
                                  </button>
                                </div>
                              )}
                            </div>
                            
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}