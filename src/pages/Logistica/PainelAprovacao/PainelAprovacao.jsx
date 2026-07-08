import React, { useState, useEffect } from 'react';
import './PainelAprovacao.css';
import { 
  Clock, 
  CheckCircle2, 
  Eye, 
  XCircle, 
  RefreshCw,
  Filter,
  History,
  ListTodo,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const obterEstiloStatus = (status) => {
  switch (status) {
    case 'Pendente':
      return { classeCss: 'status-em-separacao', icone: <Clock size={14} className="icone-status" /> };
    case 'Em Separação':
      return { classeCss: 'status-em-separacao', icone: <RefreshCw size={14} className="icone-status" /> };
    case 'Concluído':
      return { classeCss: 'status-concluido', icone: <CheckCircle2 size={14} className="icone-status" /> };
    case 'Cancelado':
    case 'Recusado':
      return { classeCss: 'status-cancelado', icone: <XCircle size={14} className="icone-status" /> };
    default:
      return { classeCss: 'status-padrao', icone: null };
  }
};

export default function PainelAprovacao() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // --- CONTROLO DA ABA E FILTROS ---
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); 
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // 👇 ESTADO: Guarda o ID da solicitação que o utilizador quer expandir
  const [solicitacaoExpandida, setSolicitacaoExpandida] = useState(null);

  useEffect(() => {
    const buscarDadosDoBanco = async () => {
      try {
        const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar');
        const resultado = await resposta.json();
        
        if (resposta.ok && resultado.sucesso) {
          setSolicitacoes(resultado.dados);
        } else {
          console.error("Erro retornado pela API:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha ao conectar com o Servidor Backend:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarDadosDoBanco();
  }, []);

  const converterDataBR = (dataStr) => {
    if (!dataStr) return null;
    const partes = dataStr.split(' ')[0].split('/'); 
    if (partes.length !== 3) return null;
    return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T00:00:00`);
  };

  const dadosFiltrados = solicitacoes.filter(item => {
    let passaTipo = filtroTipo === 'Todos' || item.tipo === filtroTipo;
    
    let passaData = true;
    if (dataInicio || dataFim) {
      const dataItemObj = converterDataBR(item.dataSolicitacao);
      if (dataItemObj) {
        if (dataInicio) {
          const limiteInicio = new Date(`${dataInicio}T00:00:00`);
          if (dataItemObj < limiteInicio) passaData = false;
        }
        if (dataFim) {
          const limiteFim = new Date(`${dataFim}T23:59:59`);
          if (dataItemObj > limiteFim) passaData = false;
        }
      }
    }
    return passaTipo && passaData;
  });

  const listaPendentes = dadosFiltrados.filter(item => item.status === 'Pendente');
  const listaHistorico = dadosFiltrados.filter(item => item.status !== 'Pendente');
  const tiposUnicos = ['Todos', ...new Set(solicitacoes.map(i => i.tipo))];

  // Alterna o acordeão (abre e fecha a gaveta de detalhes)
  const toggleExpandir = (id) => {
    setSolicitacaoExpandida(solicitacaoExpandida === id ? null : id);
  };

  // =========================================================
  // MÓDULO VISUAL: RENDERIZA OS DETALHES BASEADO NO TIPO
  // =========================================================
  const renderDetalhes = (item) => {
    // ⚠️ MOCK: Como o teu backend ainda não traz os itens na rota '/listar', 
    // coloquei aqui dados fictícios só para veres o layout a funcionar.
    const itensMockados = [
      { pn: '1534534', descricao: 'SENSOR DE INDUÇÃO', qtd: 2 },
      { pn: 'PN-TUB-7890', descricao: 'Tubo Aço Inox 316L', qtd: 4 }
    ];

    if (item.tipo === 'Transferencia WBS') {
      return (
        <div className="area-expandida">
          <div className="info-detalhe-grid">
            <div className="info-bloco">
              <label>Rota da Transferência</label>
              <span style={{ color: '#2563eb', fontWeight: '600' }}>{item.wbs}</span>
            </div>
            <div className="info-bloco">
              <label>Justificativa do Solicitante</label>
              <p>O material será realocado porque a manutenção na linha B foi antecipada.</p>
            </div>
          </div>

          <table className="tabela-detalhes-itens">
            <thead>
              <tr>
                <th>PART NUMBER</th>
                <th>DESCRIÇÃO DO MATERIAL</th>
                <th style={{ width: '100px', textAlign: 'center' }}>QTD</th>
              </tr>
            </thead>
            <tbody>
              {itensMockados.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{it.pn}</td>
                  <td>{it.descricao}</td>
                  <td style={{ textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>{it.qtd}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {item.status === 'Pendente' && (
            <div className="acoes-aprovacao">
              <button className="btn-recusar"><XCircle size={16} /> Recusar Pedido</button>
              <button className="btn-aprovar"><CheckCircle2 size={16} /> Aprovar Transferência</button>
            </div>
          )}
        </div>
      );
    }

    // Se for outro tipo e ainda não tivermos desenhado, mostra isto
    return (
      <div className="area-expandida">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          O painel detalhado para <strong>{item.tipo}</strong> será construído em breve.
        </p>
      </div>
    );
  };

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

      <div className="abas-aprovacao">
        <button 
          className={`btn-aba-aprovacao ${abaAtiva === 'pendentes' ? 'ativo' : ''}`}
          onClick={() => setAbaAtiva('pendentes')}
        >
          <ListTodo size={18} />
          Aguardando Aprovação ({listaPendentes.length})
        </button>
        <button 
          className={`btn-aba-aprovacao ${abaAtiva === 'historico' ? 'ativo' : ''}`}
          onClick={() => setAbaAtiva('historico')}
        >
          <History size={18} />
          Aba de Históricos ({listaHistorico.length})
        </button>
      </div>

      <div className="filtros-topo-aprovacao">
        <div className="filtro-item">
          <label><Filter size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> Tipo de Solicitação</label>
          <select className="filtro-input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            {tiposUnicos.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>
        
        <div className="filtro-item">
          <label>Data (Específica ou Início)</label>
          <input type="date" className="filtro-input" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>

        <div className="filtro-item">
          <label>Data (Fim do Intervalo)</label>
          <input type="date" className="filtro-input" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>

        <div className="filtro-item" style={{ marginLeft: 'auto' }}>
           <button 
             className="btn-limpar-filtros"
             onClick={() => { setFiltroTipo('Todos'); setDataInicio(''); setDataFim(''); }}
           >
             Limpar Filtros
           </button>
        </div>
      </div>

      {/* ==========================================================
          CARTÃO 1: SOLICITAÇÕES PENDENTES
          ========================================================== */}
      {abaAtiva === 'pendentes' && (
        <div className="cartao">
          <div className="cartao-cabecalho">
            <div className="cabecalho-titulo">
              <Clock className="icone-amarelo" size={20} />
              <h2>Solicitações Pendentes</h2>
            </div>
          </div>
          
          {listaPendentes.length === 0 ? (
            <div className="estado-vazio">
              <div className="circulo-icone-verde">
                <CheckCircle2 size={24} />
              </div>
              <p>Nenhuma solicitação pendente encontrada</p>
            </div>
          ) : (
            <div className="lista-historico">
              {listaPendentes.map((item) => {
                const estiloStatus = obterEstiloStatus(item.status);
                const isExpandido = solicitacaoExpandida === item.id;

                return (
                  <div key={item.id} className="item-card-completo">
                    
                    <div className="item-historico">
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
                          Solicitante: <strong>{item.solicitante}</strong> &middot; Data: {item.dataSolicitacao}
                        </span>
                      </div>

                      <div className="item-acoes">
                        <button 
                          className="btn-contornado" 
                          style={{ borderColor: isExpandido ? '#2563eb' : '#cbd5e1', color: isExpandido ? '#2563eb' : '#475569' }}
                          onClick={() => toggleExpandir(item.id)}
                        >
                          {isExpandido ? 'Fechar' : 'Analisar Solicitação'}
                          {isExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* RENDERIZA OS DETALHES SE ESTIVER EXPANDIDO */}
                    {isExpandido && renderDetalhes(item)}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================================
          CARTÃO 2: HISTÓRICO
          ========================================================== */}
      {abaAtiva === 'historico' && (
        <div className="cartao">
          <div className="cartao-cabecalho">
            <div className="cabecalho-titulo">
              <History className="icone-azul" size={20} />
              <h2>Histórico de Aprovações</h2>
            </div>
          </div>

          <div className="lista-historico">
            {listaHistorico.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                Nenhum histórico registrado para os filtros selecionados.
              </p>
            ) : (
              listaHistorico.map((item) => {
                const estiloStatus = obterEstiloStatus(item.status);
                const isExpandido = solicitacaoExpandida === item.id;

                return (
                  <div key={item.id} className="item-card-completo">
                    
                    <div className="item-historico">
                      <div className="item-info">
                        <div className="item-linha-principal">
                          <span className="item-id">{item.id}</span>
                          <span className={`badge-status ${estiloStatus.classeCss}`}>
                            {estiloStatus.icone} {item.status}
                          </span>
                          {item.bs && <span className="badge-tag">{item.bs}</span>}
                        </div>
                        <span className="item-detalhes">
                          Tipo: {item.tipo} &middot; Solicitante: {item.solicitante}
                        </span>
                      </div>

                      <div className="item-acoes">
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '8px' }}>
                          {item.dataSolicitacao}
                        </span>
                        <button className="btn-texto" onClick={() => toggleExpandir(item.id)}>
                          <Eye size={18} /> {isExpandido ? 'Ocultar' : 'Ver Detalhes'}
                        </button>
                      </div>
                    </div>

                    {/* RENDERIZA OS DETALHES SE ESTIVER EXPANDIDO */}
                    {isExpandido && renderDetalhes(item)}

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      
    </div>
  );
}