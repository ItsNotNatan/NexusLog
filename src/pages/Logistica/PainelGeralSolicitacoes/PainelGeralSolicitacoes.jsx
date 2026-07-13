import React, { useState } from 'react';
import './PainelGeralSolicitacoes.css';
import { 
  Search, 
  ChevronRight, 
  GitBranch, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  RefreshCcw,
  ArrowLeftRight,
  Boxes,
  Clock
} from 'lucide-react';

// DADOS MOCKADOS EXATAMENTE COMO NA IMAGEM
const dadosTabela = [
  {
    prefixo: 'REI',
    id: '1307261016',
    tipo: 'Reintegração',
    solicitante: 'DOUG',
    wbs: '',
    bs: '—',
    dataCriacao: '13/07/26 13:16',
    dataFinalizacao: '—',
    status: 'Em Andamento',
    acaoTipo: 'botao',
    acaoValor: 'Aprovar'
  },
  {
    prefixo: 'CD',
    id: '1307261016',
    tipo: 'Crossdocking',
    solicitante: 'DOUGLAS',
    wbs: 'BB29',
    bs: '—',
    dataCriacao: '13/07/26 13:16',
    dataFinalizacao: '—',
    status: 'Pendente',
    acaoTipo: 'select',
    acaoValor: 'Pendente'
  },
  {
    prefixo: 'NF',
    id: '1307261016',
    tipo: 'Nota Fiscal',
    solicitante: 'EMISSÃO DE NOTA FISCAL',
    wbs: 'TESTE',
    bs: '—',
    dataCriacao: '13/07/26 13:16',
    dataFinalizacao: '—',
    status: 'Pendente',
    acaoTipo: 'select',
    acaoValor: 'Pendente'
  },
  {
    prefixo: 'TR',
    id: '1307261015',
    tipo: 'Transfer. WBS',
    solicitante: 'DOUGLAS',
    wbs: '',
    bs: '—',
    dataCriacao: '13/07/26 13:15',
    dataFinalizacao: '—',
    status: 'Pendente',
    acaoTipo: 'select',
    acaoValor: 'Pendente'
  },
  {
    prefixo: 'PS',
    id: '1307261015',
    tipo: 'Material',
    solicitante: 'NATAN GUIMARES',
    wbs: 'BRBRRBA32-MAT-000-WP001',
    bs: '—',
    dataCriacao: '13/07/26 13:15',
    dataFinalizacao: '—',
    status: 'Em Andamento',
    acaoTipo: 'select',
    acaoValor: 'Ag. Lanç. Planilha'
  }
];

const filtrosArray = ['Todos', 'Material', 'Transfer. WBS', 'Nota Fiscal', 'Entrada', 'Crossdocking', 'Reintegração'];

// Helper para os Badges de Tipo de Solicitação
const renderBadgeTipo = (tipo) => {
  switch (tipo) {
    case 'Reintegração':
      return <span className="badge-tipo tipo-laranja"><RefreshCcw size={13} /> {tipo}</span>;
    case 'Crossdocking':
      return <span className="badge-tipo tipo-azul"><FileText size={13} /> {tipo}</span>; // Usando ícone semelhante à imagem
    case 'Nota Fiscal':
      return <span className="badge-tipo tipo-roxo"><FileText size={13} /> {tipo}</span>;
    case 'Transfer. WBS':
      return <span className="badge-tipo tipo-azul"><ArrowLeftRight size={13} /> {tipo}</span>;
    case 'Material':
    default:
      return <span className="badge-tipo tipo-azul"><GitBranch size={13} /> {tipo}</span>;
  }
};

// Helper para os Badges de Status
const renderBadgeStatus = (status) => {
  switch (status) {
    case 'Em Andamento':
      return <span className="badge-status status-andamento"><RefreshCw size={13} /> {status}</span>;
    case 'Pendente':
      return <span className="badge-status status-pendente"><Clock size={13} /> {status}</span>;
    case 'Concluído':
      return <span className="badge-status status-concluido"><CheckCircle2 size={13} /> {status}</span>;
    case 'Cancelado':
    case 'Recusado':
      return <span className="badge-status status-cancelado"><XCircle size={13} /> {status}</span>;
    default:
      return <span className="badge-status">{status}</span>;
  }
};

export default function PainelGeralSolicitacoes() {
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');

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
          <strong>55</strong>
        </div>
        <div className="kpi-card-resumo kpi-pendentes">
          <span>Pendentes</span>
          <strong>6</strong>
        </div>
        <div className="kpi-card-resumo kpi-andamento">
          <span>Em Andamento</span>
          <strong>3</strong>
        </div>
        <div className="kpi-card-resumo kpi-concluidos">
          <span>Concluídos</span>
          <strong>34</strong>
        </div>
        <div className="kpi-card-resumo kpi-recusados">
          <span>Recusados</span>
          <strong>7</strong>
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
              <input type="text" placeholder="Buscar solicitações..." />
            </div>
          </div>
        </div>

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
              {dadosTabela.map((linha, index) => (
                <tr key={index}>
                  
                  <td className="col-chevron">
                    <ChevronRight size={18} />
                  </td>

                  <td>{renderBadgeTipo(linha.tipo)}</td>

                  <td>
                    <div className="bloco-id-multiplo">
                      <span className="texto-ps-id">{linha.prefixo}:{linha.id}</span>
                      <span className="nome-solicitante">{linha.solicitante}</span>
                      {linha.wbs ? (
                        <a href="#" className="link-wbs">{linha.wbs}</a>
                      ) : null}
                    </div>
                  </td>

                  <td><span className="traco-vazio">{linha.bs}</span></td>
                  <td className="texto-data">{linha.dataCriacao}</td>
                  <td><span className="traco-vazio">{linha.dataFinalizacao}</span></td>
                  <td>{renderBadgeStatus(linha.status)}</td>

                  {/* RENDERIZAÇÃO CONDICIONAL DA COLUNA DE AÇÃO */}
                  <td>
                    {linha.acaoTipo === 'botao' ? (
                      <button className="btn-aprovar-acao">
                        <RefreshCcw size={14} /> {linha.acaoValor}
                      </button>
                    ) : (
                      <select className="select-acao" defaultValue={linha.acaoValor}>
                        <option value={linha.acaoValor}>{linha.acaoValor}</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
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