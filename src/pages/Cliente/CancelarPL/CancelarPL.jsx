import React, { useState, useEffect, useContext } from 'react';
import { AlertTriangle, XCircle, Search, Loader2 } from 'lucide-react';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import './CancelarPL.css';

import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';

export default function CancelarPL() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  const [listaSolicitacoes, setListaSolicitacoes] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null); 
  const [carregando, setCarregando] = useState(true);

  const [nomeSolicitante, setNomeSolicitante] = useState('');
  const [justificativa, setJustificativa] = useState('');

  // ==========================================
  // EFEITO: Buscar a lista de Solicitações
  // ==========================================
  useEffect(() => {
    const buscarSolicitacoes = async () => {
      try {
        setCarregando(true);
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=500`);

        if (resultado.sucesso) {
          const solicitacoesFormatadas = resultado.dados
            // Filtramos para ignorar pedidos que JÁ SÃO de Cancelamento ou Reintegração
            .filter(item => 
              (item.status === 'Pendente' || item.status === 'Em Separação') &&
              item.tipo !== 'Cancelado' &&
              item.tipo !== 'Reintegracao' &&
              item.tipo !== 'Reintegração'
            )
            .map(item => ({
              id: item.id.replace(/\D/g, ''), 
              idOriginal: item.id,
              ps: item.ps, 
              pl: item.pl, 
              solicitante: item.solicitante,
              wbs: item.wbs,
              itensReais: item.itens || [], 
              status: item.status
            }));

          setListaSolicitacoes(solicitacoesFormatadas);
        } else {
          console.error("Erro retornado do servidor:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha ao buscar solicitações do banco:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    if (estoqueAtual) {
      buscarSolicitacoes();
    }
  }, [estoqueAtual]);

  // ==========================================
  // AÇÃO: Enviar pedido de cancelamento
  // ==========================================
  const handleEnviar = async () => {
    if (!solicitacaoSelecionada) {
      showAlert("Atenção", "Por favor, selecione uma solicitação na lista para prosseguir com o cancelamento.", "warning");
      return;
    }

    if (!nomeSolicitante || !justificativa) {
      showAlert("Campos Obrigatórios", "Por favor, preencha o seu nome e a justificativa para o cancelamento.", "warning");
      return;
    }

    const solAtiva = listaSolicitacoes.find(p => p.id === solicitacaoSelecionada);
    const identificadorCancelado = solAtiva.pl && solAtiva.pl !== '-' ? solAtiva.pl : solAtiva.ps;

    const payload = {
      solicitante: {
        nome: nomeSolicitante,
        wbs: solAtiva.wbs,
        observacoes: `[CANCELAMENTO] Motivo: ${justificativa} (Origem: ${identificadorCancelado} / ${solAtiva.idOriginal})`,
        tipo: 'Cancelado',
        filial_origem: estoqueAtual,
        itens: solAtiva.itensReais 
      }
    };

    try {
      const dados = await apiFetch('/solicitacoes/cancelamento', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps_id || dados.pl_id) {
        showAlert("Cancelamento Solicitado", `Sucesso! O pedido de cancelamento para a solicitação ${identificadorCancelado} foi registrado!`, "success");
        
        // Remove a solicitação da lista visualmente
        setListaSolicitacoes(prev => prev.filter(p => p.id !== solicitacaoSelecionada));
        setSolicitacaoSelecionada(null);
        setPesquisa('');
        setNomeSolicitante('');
        setJustificativa('');
      } else {
        showAlert("Erro de Servidor", dados.erro, "error");
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      showAlert("Falha de Conexão", "Não foi possível conectar ao servidor para efetuar o cancelamento.", "error");
    }
  };

  const listaFiltrada = listaSolicitacoes.filter(sol => 
    sol.id.includes(pesquisa) || 
    (sol.ps && sol.ps.toLowerCase().includes(pesquisa.toLowerCase())) ||
    (sol.pl && sol.pl.toLowerCase().includes(pesquisa.toLowerCase())) ||
    sol.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    sol.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const solAtivaParaTabela = listaSolicitacoes.find(p => p.id === solicitacaoSelecionada);

  return (
    <div className="cancelar-wrapper">
      
      {/* AVISO SUPERIOR */}
      <div className="banner-aviso banner-vermelho">
        <AlertTriangle size={24} />
        <div>
          <strong>Cancelamento de Solicitação (PS / PL)</strong>
          <p>Selecione a solicitação ativa que deseja cancelar. Esta ação enviará um pedido de cancelamento à equipe de logística.</p>
        </div>
      </div>

      {/* CARTÃO DE PESQUISA */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone vermelho"><XCircle size={18} /></div>
            <h2>Selecionar Solicitação</h2>
          </div>
        </div>
        
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input 
            type="text" 
            className="input-campo foco-vermelho" 
            placeholder="Buscar por PS, PL, ID ou solicitante..." 
            style={{ paddingLeft: '40px' }}
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)} 
          />
        </div>
        
        {/* LISTA DINÂMICA */}
        <div className="lista-pl-container">
          {carregando ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '32px', color: '#94a3b8' }}>
              <Loader2 size={24} className="animate-spin" />
              <span style={{ fontSize: '0.875rem' }}>Buscando solicitações ativas...</span>
            </div>
          ) : listaFiltrada.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '16px', padding: '16px' }}>
              Nenhuma solicitação ativa encontrada para essa busca.
            </p>
          ) : (
            listaFiltrada.map((sol) => (
              <div 
                key={sol.id} 
                className="item-pl"
                style={{
                  border: solicitacaoSelecionada === sol.id ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  backgroundColor: solicitacaoSelecionada === sol.id ? '#fef2f2' : '#ffffff'
                }}
                onClick={() => setSolicitacaoSelecionada(sol.id)} 
              >
                <div className="item-pl-info">
                  
                  {/* ✨ AQUI APARECEM TANTO O PS QUANTO A PL LADO A LADO */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="item-pl-titulo" style={{ color: solicitacaoSelecionada === sol.id ? '#dc2626' : '#1e293b' }}>
                      {sol.ps}
                    </span>
                    {sol.pl && sol.pl !== '-' && (
                      <span style={{ 
                        backgroundColor: solicitacaoSelecionada === sol.id ? '#fee2e2' : '#e0f2fe', 
                        color: solicitacaoSelecionada === sol.id ? '#dc2626' : '#0284c7', 
                        padding: '2px 8px', 
                        borderRadius: '999px', 
                        fontSize: '0.70rem', 
                        fontWeight: '600',
                        border: `1px solid ${solicitacaoSelecionada === sol.id ? '#fca5a5' : '#bae6fd'}`
                      }}>
                        {sol.pl}
                      </span>
                    )}
                  </div>
                  
                  <span className="item-pl-detalhes">
                    {sol.solicitante.toUpperCase()} - {sol.itensReais.length} itens listados - WBS: {sol.wbs}
                  </span>
                </div>
                
                <div className="item-pl-direita">
                  <span className="badge-separacao" style={{ 
                    backgroundColor: sol.status === 'Pendente' ? '#fefce8' : '#eff6ff', 
                    color: sol.status === 'Pendente' ? '#ca8a04' : '#3b82f6',
                    borderColor: sol.status === 'Pendente' ? '#fef08a' : '#bfdbfe'
                  }}>
                    {sol.status}
                  </span>
                  <div className="setas-ordem">
                    {solicitacaoSelecionada === sol.id ? (
                       <div className="seta-bola" style={{ backgroundColor: '#ef4444' }}></div>
                    ) : (
                      <>
                        <span style={{ fontSize: '10px' }}>▲</span>
                        <span style={{ fontSize: '10px' }}>▼</span>
                      </>
                    )}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* PAINEL DE AÇÃO QUANDO SELECIONADO */}
      {solicitacaoSelecionada && solAtivaParaTabela && (
        <>
          <div className="tabela-cancelamento-container">
            <div className="tabela-cancelamento-header">
              <strong>{solAtivaParaTabela.ps} {solAtivaParaTabela.pl && solAtivaParaTabela.pl !== '-' ? `/ ${solAtivaParaTabela.pl}` : ''} — Itens constados na solicitação</strong>
              <span>O cancelamento é total. Todos os itens listados retornarão ao saldo de estoque após aprovação da logística.</span>
            </div>
            
            <table className="tabela-cancelamento">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Descrição</th>
                  <th>Quantidade Solicitada</th>
                </tr>
              </thead>
              <tbody>
                {solAtivaParaTabela.itensReais.length > 0 ? (
                  solAtivaParaTabela.itensReais.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                        {it.part_number_manual || it.part_number || '-'}
                      </td>
                      <td style={{ color: '#475569' }}>
                        {it.descricao_manual || it.descricao || 'Sem Descrição'}
                      </td>
                      <td className="td-qtd-verde">
                        {it.quantidade_solicitada} {it.unidade_medida_manual || 'Un'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                      Nenhum item individual encontrado nesta solicitação.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="form-cartao sem-padding-baixo">
            <div className="form-input-box">
              <label>NOME DO SOLICITANTE *</label>
              <input 
                type="text" 
                className="input-campo foco-vermelho" 
                placeholder="Nome de quem está solicitando o cancelamento" 
                value={nomeSolicitante}
                onChange={(e) => setNomeSolicitante(e.target.value)}
              />
            </div>
            
            <div className="form-input-box">
              <label>JUSTIFICATIVA *</label>
              <textarea 
                className="input-campo foco-vermelho" 
                placeholder="Informe o motivo do cancelamento..."
                rows="3"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              ></textarea>
            </div>

            <BotaoAcaoGlobal 
              texto={`Cancelar ${solAtivaParaTabela.pl && solAtivaParaTabela.pl !== '-' ? solAtivaParaTabela.pl : solAtivaParaTabela.ps}`} 
              icone={<XCircle size={16} />} 
              cor="vermelho" 
              onClick={handleEnviar} 
            />
          </div>
        </>
      )}

    </div>
  );
}