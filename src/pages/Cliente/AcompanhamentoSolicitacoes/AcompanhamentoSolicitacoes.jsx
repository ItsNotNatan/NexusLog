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
  Zap
} from 'lucide-react';

// FUNÇÃO PARA RENDERIZAR O BADGE DE STATUS CORRETO
const renderBadgeStatus = (status) => {
  switch (status) {
    case 'Pendente':
    case 'Em Separação':
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

// FUNÇÃO PARA DEFINIR A COR DA TAG BASEADA NO TIPO
const obterClasseBadgeTipo = (tipo) => {
  switch (tipo) {
    case 'Transferencia WBS':
      return 'badge-tipo-amarelo';
    case 'Nota Fiscal':
      return 'badge-tipo-roxo';
    case 'Entrada':
      return 'badge-tipo-verde';
    case 'Crossdocking':
      return 'badge-tipo-ciano';
    case 'Reintegracao':
      return 'badge-tipo-laranja';
    case 'Cancelado':
    case 'Cancelar BS':
      return 'badge-tipo-vermelho';
    case 'Material':
    default:
      return 'badge-tipo-azul';
  }
};

export default function AcompanhamentoSolicitacoes() {
  const [dadosTabela, setDadosTabela] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  
  // 👇 NOVO ESTADO: Controla qual cartão KPI está selecionado
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  const listaFiltros = [
    'Todos', 
    'Material', 
    'Transfer. WBS', 
    'Nota Fiscal', 
    'Entrada', 
    'Crossdocking', 
    'Reintegração'
  ];

  // 1. CARREGAR DADOS DO BACKEND VIA API
  useEffect(() => {
    const buscarSolicitacoes = async () => {
      try {
        const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar');
        const resultado = await resposta.json();
        
        if (resposta.ok && resultado.sucesso) {
          setDadosTabela(resultado.dados);
        } else {
          console.error("Erro retornado do servidor:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha ao conectar à API:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarSolicitacoes();
  }, []);

  // 2. CÁLCULO DINÂMICO DOS CARD DE RESUMO (KPIs)
  const kpiTotal = dadosTabela.length;
  const kpiPendentes = dadosTabela.filter(item => item.status === 'Pendente').length;
  const kpiAndamento = dadosTabela.filter(item => item.status === 'Em Separação').length;
  const kpiConcluidos = dadosTabela.filter(item => item.status === 'Concluído').length;

  // 3. FILTRAGEM COMBINADA (Abas + Pesquisa + Status do Cartão KPI)
  const dadosFiltrados = dadosTabela.filter((linha) => {
    
    // Filtro por Aba de Tipo
    let passaFiltroAba = true;
    if (filtroAtivo !== 'Todos') {
      const tipoMapeado = 
        filtroAtivo === 'Transfer. WBS' ? 'Transferencia WBS' :
        filtroAtivo === 'Reintegração' ? 'Reintegracao' : 
        filtroAtivo;

      passaFiltroAba = linha.tipo === tipoMapeado;
    }

    // 👇 NOVA LÓGICA: Filtro pelo Cartão KPI de Status clicado
    let passaFiltroStatus = true;
    if (filtroStatus !== 'Todos') {
      passaFiltroStatus = linha.status === filtroStatus;
    }

    // Filtro por Pesquisa de Texto
    const termoLower = termoPesquisa.toLowerCase();
    const passaPesquisa = 
      linha.id.toString().toLowerCase().includes(termoLower) ||
      (linha.solicitante && linha.solicitante.toLowerCase().includes(termoLower)) ||
      (linha.wbs && linha.wbs.toLowerCase().includes(termoLower)) ||
      (linha.bs && linha.bs.toLowerCase().includes(termoLower));

    // A linha só aparece se passar nos três filtros!
    return passaFiltroAba && passaFiltroStatus && passaPesquisa;
  });

  return (
    <div className="acompanhamento-wrapper">

      <header className="acompanhamento-cabecalho">
        <h1>Acompanhamento de Solicitações</h1>
        <p>Visualize todas as solicitações abertas do sistema</p>
      </header>

      {/* 2. CARTÕES DE RESUMO (AGORA CLICÁVEIS) */}
      <div className="kpis-linha">
        <div 
          className={`kpi-card-resumo kpi-total ${filtroStatus === 'Todos' ? 'ativo' : ''}`}
          onClick={() => setFiltroStatus('Todos')}
        >
          <span>Total</span>
          <strong>{kpiTotal}</strong>
        </div>
        <div 
          className={`kpi-card-resumo kpi-pendentes ${filtroStatus === 'Pendente' ? 'ativo' : ''}`}
          onClick={() => setFiltroStatus('Pendente')}
        >
          <span>Pendentes</span>
          <strong>{kpiPendentes}</strong>
        </div>
        <div 
          className={`kpi-card-resumo kpi-andamento ${filtroStatus === 'Em Separação' ? 'ativo' : ''}`}
          onClick={() => setFiltroStatus('Em Separação')}
        >
          <span>Em Separação</span>
          <strong>{kpiAndamento}</strong>
        </div>
        <div 
          className={`kpi-card-resumo kpi-concluidos ${filtroStatus === 'Concluído' ? 'ativo' : ''}`}
          onClick={() => setFiltroStatus('Concluído')}
        >
          <span>Concluídos</span>
          <strong>{kpiConcluidos}</strong>
        </div>
      </div>

      {/* 3. ÁREA PRINCIPAL DA TABELA */}
      <div className="tabela-cartao-container">

        <div className="tabela-controlos-topo">
          <div className="filtros-botoes">
            {listaFiltros.map((filtro) => (
              <button 
                key={filtro}
                className={`btn-aba ${filtroAtivo === filtro ? 'ativo' : ''}`}
                onClick={() => setFiltroAtivo(filtro)}
              >
                {filtro}
              </button>
            ))}
          </div>
          <div className="pesquisa-wrapper-direita">
            <Search className="icone-pesquisa-dir" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por ID, solicitante, WBS..." 
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
            />
          </div>
        </div>

        <div className="tabela-scroll-horizontal">
          {carregando ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
              Carregando solicitações do sistema...
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              Nenhuma solicitação encontrada para os filtros aplicados.
            </div>
          ) : (
            <table className="tabela-solicitacoes">
              <thead>
                <tr>
                  <th className="col-chevron"></th>
                  <th>TIPO / ID</th>
                  <th>SOLICITANTE</th>
                  <th>WBS (ORIGEM ➔ DESTINO)</th>
                  <th>Nº DO BS</th>
                  <th>DATA SOLICITAÇÃO</th>
                  <th>DATA ENTREGA</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((linha, index) => (
                  <tr key={linha.id || index}>
                    <td className="col-chevron">
                      <ChevronRight size={18} style={{ color: '#94a3b8' }} />
                    </td>
                    <td>
                      <div className="bloco-tipo-id">
                        <span className={`badge-tipo ${obterClasseBadgeTipo(linha.tipo)} ${linha.entregaUrgente ? 'badge-urgente-critico' : ''}`}>
                          {linha.entregaUrgente ? <Zap size={13} color="#ef4444" fill="#ef4444" /> : <GitBranch size={13} />} 
                          {linha.tipo}
                        </span>
                        <span className="texto-ps-id" style={{ fontWeight: linha.entregaUrgente ? '700' : 'normal' }}>
                          PS : {linha.id}
                        </span>
                      </div>
                    </td>
                    <td className="nome-solicitante">{linha.solicitante}</td>
                    <td>
                      <span className="badge-wbs">{linha.wbs}</span>
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
                    <td className="texto-data">{linha.dataSolicitacao}</td>
                    <td>
                      {linha.dataEntrega ? (
                        <span className="texto-data-verde">{linha.dataEntrega}</span>
                      ) : (
                        <span className="traco-vazio">—</span>
                      )}
                    </td>
                    <td>
                      {renderBadgeStatus(linha.status)}
                    </td>
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