import React, { useState, useEffect, useContext, useCallback } from 'react';
import { User, RefreshCcw, Search, Send, Box, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  const [listaDePl, setListaDePl] = useState([]);
  const [listaReintegracoes, setListaReintegracoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [plSelecionada, setPlSelecionada] = useState(null);
  const [itensDaPL, setItensDaPL] = useState([]);

  // =======================================================================
  // 1. FUNÇÃO PARA CARREGAR DADOS E CALCULAR STATUS DE REINTEGRAÇÃO
  // =======================================================================
  const buscarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
      
      const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=1000`);

      if (resultado.sucesso) {
        const plsValidas = resultado.dados.filter(sol => 
          sol.tipo === 'Material' && 
          (sol.status === 'Em Separação' || sol.status === 'Concluído') &&
          sol.pl && sol.pl !== '-'
        );

        const reints = resultado.dados.filter(sol => 
          (sol.tipo === 'Reintegracao' || sol.tipo === 'Reintegração') &&
          (sol.status === 'Em Separação' || sol.status === 'Concluído')
        );
        setListaReintegracoes(reints);

        // ✨ MÁGICA: Calcula se a PL já foi totalmente reintegrada
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
            const devolvido = qtdJaDevolvida[item.estoque_id] || 0;
            return (Number(item.quantidade_solicitada) - devolvido) > 0;
          });

          const isTotalmenteReintegrado = itensRestantes.length === 0 && (plOriginal.itens || []).length > 0;

          return {
            ...plOriginal,
            statusExibicao: isTotalmenteReintegrado ? 'Reintegrado' : plOriginal.status
          };
        });

        setListaDePl(plsFormatadas);
      } else {
        console.error("Erro ao buscar as PLs:", resultado.erro);
      }
    } catch (error) {
      console.error("Falha na ligação com o servidor:", error.message);
    } finally {
      setCarregando(false);
    }
  }, [estoqueAtual]);

  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  // =======================================================================
  // 2. AÇÃO DE SELECIONAR A PL
  // =======================================================================
  const handleSelecionarPL = (plOriginal) => {
    if (plOriginal.statusExibicao === 'Reintegrado') {
      showAlert(
        "PL Totalmente Reintegrada", 
        "Todos os itens desta Packing List já foram devolvidos e constam no estoque.", 
        "info"
      );
      return;
    }

    if (plSelecionada === plOriginal.id) {
      setPlSelecionada(null);
      setItensDaPL([]);
      return;
    }

    const qtdJaDevolvida = {};
    listaReintegracoes.forEach(reint => {
      if (reint.observacoes && reint.observacoes.includes(plOriginal.pl)) {
        (reint.itens || []).forEach(it => {
          qtdJaDevolvida[it.estoque_id] = (qtdJaDevolvida[it.estoque_id] || 0) + Number(it.quantidade_solicitada || 0);
        });
      }
    });

    const itensMapeados = (plOriginal.itens || []).map(item => {
      const devolvidoAnteriormente = qtdJaDevolvida[item.estoque_id] || 0;
      const maxPermitido = Math.max(0, Number(item.quantidade_solicitada) - devolvidoAnteriormente);

      return {
        ...item,
        quantidade_maxima_permitida: maxPermitido,
        quantidade_devolvida: 0
      };
    }).filter(item => item.quantidade_maxima_permitida > 0); 

    setPlSelecionada(plOriginal.id);
    setItensDaPL(itensMapeados);
  };

  const alterarQuantidade = (itemId, novaQuantidade) => {
    let valorNum = parseInt(novaQuantidade, 10);
    if (isNaN(valorNum) || valorNum < 0) valorNum = 0;

    setItensDaPL(prevItens => 
      prevItens.map(item => {
        if (item.id === itemId) {
          if (valorNum > item.quantidade_maxima_permitida) {
            valorNum = item.quantidade_maxima_permitida;
          }
          return { ...item, quantidade_devolvida: valorNum };
        }
        return item;
      })
    );
  };

  const handleEnviar = async () => {
    if (!nome) {
      showAlert("Campo Obrigatório", "Por favor, preencha o seu nome.", "warning");
      return;
    }
    if (!plSelecionada) {
      showAlert("PL Obrigatória", "Selecione uma PL da lista.", "warning");
      return;
    }

    const itensParaDevolver = itensDaPL.filter(item => item.quantidade_devolvida > 0);

    if (itensParaDevolver.length === 0) {
      showAlert("Nenhum item selecionado", "Tem de informar a quantidade a devolver de pelo menos 1 item da lista.", "warning");
      return;
    }

    const plDados = listaDePl.find(p => p.id === plSelecionada);

    const payload = {
      solicitante: {
        nome: nome,
        pl_origem: plDados.pl, 
        wbs: plDados.wbs,
        filial_origem: estoqueAtual
      },
      itens: itensParaDevolver
    };

    try {
      const dados = await apiFetch('/solicitacoes/reintegracao', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps || dados.ps_id) {
        const idGerado = dados.ps || dados.ps_id || dados.pl_id;
        showAlert(
          "Sucesso!", 
          `Reintegração solicitada! Pedido (PS) gerado: ${idGerado}.`, 
          "success"
        );
        
        setNome('');
        setPlSelecionada(null);
        setItensDaPL([]);
        setPesquisa('');

        buscarDados(); // Recarrega os dados e atualiza o status para "Reintegrado" em tempo real
      } else {
        showAlert("Erro de Servidor", dados.erro, "error");
      }
    } catch (error) {
      console.error("Erro na requisição:", error.message);
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor. Verifique a sua internet.", "error");
    }
  };

  const listaFiltrada = listaDePl.filter(pl => 
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
        <div className="input-grupo" style={{ maxWidth: '400px' }}>
          <label>NOME *</label>
          <input 
            type="text" 
            className="input-campo foco-laranja" 
            placeholder="Seu nome completo" 
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone laranja"><RefreshCcw size={18} /></div>
            <h2>Selecionar PL de Origem</h2>
          </div>
        </div>
        
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input 
            type="text" 
            className="input-campo foco-laranja" 
            placeholder="Buscar por nº PL, ID da solicitação, solicitante ou WBS..." 
            style={{ paddingLeft: '40px' }} 
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>

        <div className="lista-pl-container">
          {carregando ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCcw className="animate-spin" size={24} style={{ display: 'block', margin: '0 auto 10px auto' }} />
              Carregando Packing Lists da base de dados...
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              Nenhuma PL de Material concluída encontrada.
            </div>
          ) : (
            listaFiltrada.map((pl) => (
              <React.Fragment key={pl.id}>
                
                <div 
                  className="item-pl"
                  style={{
                    border: plSelecionada === pl.id ? '2px solid #f97316' : '1px solid #e2e8f0',
                    backgroundColor: plSelecionada === pl.id ? '#fff7ed' : '#ffffff',
                    borderBottomLeftRadius: plSelecionada === pl.id ? '0px' : '8px',
                    borderBottomRightRadius: plSelecionada === pl.id ? '0px' : '8px',
                    marginBottom: plSelecionada === pl.id ? '0px' : '12px',
                    opacity: pl.statusExibicao === 'Reintegrado' ? 0.7 : 1
                  }}
                  onClick={() => handleSelecionarPL(pl)}
                >
                  <div className="item-pl-info">
                    <span className="item-pl-titulo" style={{ color: plSelecionada === pl.id ? '#ea580c' : '#1e293b' }}>
                      {pl.pl || `ID: ${pl.id}`}
                    </span>
                    <span className="item-pl-detalhes">
                      {pl.solicitante} &middot; WBS: {pl.wbs} &middot; {pl.itens ? pl.itens.length : 0} itens listados
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    
                    {/* ✨ O BADGE MUDA DE COR DEPENDENDO DO CÁLCULO */}
                    <span className="badge-separacao" style={{ 
                      backgroundColor: pl.statusExibicao === 'Reintegrado' || pl.statusExibicao === 'Concluído' ? '#ecfdf5' : '#e0f2fe',
                      borderColor: pl.statusExibicao === 'Reintegrado' || pl.statusExibicao === 'Concluído' ? '#a7f3d0' : '#bae6fd',
                      color: pl.statusExibicao === 'Reintegrado' || pl.statusExibicao === 'Concluído' ? '#059669' : '#0284c7'
                    }}>
                      {pl.statusExibicao}
                    </span>
                    
                    {pl.statusExibicao !== 'Reintegrado' && (
                      plSelecionada === pl.id ? <ChevronUp size={18} color="#ea580c"/> : <ChevronDown size={18} color="#94a3b8"/>
                    )}
                  </div>
                </div>

                {plSelecionada === pl.id && (
                  <div style={{
                    border: '2px solid #f97316',
                    borderTop: 'none',
                    backgroundColor: '#fafaf9',
                    padding: '16px',
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px',
                    marginBottom: '12px',
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ea580c' }}>
                      <Box size={16} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                        Selecione as quantidades que voltarão para o estoque:
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #fed7aa', color: '#9a3412' }}>
                          <th style={{ padding: '8px', fontWeight: '600' }}>PART NUMBER</th>
                          <th style={{ padding: '8px', fontWeight: '600' }}>DESCRIÇÃO</th>
                          <th style={{ padding: '8px', fontWeight: '600' }}>SALDO P/ DEVOLVER</th>
                          <th style={{ padding: '8px', fontWeight: '600', width: '120px' }}>QTD DEVOLVER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensDaPL.map(itemTabela => (
                          <tr key={itemTabela.id} style={{ borderBottom: '1px solid #ffedd5' }}>
                            <td style={{ padding: '12px 8px', fontWeight: '600', color: '#431407' }}>
                              {itemTabela.part_number_manual}
                            </td>
                            <td style={{ padding: '12px 8px', color: '#7c2d12' }}>
                              {itemTabela.descricao_manual}
                            </td>
                            <td style={{ padding: '12px 8px', color: '#7c2d12', fontWeight: 'bold' }}>
                              {itemTabela.quantidade_maxima_permitida} {itemTabela.unidade_medida_manual}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input 
                                type="number" 
                                min="0" 
                                max={itemTabela.quantidade_maxima_permitida}
                                value={itemTabela.quantidade_devolvida}
                                onChange={(e) => alterarQuantidade(itemTabela.id, e.target.value)}
                                style={{
                                  width: '80px', padding: '6px', borderRadius: '6px',
                                  border: '1px solid #fdba74', outline: 'none',
                                  textAlign: 'center', color: '#c2410c', fontWeight: 'bold'
                                }}
                              />
                            </td>
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

      <BotaoAcaoGlobal
        texto="Reintegrar Itens Selecionados"
        icone={<Send size={16} />}
        cor="laranja"
        onClick={handleEnviar}
      />

    </div>
  );
}