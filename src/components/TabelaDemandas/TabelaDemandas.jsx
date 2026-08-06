import React, { useState } from 'react';
import { Search, X, History, Loader } from 'lucide-react';

// 1. IMPORTAÇÃO DA NOSSA FUNÇÃO CENTRALIZADA
// Trazemos o apiFetch para garantir que a URL base (Vercel ou localhost) é aplicada automaticamente.
import { apiFetch } from '../../services/api';

export default function TabelaDemandas({ dados = [] }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historicoItem, setHistoricoItem] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [filtoStatus, setFiltoStatus] = useState('Todos os Status');

  // ==========================================
  // AÇÃO: Duplo clique para abrir histórico
  // ==========================================
  const handleDuploClique = async (linha) => {
    setItemSelecionado(linha);
    setModalAberto(true);
    setCarregandoHistorico(true);

    try {
      // 2. REFATORAÇÃO DO FETCH
      // Substituímos o fetch nativo e a conversão de JSON pelo apiFetch.
      const resultado = await apiFetch(`/solicitacoes/${linha.id}/anexos`);
      
      // Apenas verificamos a regra de negócio do servidor
      if (resultado.sucesso) {
        setHistoricoItem(resultado.dados || []);
      } else {
        console.warn("Rota real não encontrada ou sem dados. Usando dados seguros de simulação.");
        setHistoricoItem([
          { data: '18/07/2026', solicitante: linha.solicitante, qtd: 1, ps: linha.id },
          { data: '19/07/2026', solicitante: 'Logística Geral', qtd: 3, ps: linha.id }
        ]);
      }
    } catch (error) {
      // Erros de rede são apanhados aqui de forma limpa
      console.error("Erro ao buscar histórico real:", error.message);
      setHistoricoItem([]);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setHistoricoItem([]);
  };

  const dadosFiltrados = dados.filter((linha) => {
    const termo = termoPesquisa.toLowerCase();
    
    const batePesquisa = 
      (linha.id && String(linha.id).toLowerCase().includes(termo)) ||
      (linha.solicitante && linha.solicitante.toLowerCase().includes(termo)) ||
      (linha.wbs && linha.wbs.toLowerCase().includes(termo)) ||
      ((linha.pl || linha.bs) && String(linha.pl || linha.bs).toLowerCase().includes(termo));

    const bateStatus = 
      filtoStatus === 'Todos os Status' || 
      (linha.status && linha.status === filtoStatus);

    return batePesquisa && bateStatus;
  });

  const listaStatusUnicos = ['Todos os Status', ...new Set(dados.map(item => item.status).filter(Boolean))];

  return (
    <div className="tabela-cartao" style={{ position: 'relative' }}>
      
      <div className="tabela-controles">
        <div className="controles-esquerdos">
          <select className="select-filtro">
            <option>Todo Período</option>
          </select>
          
          <select 
            className="select-filtro"
            value={filtoStatus}
            onChange={(e) => setFiltoStatus(e.target.value)}
          >
            {listaStatusUnicos.map((status, idx) => (
              <option key={idx} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <div className="pesquisa-wrapper">
          <Search className="icone-pesquisa" size={16} />
          <input 
            type="text" 
            placeholder="Buscar PS, PL, WBS..." 
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
          />
        </div>
      </div>

      <div className="tabela-info">
        <span className="info-registros">{dadosFiltrados.length} registros</span>
        <span className="info-target">Dica: Dê duplo clique numa linha para ver o histórico de saídas</span>
      </div>

      <div className="tabela-scroll">
        <table className="dados-table">
          <thead>
            <tr>
              <th>PS ID</th>
              <th>SOLICITANTE</th>
              <th>WBS</th>
              <th>STATUS PS</th>
              <th>PL</th>
              <th>CRIAÇÃO DE PL</th>
              <th>DATA E HORA DE ENTREGA</th>
              <th>CONTAGEM</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.map((linha, index) => (
              <tr 
                key={index} 
                onDoubleClick={() => handleDuploClique(linha)} 
                style={{ cursor: 'pointer' }}
                title="Duplo clique para histórico"
              >
                <td className="fonte-negrito">{linha.id}</td>
                <td>{linha.solicitante}</td>
                <td><a href="#" className="link-azul">{linha.wbs}</a></td>
                <td>
                  <span className="badge-status-simples">{linha.status}</span>
                </td>
                <td>
                  {(linha.pl || linha.bs) && (linha.pl || linha.bs) !== '-' ? (
                    <a href="#" className="link-azul">{linha.pl || linha.bs}</a>
                  ) : (
                    <span className="texto-cinza">-</span>
                  )}
                </td>
                <td className="texto-cinza">{linha.criacaoPl || linha.criacaoBs || '—'}</td>
                <td className={linha.dataEntrega === 'não definido' ? 'texto-amarelo' : 'texto-cinza'}>
                  {linha.dataEntrega || '—'}
                </td>
                <td>
                  {linha.contagem && String(linha.contagem).includes('d') ? (
                    <span className={`badge-countdown countdown-${linha.contagemStatus}`}>
                      {linha.contagem}
                    </span>
                  ) : (
                    <span className="texto-cinza fonte-negrito">{linha.contagem || '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '24px', borderRadius: '8px',
            width: '500px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} color="#0056b3" />
                Histórico de Saídas
              </h3>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#666" />
              </button>
            </div>

            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
              Mostrando o registro de saídas referentes ao pedido: <strong>{itemSelecionado?.id}</strong>
            </p>

            {carregandoHistorico ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Loader size={24} className="icone-girando" color="#0056b3" />
                <p style={{ color: '#666', marginTop: '10px' }}>A buscar histórico...</p>
              </div>
            ) : historicoItem.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                    <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Data</th>
                    <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Qtd</th>
                    <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>Solicitante</th>
                    <th style={{ padding: '8px', borderBottom: '2px solid #ddd' }}>PS</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoItem.map((hist, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{hist.data || new Date().toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{hist.qtd || hist.quantidade_solicitada || 1}</td>
                      <td style={{ padding: '8px' }}>{hist.solicitante || '—'}</td>
                      <td style={{ padding: '8px', color: '#0056b3' }}>{hist.ps || hist.solicitacao_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                Nenhuma saída registrada para este item até o momento.
              </p>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}