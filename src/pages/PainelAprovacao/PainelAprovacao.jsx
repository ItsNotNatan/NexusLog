import React, { useState, useEffect } from 'react';
import './PainelAprovacao.css';
import { 
  Clock, 
  CheckCircle2, 
  Eye, 
  Calendar, 
  XCircle, 
  RefreshCw,
  User
} from 'lucide-react';

// Função para definir a estilização visual (CSS e Ícones) baseado no status do banco
const obterEstiloStatus = (status) => {
  switch (status) {
    case 'Pendente':
      return { 
        classeCss: 'status-em-separacao', // Reaproveita o tom azulado/alerta para pendentes
        icone: <Clock size={14} className="icone-status" /> 
      };
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
    case 'Recusado':
      return { 
        classeCss: 'status-cancelado', 
        icone: <XCircle size={14} className="icone-status" /> 
      };
    default:
      return { classeCss: 'status-padrao', icone: null };
  }
};

export default function PainelAprovacao() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // --- 1. BUSCAR DADOS DO BACKEND LOGO AO CARREGAR A TELA ---
  useEffect(() => {
    const buscarDadosDoBanco = async () => {
      try {
        const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar');
        const resultado = await resposta.json();
        
        if (resposta.ok && resultado.sucesso) {
          setSolicitacoes(resultado.dados); // Salva a lista vinda do Node.js no estado
        } else {
          console.error("Erro retornado pela API:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha ao conectar com o Servidor Backend:", error);
      } finally {
        setCarregando(false); // Desativa a tela de loading
      }
    };

    buscarDadosDoBanco();
  }, []);

  // --- 2. FILTRAGEM DOS CARTÕES EM TEMPO REAL ---
  const listaPendentes = solicitacoes.filter(item => item.status === 'Pendente');
  const listaHistorico = solicitacoes.filter(item => item.status !== 'Pendente');

  if (carregando) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563eb' }} />
        Sincronizando com a Central de Operações...
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      
      {/* ==========================================================
          CARTÃO 1: SOLICITAÇÕES PENDENTES (AGUARDANDO AÇÃO)
          ========================================================== */}
      <div className="cartao">
        <div className="cartao-cabecalho">
          <div className="cabecalho-titulo">
            <Clock className="icone-amarelo" size={20} />
            <h2>Solicitações Pendentes</h2>
          </div>
          {/* Contador dinâmico baseado no tamanho da lista filtrada */}
          <span className="badge-contador-amarelo">{listaPendentes.length}</span>
        </div>
        
        {listaPendentes.length === 0 ? (
          // Se não houver nenhuma pendente, mostra o estado vazio amigável
          <div className="estado-vazio">
            <div className="circulo-icone-verde">
              <CheckCircle2 size={24} />
            </div>
            <p>Nenhuma solicitação pendente</p>
          </div>
        ) : (
          // Se houver itens pendentes, renderiza a lista dinamicamente
          <div className="lista-historico">
            {listaPendentes.map((item) => {
              const estiloStatus = obterEstiloStatus(item.status);
              return (
                <div key={item.id} className="item-historico">
                  <div className="item-info">
                    <div className="item-linha-principal">
                      <span className="item-id" style={{ color: item.entregaUrgente ? '#ef4444' : 'inherit' }}>
                        {item.id} {item.entregaUrgente ? '🔥' : ''}
                      </span>
                      <span className={`badge-status ${estiloStatus.classeCss}`}>
                        {estiloStatus.icone} {item.tipo}
                      </span>
                    </div>
                    <span className="item-detalhes">
                      Solicitante: <strong>{item.solicitante}</strong> &middot; Origem/Destino: {item.wbs}
                    </span>
                  </div>

                  <div className="item-acoes">
                    <button className="btn-contornado" style={{ borderColor: '#cbd5e1', color: '#475569' }}>
                      Analisar Solicitação
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================================
          CARTÃO 2: HISTÓRICO DE APROVAÇÕES (PROCESSADOS)
          ========================================================== */}
      <div className="cartao">
        <div className="cartao-cabecalho">
          <div className="cabecalho-titulo">
            <CheckCircle2 className="icone-azul" size={20} />
            <h2>Histórico de Aprovações</h2>
          </div>
          {/* Contador dinâmico de itens já processados */}
          <span className="badge-contador-cinza">{listaHistorico.length}</span>
        </div>

        <div className="lista-historico">
          {listaHistorico.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              Nenhum histórico registrado até ao momento.
            </p>
          ) : (
            listaHistorico.map((item) => {
              const estiloStatus = obterEstiloStatus(item.status);
              
              return (
                <div key={item.id} className="item-historico">
                  
                  {/* Lado Esquerdo: Identificadores e Metadados */}
                  <div className="item-info">
                    <div className="item-linha-principal">
                      <span className="item-id">{item.id}</span>
                      
                      <span className={`badge-status ${estiloStatus.classeCss}`}>
                        {estiloStatus.icone}
                        {item.status}
                      </span>

                      {item.bs && (
                        <span className="badge-tag">{item.bs}</span>
                      )}
                    </div>
                    
                    <span className="item-detalhes">
                      Projeto: {item.wbs} &middot; Solicitante: {item.solicitante}
                    </span>
                  </div>

                  {/* Lado Direito: Ações e Linha do Tempo */}
                  <div className="item-acoes">
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '8px' }}>
                      {item.dataSolicitacao}
                    </span>
                    <button className="btn-texto">
                      <Eye size={18} />
                      Ver Detalhes
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
      
    </div>
  );
}