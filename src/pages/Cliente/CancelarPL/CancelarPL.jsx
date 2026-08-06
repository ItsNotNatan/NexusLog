import React, { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, Search, Loader2 } from 'lucide-react';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import './CancelarPL.css';

// 1. IMPORTAÇÃO DA FUNÇÃO MÁGICA
// Trazemos a nossa função centralizada que já sabe se estamos no localhost ou no Vercel.
import { apiFetch } from '../../../services/api';

export default function CancelarPL() {
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
        // 2. REFATORAÇÃO DO GET
        // Substituímos o fetch longo por uma chamada simples ao apiFetch
        const resultado = await apiFetch('/solicitacoes/listar');

        // Como a apiFetch já trata os erros de rede, validamos apenas a regra de negócio
        if (resultado.sucesso) {
          const plFormatadas = resultado.dados
            .filter(item => item.status !== 'Cancelado' && item.status !== 'Concluído' && item.status !== 'Recusado')
            .map(item => ({
              id: item.id.replace(/\D/g, ''), 
              idOriginal: item.id,
              solicitante: item.solicitante,
              wbs: item.wbs,
              itens: 1, 
              status: item.status
            }));

          setListaDePl(plFormatadas);
        } else {
          console.error("Erro retornado do servidor:", resultado.erro);
        }
      } catch (error) {
        // A apiFetch atira erros limpos que capturamos aqui
        console.error("Falha ao buscar PL do banco:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    buscarSolicitacoes();
  }, []);

  // ==========================================
  // AÇÃO: Enviar pedido de cancelamento
  // ==========================================
  const handleEnviar = async () => {
    if (!plSelecionada) {
      alert("Por favor, selecione uma PL na lista para prosseguir com o cancelamento.");
      return;
    }

    if (!nomeSolicitante || !justificativa) {
      alert("Por favor, preencha o seu nome e a justificativa para o cancelamento.");
      return;
    }

    const dadosDaPl = listaDePl.find(p => p.id === plSelecionada);

    const payload = {
      solicitante: {
        nome: nomeSolicitante,
        wbs: dadosDaPl.wbs,
        observacoes: `[CANCELAMENTO] Motivo: ${justificativa} (Origem: ${dadosDaPl.idOriginal})`,
        tipo: 'Cancelado' 
      },
      itens: [] 
    };

    try {
      // 3. REFATORAÇÃO DO POST
      // Não precisamos enviar os headers manualmente, a apiFetch já envia 'application/json'
      const dados = await apiFetch('/solicitacoes/cancelamento', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Se não atirou erro no try/catch, validamos a resposta
      if (dados.sucesso || dados.ps_id || dados.pl_id) {
        alert(`Sucesso! Solicitação de Cancelamento registrada sob o ID: ${dados.ps_id || dados.pl_id}`);
        setListaDePl(prev => prev.filter(p => p.id !== plSelecionada));
        setPlSelecionada(null);
        setPesquisa('');
        setNomeSolicitante('');
        setJustificativa('');
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Falha ao conectar com o servidor backend. O erro foi documentado na consola.");
    }
  };

  const listaFiltrada = listaDePl.filter(pl => 
    pl.id.includes(pesquisa) || 
    pl.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    pl.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

  return (
    <div className="cancelar-wrapper">
      
      {/* AVISO SUPERIOR */}
      <div className="banner-aviso banner-vermelho">
        <AlertTriangle size={24} />
        <div>
          <strong>Cancelamento de PL (Packing List)</strong>
          <p>Selecione os itens e quantidades que retornarão ao estoque. Esta ação não pode ser desfeita.</p>
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
                    PL #{pl.id}
                  </span>
                  <span className="item-pl-detalhes">
                    {pl.solicitante.toUpperCase()} - {pl.itens} itens - WBS: {pl.wbs}
                  </span>
                </div>
                
                <div className="item-pl-direita">
                  <span className="badge-separacao">Em Separação</span>
                  <div className="setas-ordem">
                    {plSelecionada === pl.id ? (
                       <div className="seta-bola" style={{ backgroundColor: '#94a3b8' }}></div>
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
      {plSelecionada && (
        <>
          <div className="tabela-cancelamento-container">
            <div className="tabela-cancelamento-header">
              <strong>PL #{plSelecionada} — Itens serão devolvidos integralmente ao estoque</strong>
              <span>O cancelamento é total. Todos os itens abaixo retornarão ao saldo de estoque.</span>
            </div>
            <table className="tabela-cancelamento">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Descrição</th>
                  <th>Qtd a Retornar</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontFamily: 'monospace' }}>2967073</td>
                  <td>MODULO DE RELE PLC RSC 24UC 21 21</td>
                  <td className="td-qtd-verde">15 NR</td>
                </tr>
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
              texto={`Cancelar PL #${plSelecionada}`} 
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