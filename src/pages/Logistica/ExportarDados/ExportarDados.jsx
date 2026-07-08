import React from 'react';
import './ExportarDados.css';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  Search 
} from 'lucide-react';

// --- DADOS SIMULADOS (MOCKS) ---

const abasNav = [
  { id: 'ps-bs', label: 'PS + BS (Solicitações)', icone: <FileText size={16} />, ativo: true },
  { id: 'target', label: 'Dentro vs Fora do Target', icone: <TrendingUp size={16} />, ativo: false },
  { id: 'evolucao', label: 'Evolução Histórica', icone: <Activity size={16} />, ativo: false },
  { id: 'volume', label: 'Volume Diário', icone: <BarChart3 size={16} />, ativo: false },
  { id: 'status', label: 'Status dos BS', icone: <CheckCircle2 size={16} />, ativo: false },
];

const kpis = [
  { titulo: 'Total de PS', valor: '14', estilo: 'padrao' },
  { titulo: 'Dentro do Target', valor: '0', estilo: 'sucesso' },
  { titulo: 'Fora do Target', valor: '0', estilo: 'alerta' },
  { titulo: 'Target Atual', valor: '3d', subtitulo: 'Configurável no Dashboard', estilo: 'info' },
];

const dadosTabela = [
  { id: 'PS:2306261114', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', status: 'Em Separação', bs: 'PE-BS 10976', criacao: '23/06/2026 14:14', finalizacao: 'não definido' },
  { id: 'PS:1106261734', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', status: 'Concluído', bs: 'SP-BS 10975', criacao: '11/06/2026 20:34', finalizacao: 'não definido' },
  { id: 'PS:1106261648', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', status: 'Concluído', bs: 'SP-BS 10974', criacao: '11/06/2026 19:48', finalizacao: 'não definido' },
  { id: 'PS:1006261107', solicitante: 'SADFSDAS', wbs: 'WBS-PRJ-2024-001', status: 'Cancelado', bs: '-', criacao: '10/06/2026 14:07', finalizacao: 'não definido' },
  { id: 'PS:1006261102', solicitante: 'MARCIO', wbs: 'WBS-PRJ-2024-001', status: 'Cancelado', bs: 'SP-BS 10973', criacao: '10/06/2026 14:02', finalizacao: 'não definido' },
];

// --- COMPONENTE PRINCIPAL ---

export default function ExportarDados() {
  return (
    <div className="exportar-wrapper">
      
      {/* 1. CABEÇALHO DA PÁGINA */}
      <header className="exportar-cabecalho">
        <div>
          <h1>Exportar Dados</h1>
          <p>Exporte os dados das solicitações e dos gráficos do Dashboard</p>
        </div>
        <button className="btn-exportar">
          <Download size={18} />
          Exportar (14) .CSV
        </button>
      </header>

      {/* 2. ABAS DE NAVEGAÇÃO */}
      <div className="abas-container">
        {abasNav.map((aba) => (
          <button key={aba.id} className={`aba-item ${aba.ativo ? 'ativo' : ''}`}>
            {aba.icone}
            {aba.label}
          </button>
        ))}
      </div>

      {/* 3. CARTÕES KPI */}
      <div className="kpis-grid">
        {kpis.map((kpi, index) => (
          <div key={index} className={`kpi-card ${kpi.estilo}`}>
            <span className="kpi-titulo">{kpi.titulo}</span>
            <span className="kpi-valor">{kpi.valor}</span>
            {kpi.subtitulo && <span className="kpi-subtitulo">{kpi.subtitulo}</span>}
          </div>
        ))}
      </div>

      {/* 4. ÁREA DA TABELA */}
      <div className="tabela-cartao">
        
        {/* Filtros e Pesquisa */}
        <div className="tabela-controles">
          <div className="controles-esquerdos">
            <select className="select-filtro">
              <option>Todo Período</option>
            </select>
            <select className="select-filtro">
              <option>Todos os Status</option>
            </select>
          </div>
          <div className="pesquisa-wrapper">
            <Search className="icone-pesquisa" size={16} />
            <input type="text" placeholder="Buscar PS, BS, WBS..." />
          </div>
        </div>

        {/* Informações da Tabela */}
        <div className="tabela-info">
          <span className="info-registros">14 registros</span>
          <span className="info-target">Target: 3 dia(s) — Lead Time = Criação PS &rarr; Finalização BS</span>
        </div>

        {/* Tabela de Dados */}
        <div className="tabela-scroll">
          <table className="dados-table">
            <thead>
              <tr>
                <th>PS ID</th>
                <th>SOLICITANTE</th>
                <th>WBS</th>
                <th>STATUS PS</th>
                <th>BS</th>
                <th>CRIAÇÃO PS</th>
                <th>FINALIZAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {dadosTabela.map((linha, index) => (
                <tr key={index}>
                  <td className="fonte-negrito">{linha.id}</td>
                  <td>{linha.solicitante}</td>
                  <td><a href="#" className="link-azul">{linha.wbs}</a></td>
                  <td>
                    <span className="badge-status-simples">{linha.status}</span>
                  </td>
                  <td>
                    {linha.bs !== '-' ? (
                      <a href="#" className="link-azul">{linha.bs}</a>
                    ) : (
                      <span className="texto-cinza">-</span>
                    )}
                  </td>
                  <td className="texto-cinza">{linha.criacao}</td>
                  <td className="texto-amarelo">{linha.finalizacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}