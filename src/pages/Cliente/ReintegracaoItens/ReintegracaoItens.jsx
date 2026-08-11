import React, { useState, useEffect, useContext } from 'react';
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
  
  // Estado que armazena todas as PLs vindas do banco de dados
  const [listaDePl, setListaDePl] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados de controlo da PL Selecionada
  const [plSelecionada, setPlSelecionada] = useState(null);
  const [itensDaPL, setItensDaPL] = useState([]);

  // =======================================================================
  // 1. CARREGAR AS PLs DO BACKEND AO INICIAR A PÁGINA
  // =======================================================================
  useEffect(() => {
    const buscarPLs = async () => {
      try {
        setCarregando(true);
        // Traz as solicitações da filial atual
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=500`);

        if (resultado.sucesso) {
          // Filtra APENAS solicitações do tipo "Material" que já tenham sido aprovadas ou concluídas
          const plsValidas = resultado.dados.filter(sol => 
            sol.tipo === 'Material' && 
            (sol.status === 'Em Separação' || sol.status === 'Concluído') &&
            sol.pl && sol.pl !== '-'
          );

          setListaDePl(plsValidas);
        } else {
          console.error("Erro ao buscar as PLs:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha na ligação com o servidor:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    buscarPLs();
  }, [estoqueAtual]);

  // =======================================================================
  // 2. AÇÃO DE SELECIONAR A PL E PREPARAR OS ITENS
  // =======================================================================
  const handleSelecionarPL = (plOriginal) => {
    // Se o cliente clicar na mesma PL que já está aberta, ela fecha.
    if (plSelecionada === plOriginal.id) {
      setPlSelecionada(null);
      setItensDaPL([]);
      return;
    }

    setPlSelecionada(plOriginal.id);

    // Mapeia os itens da PL selecionada adicionando a propriedade "quantidade_devolvida" 
    // com o valor inicial a 0.
    const itensMapeados = (plOriginal.itens || []).map(item => ({
      ...item,
      quantidade_devolvida: 0 // Valor editável pelo utilizador
    }));

    setItensDaPL(itensMapeados);
  };

  // =======================================================================
  // 3. ATUALIZAR A QUANTIDADE A DEVOLVER NA TABELA EXPANDIDA
  // =======================================================================
  const alterarQuantidade = (itemId, novaQuantidade) => {
    let valorNum = parseInt(novaQuantidade, 10);
    if (isNaN(valorNum) || valorNum < 0) valorNum = 0;

    setItensDaPL(prevItens => 
      prevItens.map(item => {
        if (item.id === itemId) {
          // Não permite devolver mais do que foi pedido originalmente
          if (valorNum > item.quantidade_solicitada) {
            valorNum = item.quantidade_solicitada;
          }
          return { ...item, quantidade_devolvida: valorNum };
        }
        return item;
      })
    );
  };

  // =======================================================================
  // 4. SUBMETER A SOLICITAÇÃO PARA O BACKEND
  // =======================================================================
  const handleEnviar = async () => {
    if (!nome) {
      showAlert("Campo Obrigatório", "Por favor, preencha o seu nome.", "warning");
      return;
    }
    if (!plSelecionada) {
      showAlert("PL Obrigatória", "Selecione uma PL da lista.", "warning");
      return;
    }

    // Filtramos apenas os itens em que o cliente preencheu uma quantidade > 0
    const itensParaDevolver = itensDaPL.filter(item => item.quantidade_devolvida > 0);

    if (itensParaDevolver.length === 0) {
      showAlert("Nenhum item selecionado", "Tem de informar a quantidade a devolver de pelo menos 1 item da lista.", "warning");
      return;
    }

    const plDados = listaDePl.find(p => p.id === plSelecionada);

    const payload = {
      solicitante: {
        nome: nome,
        pl_origem: plDados.pl, // Extrai a sigla da PL limpa (ex: PL #15)
        wbs: plDados.wbs,
        filial_origem: estoqueAtual
      },
      itens: itensParaDevolver // A API do backend já vai saber que é para ler isto
    };

    try {
      const dados = await apiFetch('/solicitacoes/reintegracao', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps_id || dados.pl_id) {
        showAlert("Sucesso!", `Reintegração solicitada com sucesso. ID gerado: ${dados.ps_id || dados.pl_id}`, "success");
        
        // Reset da Tela
        setNome('');
        setPlSelecionada(null);
        setItensDaPL([]);
        setPesquisa('');
      } else {
        showAlert("Erro de Servidor", dados.erro, "error");
      }
    } catch (error) {
      console.error("Erro na requisição:", error.message);
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor. Verifique a sua internet.", "error");
    }
  };

  // =======================================================================
  // 5. FILTRAGEM DA BARRA DE PESQUISA (FRONT-END)
  // =======================================================================
  const listaFiltrada = listaDePl.filter(pl => 
    (pl.pl && pl.pl.toLowerCase().includes(pesquisa.toLowerCase())) || 
    (pl.id && pl.id.toLowerCase().includes(pesquisa.toLowerCase())) || 
    (pl.solicitante && pl.solicitante.toLowerCase().includes(pesquisa.toLowerCase())) ||
    (pl.wbs && pl.wbs.toLowerCase().includes(pesquisa.toLowerCase()))
  );

  return (
    <div className="limitador-largura">
      
      {/* 1. DADOS DO SOLICITANTE */}
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

      {/* 2. PESQUISA E LISTAGEM DE PLs */}
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
              A carregar Packing Lists da base de dados...
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              Nenhuma PL de Material concluída encontrada.
            </div>
          ) : (
            listaFiltrada.map((pl) => (
              <React.Fragment key={pl.id}>
                
                {/* LINHA DO PACKING LIST PRINCIPAL */}
                <div 
                  className="item-pl"
                  style={{
                    border: plSelecionada === pl.id ? '2px solid #f97316' : '1px solid #e2e8f0',
                    backgroundColor: plSelecionada === pl.id ? '#fff7ed' : '#ffffff',
                    borderBottomLeftRadius: plSelecionada === pl.id ? '0px' : '8px',
                    borderBottomRightRadius: plSelecionada === pl.id ? '0px' : '8px',
                    marginBottom: plSelecionada === pl.id ? '0px' : '12px'
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
                    <span className="badge-separacao" style={{ 
                      backgroundColor: pl.status === 'Concluído' ? '#ecfdf5' : '#e0f2fe',
                      borderColor: pl.status === 'Concluído' ? '#a7f3d0' : '#bae6fd',
                      color: pl.status === 'Concluído' ? '#059669' : '#0284c7'
                    }}>
                      {pl.status}
                    </span>
                    {plSelecionada === pl.id ? <ChevronUp size={18} color="#ea580c"/> : <ChevronDown size={18} color="#94a3b8"/>}
                  </div>
                </div>

                {/* PAINEL EXPANSÍVEL (SÓ ABRE QUANDO O PL ESTIVER SELECIONADO) */}
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
                          <th style={{ padding: '8px', fontWeight: '600' }}>RETIRADO DA PL</th>
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
                            <td style={{ padding: '12px 8px', color: '#7c2d12' }}>
                              {itemTabela.quantidade_solicitada} {itemTabela.unidade_medida_manual}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {/* INPUT DE QUANTIDADE A DEVOLVER */}
                              <input 
                                type="number" 
                                min="0" 
                                max={itemTabela.quantidade_solicitada}
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

                    <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#c2410c' }}>
                      * Se não for devolver determinado item, deixe a "Qtd Devolver" como 0.
                    </div>

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