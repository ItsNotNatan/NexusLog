import React, { useState, useEffect, useContext, useCallback } from 'react';
import { User, RefreshCcw, Search, Send, Box, ChevronDown, ChevronUp, MapPin, ArrowRightLeft } from 'lucide-react';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import './ReintegracaoItens.css';

export default function ReintegracaoItens() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  const [nome, setNome] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  
  // ✨ ESTADO NOVO: Alterna entre Reintegrar Material ou Transferência
  const [abaReintegracao, setAbaReintegracao] = useState('Material'); 
  
  const [listaDePl, setListaDePl] = useState([]);
  const [listaReintegracoes, setListaReintegracoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [plSelecionada, setPlSelecionada] = useState(null);
  const [itensDaPL, setItensDaPL] = useState([]);

  const buscarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
      const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=1000`);

      if (resultado.sucesso) {
        // ✨ AGORA FILTRA TANTO MATERIAL COMO TRANSFERÊNCIA WBS
        const plsValidas = resultado.dados.filter(sol => 
          (sol.tipo === 'Material' || sol.tipo === 'Transferencia WBS' || sol.tipo === 'Transfer. WBS') && 
          (sol.status === 'Em Separação' || sol.status === 'Concluído') && 
          sol.pl && sol.pl !== '-'
        );
        
        const reints = resultado.dados.filter(sol => 
          (sol.tipo === 'Reintegracao' || sol.tipo === 'Reintegração') && 
          (sol.status === 'Em Separação' || sol.status === 'Concluído')
        );
        
        setListaReintegracoes(reints);

        const plsFormatadas = plsValidas.map(plOriginal => {
          const qtdJaDevolvida = {};
          reints.forEach(reint => {
            if (reint.observacoes && reint.observacoes.includes(plOriginal.pl)) {
              (reint.itens || []).forEach(it => { 
                qtdJaDevolvida[it.estoque_id] = (qtdJaDevolvida[it.estoque_id] || 0) + Number(it.quantidade_solicitada || 0); 
              });
            }
          });
          const itensRestantes = (plOriginal.itens || []).filter(item => { 
            return (Number(item.quantidade_solicitada) - (qtdJaDevolvida[item.estoque_id] || 0)) > 0; 
          });
          
          return { 
            ...plOriginal, 
            statusExibicao: itensRestantes.length === 0 && (plOriginal.itens || []).length > 0 ? 'Reintegrado' : plOriginal.status 
          };
        });

        setListaDePl(plsFormatadas);
      }
    } catch (error) {
      console.error("Falha na ligação:", error.message);
    } finally {
      setCarregando(false);
    }
  }, [estoqueAtual]);

  useEffect(() => { buscarDados(); }, [buscarDados]);

  const handleSelecionarPL = (plOriginal) => {
    if (plOriginal.statusExibicao === 'Reintegrado') {
      showAlert("PL Totalmente Reintegrada", "Todos os itens desta Packing List já foram devolvidos e constam no estoque.", "info"); return;
    }
    if (plSelecionada === plOriginal.id) {
      setPlSelecionada(null); setItensDaPL([]); return;
    }

    const qtdJaDevolvida = {};
    listaReintegracoes.forEach(reint => {
      if (reint.observacoes && reint.observacoes.includes(plOriginal.pl)) {
        (reint.itens || []).forEach(it => { qtdJaDevolvida[it.estoque_id] = (qtdJaDevolvida[it.estoque_id] || 0) + Number(it.quantidade_solicitada || 0); });
      }
    });

    const itensMapeados = (plOriginal.itens || []).map(item => {
      return { 
        ...item, 
        quantidade_maxima_permitida: Math.max(0, Number(item.quantidade_solicitada) - (qtdJaDevolvida[item.estoque_id] || 0)), 
        quantidade_devolvida: 0 
      };
    }).filter(item => item.quantidade_maxima_permitida > 0); 

    setPlSelecionada(plOriginal.id);
    setItensDaPL(itensMapeados);
  };

  const alterarQuantidade = (itemId, novaQuantidade) => {
    let valorNum = parseInt(novaQuantidade, 10);
    if (isNaN(valorNum) || valorNum < 0) valorNum = 0;
    setItensDaPL(prevItens => prevItens.map(item => {
      if (item.id === itemId) return { ...item, quantidade_devolvida: valorNum > item.quantidade_maxima_permitida ? item.quantidade_maxima_permitida : valorNum };
      return item;
    }));
  };

  const handleEnviar = async () => {
    if (!nome) { showAlert("Campo Obrigatório", "Por favor, preencha o seu nome.", "warning"); return; }
    if (!plSelecionada) { showAlert("PL Obrigatória", "Selecione uma PL da lista.", "warning"); return; }

    const itensParaDevolver = itensDaPL.filter(item => item.quantidade_devolvida > 0);
    if (itensParaDevolver.length === 0) { showAlert("Nenhum item selecionado", "Tem de informar a quantidade a devolver de pelo menos 1 item da lista.", "warning"); return; }

    const plDados = listaDePl.find(p => p.id === plSelecionada);
    
    // ✨ Adiciona um identificador visual se for transferência para a logística saber
    const observacaoCustomizada = abaReintegracao === 'Transferencia' 
      ? `[Reintegração de Transferência WBS] Retornar os itens ao WBS Original.` 
      : '';

    const payload = { 
      solicitante: { 
        nome: nome, 
        pl_origem: plDados.pl, 
        wbs: plDados.wbs, 
        filial_origem: estoqueAtual,
        observacoes: observacaoCustomizada
      }, 
      itens: itensParaDevolver 
    };

    try {
      const dados = await apiFetch('/solicitacoes/reintegracao', { method: 'POST', body: JSON.stringify(payload) });
      if (dados.sucesso || dados.ps || dados.ps_id) {
        showAlert("Sucesso!", `Reintegração solicitada! Pedido (PS) gerado: ${dados.ps || dados.ps_id || dados.pl_id}.`, "success");
        setNome(''); setPlSelecionada(null); setItensDaPL([]); setPesquisa('');
        buscarDados();
      } else {
        showAlert("Erro de Servidor", dados.erro, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor.", "error");
    }
  };

  // ✨ FILTRA A LISTA PELA ABA ATIVA E DEPOIS PELA PESQUISA
  const listaPorAba = listaDePl.filter(pl => {
    if (abaReintegracao === 'Material') return pl.tipo === 'Material';
    return pl.tipo === 'Transferencia WBS' || pl.tipo === 'Transfer. WBS';
  });

  const listaFiltrada = listaPorAba.filter(pl => 
    (pl.pl && pl.pl.toLowerCase().includes(pesquisa.toLowerCase())) || 
    (pl.id && pl.id.toLowerCase().includes(pesquisa.toLowerCase())) || 
    (pl.solicitante && pl.solicitante.toLowerCase().includes(pesquisa.toLowerCase())) ||
    (pl.wbs && pl.wbs.toLowerCase().includes(pesquisa.toLowerCase()))
  );

  return (
    <div className="limitador-largura">
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone laranja"><User size={18} /></div>
            <h2>Solicitante</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME *</label>
            <input type="text" className="input-campo foco-laranja" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="input-grupo">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> FILIAL DE ORIGEM</label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" color="#f97316" />
              <input type="text" className="input-campo" value={estoqueAtual} readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone laranja"><RefreshCcw size={18} /></div>
            <h2>Selecionar PL de Origem</h2>
          </div>
        </div>

        {/* ✨ NOVOS BOTÕES PARA ALTERNAR ENTRE MATERIAL E TRANSFERÊNCIA */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <button 
            style={{ 
              flex: 1, padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              border: `1px solid ${abaReintegracao === 'Material' ? '#f97316' : '#e2e8f0'}`, 
              backgroundColor: abaReintegracao === 'Material' ? '#fff7ed' : '#f8fafc', 
              color: abaReintegracao === 'Material' ? '#ea580c' : '#64748b', 
              fontWeight: abaReintegracao === 'Material' ? '600' : '500', 
              cursor: 'pointer', transition: 'all 0.2s' 
            }}
            onClick={() => { setAbaReintegracao('Material'); setPlSelecionada(null); setPesquisa(''); }}
          >
            <Box size={18} /> Retirada de Material
          </button>
          <button 
            style={{ 
              flex: 1, padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              border: `1px solid ${abaReintegracao === 'Transferencia' ? '#f97316' : '#e2e8f0'}`, 
              backgroundColor: abaReintegracao === 'Transferencia' ? '#fff7ed' : '#f8fafc', 
              color: abaReintegracao === 'Transferencia' ? '#ea580c' : '#64748b', 
              fontWeight: abaReintegracao === 'Transferencia' ? '600' : '500', 
              cursor: 'pointer', transition: 'all 0.2s' 
            }}
            onClick={() => { setAbaReintegracao('Transferencia'); setPlSelecionada(null); setPesquisa(''); }}
          >
            <ArrowRightLeft size={18} /> Transferência WBS
          </button>
        </div>

        {/* Aviso amigável caso seja transferência */}
        {abaReintegracao === 'Transferencia' && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
            <strong>Atenção:</strong> Ao reintegrar uma Transferência WBS, as quantidades voltarão para o <strong>WBS de Origem</strong> (estoque original onde o material estava antes da transferência).
          </div>
        )}
        
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input type="text" className="input-campo foco-laranja" placeholder="Buscar por nº PL, ID da solicitação, solicitante ou WBS..." style={{ paddingLeft: '40px' }} value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
        </div>

        <div className="lista-pl-container">
          {carregando ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}><RefreshCcw className="animate-spin" size={24} style={{ display: 'block', margin: '0 auto 10px auto' }} /></div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              {abaReintegracao === 'Material' ? 'Nenhuma PL de Material concluída encontrada.' : 'Nenhuma PL de Transferência concluída encontrada.'}
            </div>
          ) : (
            listaFiltrada.map((pl) => (
              <React.Fragment key={pl.id}>
                <div className="item-pl" style={{ border: plSelecionada === pl.id ? '2px solid #f97316' : '1px solid #e2e8f0', backgroundColor: plSelecionada === pl.id ? '#fff7ed' : '#ffffff', borderBottomLeftRadius: plSelecionada === pl.id ? '0px' : '8px', borderBottomRightRadius: plSelecionada === pl.id ? '0px' : '8px', marginBottom: plSelecionada === pl.id ? '0px' : '12px', opacity: pl.statusExibicao === 'Reintegrado' ? 0.7 : 1 }} onClick={() => handleSelecionarPL(pl)}>
                  <div className="item-pl-info">
                    <span className="item-pl-titulo" style={{ color: plSelecionada === pl.id ? '#ea580c' : '#1e293b' }}>{pl.pl || `ID: ${pl.id}`}</span>
                    <span className="item-pl-detalhes">{pl.solicitante} &middot; WBS: {pl.wbs} &middot; {pl.itens ? pl.itens.length : 0} itens listados</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="badge-separacao" style={{ backgroundColor: pl.statusExibicao === 'Reintegrado' || pl.statusExibicao === 'Concluído' ? '#ecfdf5' : '#e0f2fe', borderColor: pl.statusExibicao === 'Reintegrado' || pl.statusExibicao === 'Concluído' ? '#a7f3d0' : '#bae6fd', color: pl.statusExibicao === 'Reintegrado' || pl.statusExibicao === 'Concluído' ? '#059669' : '#0284c7' }}>{pl.statusExibicao}</span>
                    {pl.statusExibicao !== 'Reintegrado' && (plSelecionada === pl.id ? <ChevronUp size={18} color="#ea580c"/> : <ChevronDown size={18} color="#94a3b8"/>)}
                  </div>
                </div>

                {plSelecionada === pl.id && (
                  <div style={{ border: '2px solid #f97316', borderTop: 'none', backgroundColor: '#fafaf9', padding: '16px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', marginBottom: '12px', animation: 'fadeIn 0.3s ease-in-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ea580c' }}><Box size={16} /><span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Selecione as quantidades que voltarão para o estoque:</span></div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead><tr style={{ borderBottom: '1px solid #fed7aa', color: '#9a3412' }}><th style={{ padding: '8px', fontWeight: '600' }}>PART NUMBER</th><th style={{ padding: '8px', fontWeight: '600' }}>DESCRIÇÃO</th><th style={{ padding: '8px', fontWeight: '600' }}>SALDO P/ DEVOLVER</th><th style={{ padding: '8px', fontWeight: '600', width: '120px' }}>QTD DEVOLVER</th></tr></thead>
                      <tbody>
                        {itensDaPL.map(itemTabela => (
                          <tr key={itemTabela.id} style={{ borderBottom: '1px solid #ffedd5' }}>
                            <td style={{ padding: '12px 8px', fontWeight: '600', color: '#431407' }}>{itemTabela.part_number_manual}</td>
                            <td style={{ padding: '12px 8px', color: '#7c2d12' }}>{itemTabela.descricao_manual}</td>
                            <td style={{ padding: '12px 8px', color: '#7c2d12', fontWeight: 'bold' }}>{itemTabela.quantidade_maxima_permitida} {itemTabela.unidade_medida_manual}</td>
                            <td style={{ padding: '8px' }}><input type="number" min="0" max={itemTabela.quantidade_maxima_permitida} value={itemTabela.quantidade_devolvida} onChange={(e) => alterarQuantidade(itemTabela.id, e.target.value)} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #fdba74', outline: 'none', textAlign: 'center', color: '#c2410c', fontWeight: 'bold' }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      <BotaoAcaoGlobal texto="Reintegrar Itens Selecionados" icone={<Send size={16} />} cor="laranja" onClick={handleEnviar} />
    </div>
  );
}