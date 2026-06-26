import React, { useState } from 'react';
import './AcompanhamentoSolicitacoes.css';
import { 
  Search, 
  ChevronRight, 
  GitBranch, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

// DADOS MOCKADOS BASEADOS NA IMAGEM
const dadosTabela = [
  {
    id: '2306261114',
    tipo: 'Material',
    solicitante: 'TESTE',
    wbs: 'WBS-PRJ-...',
    bs: 'BS #PE-BS 10976',
    dataSolicitacao: '23/06 14:14',
    dataEntrega: null,
    status: 'Em Separação'
  },
  {
    id: '1106261734',
    tipo: 'Material',
    solicitante: 'RASDAS',
    wbs: 'WBS-PRJ-...',
    bs: 'BS #SP-BS 10975',
    dataSolicitacao: '11/06 20:34',
    dataEntrega: '15/06 10:59',
    status: 'Concluído'
  },
  {
    id: '1106261648',
    tipo: 'Material',
    solicitante: 'DOUGLAS',
    wbs: 'WBS-PRJ-...',
    bs: 'BS #SP-BS 10974',
    dataSolicitacao: '11/06 19:48',
    dataEntrega: '11/06 19:51',
    status: 'Concluído'
  },
  {
    id: '1006261107',
    tipo: 'Material',
    solicitante: 'SADFSDAS',
    wbs: 'WBS-PRJ-...',
    bs: null,
    dataSolicitacao: '10/06 14:07',
    dataEntrega: null,
    status: 'Cancelado'
  },
  {
    id: '1006261102',
    tipo: 'Material',
    solicitante: 'MARCIO',
    wbs: 'WBS-PRJ-...',
    bs: 'BS #SP-BS 10973',
    dataSolicitacao: '10/06 14:02',
    dataEntrega: null,
    status: 'Cancelado'
  },
  {
    id: '1006261056',
    tipo: 'Material',
    solicitante: 'JEFERSON GARANDY',
    wbs: 'WBS-PRJ-...',
    bs: 'BS #SP-BS 10972',
    dataSolicitacao: '10/06 13:56',
    dataEntrega: '10/06 18:00',
    status: 'Concluído'
  }
];

// FUNÇÃO PARA RENDERIZAR O BADGE DE STATUS CORRETO
const renderBadgeStatus = (status) => {
  switch (status) {
    case 'Em Separação':
      return (
        <span className="badge-status status-separacao">
          <RefreshCw size={14} /> Em Separação
        </span>
      );
    case 'Concluído':
      return (
        <span className="badge-status status-concluido">
          <CheckCircle2 size={14} /> Concluído
        </span>
      );
    case 'Cancelado':
      return (
        <span className="badge-status status-cancelado">
          <XCircle size={14} /> Cancelado
        </span>
      );
    default:
      return <span>{status}</span>;
  }
};

export default function AcompanhamentoSolicitacoes() {
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');

  return (
    <div className="acompanhamento-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="acompanhamento-cabecalho">
        <h1>Acompanhamento de Solicitações</h1>
        <p>Visualize todas as solicitações abertas — materiais, transferências de WBS e notas fiscais</p>
      </header>

      {/* 2. CARTÕES DE RESUMO (KPIs) */}
      <div className="kpis-linha">
        <div className="kpi-card-resumo kpi-total">
          <span>Total</span>
          <strong>14</strong>
        </div>
        <div className="kpi-card-resumo kpi-pendentes">
          <span>Pendentes</span>
          <strong>0</strong>
        </div>
        <div className="kpi-card-resumo kpi-andamento">
          <span>Em Andamento</span>
          <strong>1</strong>
        </div>
        <div className="kpi-card-resumo kpi-concluidos">
          <span>Concluídos</span>
          <strong>10</strong>
        </div>
      </div>

      {/* 3. ÁREA PRINCIPAL DA TABELA */}
      <div className="tabela-cartao-container">
        
        {/* Controles de Topo (Abas e Pesquisa) */}
        <div className="tabela-controlos-topo">
          <div className="filtros-botoes">
            {['Todos', 'Material', 'Transfer. WBS', 'Nota Fiscal'].map((filtro) => (
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
            <input type="text" placeholder="Buscar por ID, solicitante, item..." />
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="tabela-scroll-horizontal">
          <table className="tabela-solicitacoes">
            <thead>
              <tr>
                <th className="col-chevron"></th>
                <th>TIPO / ID</th>
                <th>SOLICITANTE</th>
                <th>WBS</th>
                <th>Nº DO BS</th>
                <th>DATA SOLICITAÇÃO</th>
                <th>DATA ENTREGA</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {dadosTabela.map((linha, index) => (
                <tr key={index}>
                  
                  {/* Chevron para expandir */}
                  <td className="col-chevron">
                    <ChevronRight size={18} />
                  </td>

                  {/* Coluna Tipo e ID da PS */}
                  <td>
                    <div className="bloco-tipo-id">
                      <span className="badge-tipo">
                        <GitBranch size={14} /> {linha.tipo}
                      </span>
                      <span className="texto-ps-id">PS : {linha.id}</span>
                    </div>
                  </td>

                  {/* Solicitante */}
                  <td className="nome-solicitante">{linha.solicitante}</td>

                  {/* WBS */}
                  <td>
                    <span className="badge-wbs">{linha.wbs}</span>
                  </td>

                  {/* Nº do BS */}
                  <td>
                    {linha.bs ? (
                      <span className="badge-bs">
                        <FileText size={14} /> {linha.bs}
                      </span>
                    ) : (
                      <span className="traco-vazio">—</span>
                    )}
                  </td>

                  {/* Data Solicitação */}
                  <td className="texto-data">{linha.dataSolicitacao}</td>

                  {/* Data Entrega */}
                  <td>
                    {linha.dataEntrega ? (
                      <span className="texto-data-verde">{linha.dataEntrega}</span>
                    ) : (
                      <span className="traco-vazio">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    {renderBadgeStatus(linha.status)}
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