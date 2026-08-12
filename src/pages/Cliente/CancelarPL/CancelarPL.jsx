import React, { useState, useEffect, useContext } from 'react';
import { AlertTriangle, XCircle, Search, Loader2 } from 'lucide-react';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import './CancelarPL.css';

// ✨ 1. IMPORTAÇÃO DOS CONTEXTOS GLOBAIS
import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';

export default function CancelarPL() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  const [listaDePl, setListaDePl] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [plSelecionada, setPlSelecionada] = useState(null); 
  const [carregando, setCarregando] = useState(true);

  const [nomeSolicitante, setNomeSolicitante] = useState('');
  const [justificativa, setJustificativa] = useState('');

  // ==========================================
  // EFEITO: Buscar a lista de PLs
  // ==========================================
  useEffect(() => {
    const buscarSolicitacoes = async () => {
      try {
        setCarregando(true);
        // Filtra apenas as PLs da filial atualmente selecionada no cabeçalho
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=500`);

        if (resultado.sucesso) {
          const plFormatadas = resultado.dados
            // Apenas permite cancelar o que está pendente ou já em separação
            .filter(item => item.status === 'Pendente' || item.status === 'Em Separação')
            .map(item => ({
              id: item.id.replace(/\D/g, ''), 
              idOriginal: item.id,
              solicitante: item.solicitante,
              wbs: item.wbs,
              itensReais: item.itens || [], // ✨ BUSCA OS ITENS VERDADEIROS DO BANCO
              pl: item.pl,
              status: item.status
            }));

          setListaDePl(plFormatadas);
        } else {
          console.error("Erro retornado do servidor:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha ao buscar PL do banco:", error.message);
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
    if (!plSelecionada) {
      showAlert("Atenção", "Por favor, selecione uma PL na lista para prosseguir com o cancelamento.", "warning");
      return;
    }

    if (!nomeSolicitante || !justificativa) {
      showAlert("Campos Obrigatórios", "Por favor, preencha o seu nome e a justificativa para o cancelamento.", "warning");
      return;
    }

    const dadosDaPl = listaDePl.find(p => p.id === plSelecionada);

    const payload = {
      solicitante: {
        nome: nomeSolicitante,
        wbs: dadosDaPl.wbs,
        observacoes: `[CANCELAMENTO] Motivo: ${justificativa} (Origem: ${dadosDaPl.idOriginal})`,
        tipo: 'Cancelado',
        filial_origem: estoqueAtual // ✨ IDENTIFICA A FILIAL
      },
      // Passamos os itens para que, no futuro, a logística saiba o que deve voltar
      itens: dadosDaPl.itensReais 
    };

    try {
      const dados = await apiFetch('/solicitacoes/cancelamento', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps_id || dados.pl_id) {
        showAlert("Cancelamento Solicitado", `Sucesso! O pedido de cancelamento foi registrado sob o ID: ${dados.ps_id || dados.pl_id}`, "success");
        
        // Remove a PL da lista visualmente
        setListaDePl(prev => prev.filter(p => p.id !== plSelecionada));
        setPlSelecionada(null);
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

  const listaFiltrada = listaDePl.filter(pl => 
    pl.id.includes(pesquisa) || 
    pl.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    pl.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

  // Encontra os detalhes da PL atualmente selecionada para desenhar a tabela
  const plAtivaParaTabela = listaDePl.find(p => p.id === plSelecionada);

  return (
    <div className="cancelar-wrapper">
      
      {/* AVISO SUPERIOR */}
      <div className="banner-aviso banner-vermelho">
        <AlertTriangle size={24} />
        <div>
          <strong>Cancelamento de PL (Packing List)</strong>
          <p>Selecione os itens e quantidades que retornarão ao estoque. Esta ação solicitará o cancelamento à equipe de logística.</p>
        </div>
      </div>

      {/* CARTÃO DE PESQUISA */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone vermelho"><XCircle size={18} /></div>
            <h2>Selecionar PL para Cancelar</h2>
          </div>
        </div>
        
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input 
            type="text" 
            className="input-campo foco-vermelho" 
            placeholder="Buscar por nº PL, ID ou solicitante..." 
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
              <span style={{ fontSize: '0.875rem' }}>Buscando packing lists ativos...</span>
            </div>
          ) : listaFiltrada.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '16px', padding: '16px' }}>
              Nenhum packing list ativo encontrado para essa busca.
            </p>
          ) : (
            listaFiltrada.map((pl) => (
              <div 
                key={pl.id} 
                className="item-pl"
                style={{
                  border: plSelecionada === pl.id ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  backgroundColor: plSelecionada === pl.id ? '#fef2f2' : '#ffffff'
                }}
                onClick={() => setPlSelecionada(pl.id)} 
              >
                <div className="item-pl-info">
                  <span className="item-pl-titulo" style={{ color: plSelecionada === pl.id ? '#dc2626' : '#1e293b' }}>
                    {pl.pl !== '-' && pl.pl ? pl.pl : `ID #${pl.id}`}
                  </span>
                  <span className="item-pl-detalhes">
                    {pl.solicitante.toUpperCase()} - {pl.itensReais.length} itens listados - WBS: {pl.wbs}
                  </span>
                </div>
                
                <div className="item-pl-direita">
                  <span className="badge-separacao" style={{ 
                    backgroundColor: pl.status === 'Pendente' ? '#fefce8' : '#eff6ff', 
                    color: pl.status === 'Pendente' ? '#ca8a04' : '#3b82f6',
                    borderColor: pl.status === 'Pendente' ? '#fef08a' : '#bfdbfe'
                  }}>
                    {pl.status}
                  </span>
                  <div className="setas-ordem">
                    {plSelecionada === pl.id ? (
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
      {plSelecionada && plAtivaParaTabela && (
        <>
          <div className="tabela-cancelamento-container">
            <div className="tabela-cancelamento-header">
              <strong>{plAtivaParaTabela.pl !== '-' ? plAtivaParaTabela.pl : `Solicitação #${plAtivaParaTabela.id}`} — Itens constados na PL</strong>
              <span>O cancelamento é total. Todos os itens listados retornarão ao saldo de estoque após aprovação.</span>
            </div>
            
            {/* ✨ TABELA DINÂMICA COM OS DADOS REAIS DO BANCO */}
            <table className="tabela-cancelamento">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Descrição</th>
                  <th>Quantidade Solicitada</th>
                </tr>
              </thead>
              <tbody>
                {plAtivaParaTabela.itensReais.length > 0 ? (
                  plAtivaParaTabela.itensReais.map((it, idx) => (
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
              texto={`Cancelar ${plAtivaParaTabela.pl !== '-' && plAtivaParaTabela.pl ? plAtivaParaTabela.pl : 'Solicitação'}`} 
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