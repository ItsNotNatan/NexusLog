import React from 'react';
import './ExportarDados.css';
import { 
  Download, 
  FileText, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  Search 
} from 'lucide-react';

// --- DADOS SIMULADOS (MOCKS) ---

const abasNav = [
  { id: 'ps-bs', label: 'PS + BS (Solicitações)', icone: <FileText size={16} />, ativo: true },
  { id: 'evolucao', label: 'Evolução Histórica', icone: <Activity size={16} />, ativo: false },
  { id: 'volume', label: 'Volume Diário', icone: <BarChart3 size={16} />, ativo: false },
  { id: 'status', label: 'Status dos BS', icone: <CheckCircle2 size={16} />, ativo: false },
];

const kpis = [
  { titulo: 'Total de PS', valor: '14', estilo: 'padrao' },
  { titulo: 'Concluídos', valor: '2', estilo: 'sucesso' },
  { titulo: 'Cancelados', valor: '2', estilo: 'alerta' },
  { titulo: 'Em Separação', valor: '1', estilo: 'info' },
];

// Atualizado sem a coluna de Target
const dadosTabela = [
  { id: 'PS:2306261114', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', status: 'Em Separação', bs: 'PE-BS 10976', criacaoBs: '23/06/2026 14:14', dataEntrega: 'não definido', contagem: '3d 00:11:45', contagemStatus: 'verde' },
  { id: 'PS:1106261734', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', status: 'Concluído', bs: 'SP-BS 10975', criacaoBs: '11/06/2026 20:34', dataEntrega: '13/06/2026 10:00', contagem: 'Entregue', contagemStatus: 'neutro' },
  { id: 'PS:0707260938', solicitante: 'MARCIO', wbs: 'WBS-PRJ-2024-001', status: 'Em Atraso', bs: 'SP-BS 10977', criacaoBs: '07/07/2026 15:08', dataEntrega: 'não definido', contagem: '-0d 02:15:30', contagemStatus: 'vermelho' },
  { id: 'PS:1106261648', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', status: 'Concluído', bs: 'SP-BS 10974', criacaoBs: '11/06/2026 19:48', dataEntrega: '16/06/2026 15:30', contagem: 'Entregue', contagemStatus: 'neutro' },
  { id: 'PS:1006261107', solicitante: 'SADFSDAS', wbs: 'WBS-PRJ-2024-001', status: 'Cancelado', bs: '-', criacaoBs: '-', dataEntrega: 'não definido', contagem: '-', contagemStatus: 'neutro' },
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
          <span className="info-target">Lead Time = Criação de BS &rarr; Data de Entrega</span>
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
                <th>CRIAÇÃO DE BS</th>
                <th>DATA E HORA DE ENTREGA</th>
                <th>CONTAGEM</th>
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
                  <td className="texto-cinza">{linha.criacaoBs}</td>
                  <td className={linha.dataEntrega === 'não definido' ? 'texto-amarelo' : 'texto-cinza'}>
                    {linha.dataEntrega}
                  </td>
                  <td>
                    {/* Renderização Condicional da Contagem Digital */}
                    {linha.contagem.includes('d') ? (
                      <span className={`badge-countdown countdown-${linha.contagemStatus}`}>
                        {linha.contagem}
                      </span>
                    ) : (
                      <span className="texto-cinza fonte-negrito">{linha.contagem}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}