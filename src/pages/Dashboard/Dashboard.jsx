import React from 'react';
import './Dashboard.css'; // <-- Importando o CSS próprio do componente
import { 
  Clock, 
  CheckCircle2, 
  Eye, 
  Calendar, 
  XCircle, 
  RefreshCw 
} from 'lucide-react';

// Dados simulados para o histórico (Mock Data)
const historicoDados = [
  {
    id: '2306261114',
    status: 'Em Separação',
    tag: 'BS #PE-BS 10976',
    wbs: 'WBS-PRJ-2024-001',
    itens: 4,
    acao: 'Definir Fin.',
    dataAcao: null,
  },
  {
    id: '1106261734',
    status: 'Concluído',
    tag: 'BS #SP-BS 10975',
    wbs: 'WBS-PRJ-2024-001',
    itens: 2,
    acao: null,
    dataAcao: '15/06 07:59',
  },
  {
    id: '1106261648',
    status: 'Concluído',
    tag: 'BS #SP-BS 10974',
    wbs: 'WBS-PRJ-2024-001',
    itens: 1,
    acao: null,
    dataAcao: '11/06 16:51',
  },
  {
    id: '1006261107',
    status: 'Cancelado',
    tag: null,
    wbs: null,
    itens: null,
    acao: null,
    dataAcao: null,
  }
];

// Função para definir qual classe CSS e ícone usar baseado no status
const obterEstiloStatus = (status) => {
  switch (status) {
    case 'Em Separação':
      return { 
        classeCss: 'status-em-separacao', 
        icone: <RefreshCw size={14} className="icone-status" /> 
      };
    case 'Concluído':
      return { 
        classeCss: 'status-concluido', 
        icone: <CheckCircle2 size={14} className="icone-status" /> 
      };
    case 'Cancelado':
      return { 
        classeCss: 'status-cancelado', 
        icone: <XCircle size={14} className="icone-status" /> 
      };
    default:
      return { classeCss: 'status-padrao', icone: null };
  }
};

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      
      {/* CARTÃO 1: SOLICITAÇÕES PENDENTES */}
      <div className="cartao">
        <div className="cartao-cabecalho">
          <div className="cabecalho-titulo">
            <Clock className="icone-amarelo" size={20} />
            <h2>Solicitações Pendentes</h2>
          </div>
          <span className="badge-contador-amarelo">0</span>
        </div>
        
        <div className="estado-vazio">
          <div className="circulo-icone-verde">
            <CheckCircle2 size={24} />
          </div>
          <p>Nenhuma solicitação pendente</p>
        </div>
      </div>

      {/* CARTÃO 2: HISTÓRICO DE APROVAÇÕES */}
      <div className="cartao">
        <div className="cartao-cabecalho">
          <div className="cabecalho-titulo">
            <CheckCircle2 className="icone-azul" size={20} />
            <h2>Histórico de Aprovações</h2>
          </div>
          <span className="badge-contador-cinza">14</span>
        </div>

        <div className="lista-historico">
          {historicoDados.map((item) => {
            const estiloStatus = obterEstiloStatus(item.status);
            
            return (
              <div key={item.id} className="item-historico">
                
                {/* Lado Esquerdo */}
                <div className="item-info">
                  <div className="item-linha-principal">
                    <span className="item-id">PS : {item.id}</span>
                    
                    <span className={`badge-status ${estiloStatus.classeCss}`}>
                      {estiloStatus.icone}
                      {item.status}
                    </span>

                    {item.tag && (
                      <span className="badge-tag">{item.tag}</span>
                    )}
                  </div>
                  
                  {item.wbs && (
                    <span className="item-detalhes">
                      WBS: {item.wbs} &middot; {item.itens} itens
                    </span>
                  )}
                </div>

                {/* Lado Direito */}
                <div className="item-acoes">
                  <button className="btn-texto">
                    <Eye size={18} />
                    Ver BS
                  </button>
                  
                  {(item.acao || item.dataAcao) && (
                    <button className="btn-contornado">
                      <Calendar size={16} />
                      {item.acao || item.dataAcao}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}