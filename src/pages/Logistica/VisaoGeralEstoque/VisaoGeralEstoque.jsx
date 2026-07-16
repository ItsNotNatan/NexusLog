import React, { useState, useEffect } from 'react';
import './VisaoGeralEstoque.css';
import { DollarSign, Search, CheckCircle2, XCircle, Loader2, Edit, Box, X } from 'lucide-react'; // 👈 Importamos Box e X

// Dados Mockados do Histórico (Exatamente como na tua imagem)
const mockHistorico = [
  { bs: '#10993', data: '14/07/2026', solicitante: 'NATAN GUIMARES', destino: 'TESTE', qtdSaida: 1, status: 'Em Separação' },
  { bs: '#10992', data: '14/07/2026', solicitante: 'NATAN G', destino: 'TESTE', qtdSaida: 10, status: 'Em Separação' },
  { bs: '#10985', data: '06/07/2026', solicitante: 'DOUGLAS FELIPE', destino: 'BR01 - MANUFACTURING', qtdSaida: 1, status: 'Em Separação' },
  { bs: '#10984', data: '06/07/2026', solicitante: 'TESTE', destino: 'TESTE', qtdSaida: 40, status: 'Em Separação' },
  { bs: '#10983', data: '03/07/2026', solicitante: 'teste', destino: 'teste', qtdSaida: 1, status: 'Em Separação' },
  { bs: '#10982', data: '03/07/2026', solicitante: 'HADELINE', destino: 'MANUFACTURING', qtdSaida: 40, status: 'Em Separação' },
];

export default function VisaoGeralEstoque({ perfil = 'cliente' }) {
  const [pesquisa, setPesquisa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  
  const [dadosEstoque, setDadosEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // 👇 NOVO ESTADO: Controla qual item está aberto no modal (se null, o modal está fechado)
  const [modalItem, setModalItem] = useState(null);

  useEffect(() => {
    const buscarEstoqueReal = async () => {
      try {
        const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar');
        const resultado = await resposta.json();

        if (resposta.ok && resultado.sucesso) {
          const entradasAprovadas = resultado.dados.filter(sol => 
            sol.tipo === 'Entrada' && 
            (sol.status === 'Em Separação' || sol.status === 'Concluído')
          );

          const itensExtraidos = entradasAprovadas.flatMap(sol => {
            return sol.itens.map(item => ({
              id: item.id,
              sap: item.desenho_sap_manual || '-',
              pn: item.part_number_manual || '-',
              desc: item.descricao_manual || '-',
              fornecedor: item.fornecedor || '-',
              nf: item.nf_entrada || '-',
              qtdNf: item.quantidade_solicitada || 0,
              saldo: item.quantidade_solicitada || 0, 
              un: item.unidade_medida_manual || 'Unid',
              valorUnitRaw: item.valor_unitario_manual || 0, 
              valorUnit: item.valor_unitario_manual ? `R$ ${item.valor_unitario_manual.toFixed(2)}` : 'R$ 0,00',
              alocacao: item.alocacao || '-',
              wbs: item.wbs_element || sol.wbs || '-', 
              status: 'Disponível'
            }));
          });

          setDadosEstoque(itensExtraidos);
        } else {
          console.error("Erro retornado do servidor:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha ao buscar dados do estoque:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarEstoqueReal();
  }, []);

  const dadosFiltrados = dadosEstoque.filter((item) => {
    let passaStatus = true;
    if (filtroStatus === 'Disponíveis') passaStatus = item.status === 'Disponível';
    if (filtroStatus === 'Zerados') passaStatus = item.status === 'Zerado';

    const termo = pesquisa.toLowerCase();
    const passaPesquisa = 
      item.sap.toLowerCase().includes(termo) ||
      item.pn.toLowerCase().includes(termo) ||
      item.desc.toLowerCase().includes(termo) ||
      item.wbs.toLowerCase().includes(termo);

    return passaStatus && passaPesquisa;
  });

  const totalItens = dadosEstoque.length;
  const disponiveis = dadosEstoque.filter(i => i.status === 'Disponível').length;
  const zerados = dadosEstoque.filter(i => i.status === 'Zerado').length;

  const somaTotal = dadosEstoque.reduce((acumulador, item) => {
    return acumulador + (item.saldo * item.valorUnitRaw);
  }, 0); 

  const valorTotalFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(somaTotal);

  const handleEditarItem = (idItem) => {
    alert(`Ação de edição para o item ${idItem} ainda será construída!`);
  };

  return (
    <div className="visao-geral-wrapper">
      
      <header className="visao-cabecalho">
        <h1>Visão Geral do Estoque</h1>
        <p>
          {perfil === 'logistica' 
            ? 'Edição manual completa de todos os materiais — perfil Logística' 
            : 'Consulta em tempo real dos materiais disponíveis — perfil Cliente'}
        </p>
      </header>

      <div className="cartao-resumo-estoque">
        <div className="bloco-valor-total">
          <div className="icone-cifrao-bg">
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
          <div className="textos-valor">
            <label>VALOR TOTAL DO ESTOQUE</label>
            <h2>{valorTotalFormatado}</h2> 
          </div>
        </div>

        <div className="mini-kpis-grupo">
          <div className="mini-kpi-card kpi-preto">
            <span>Total de Itens</span>
            <strong>{totalItens}</strong>
          </div>
          <div className="mini-kpi-card kpi-verde">
            <span>Disponíveis</span>
            <strong>{disponiveis}</strong>
          </div>
          <div className="mini-kpi-card kpi-vermelho">
            <span>Zerados</span>
            <strong>{zerados}</strong>
          </div>
        </div>
      </div>

      <div className="cartao-tabela">
        <div className="tabela-controles">
          <div className="filtros-abas">
            {['Todos', 'Disponíveis', 'Zerados'].map(aba => (
              <button 
                key={aba}
                className={`btn-aba-estoque ${filtroStatus === aba ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus(aba)}
              >
                {aba}
              </button>
            ))}
          </div>

          <div className="pesquisa-wrapper">
            <Search className="icone-pesquisa" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por PN, SAP..." 
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </div>
        </div>

        <div className="tabela-info-resultados">
          {dadosFiltrados.length} resultado(s)
          {/* 👇 Avisozinho discreto para o utilizador */}
          <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: '#94a3b8' }}>
            (Dê um duplo clique numa linha para ver o Histórico de Saídas)
          </span>
        </div>

        <div className="tabela-scroll">
          <table className="dados-table">
            <thead>
              <tr>
                <th>DESENHO SAP</th>
                <th>PART NUMBER</th>
                <th>DESCRIÇÃO</th>
                <th>FORNECEDOR</th>
                <th>NF ENTRADA</th>
                <th>QTD. NF</th>
                <th>SALDO</th>
                <th>UN</th>
                <th>VALOR UNIT.</th>
                <th>ALOCAÇÃO</th>
                <th>WBS</th>
                <th>SITUAÇÃO</th>
                {perfil === 'logistica' && <th style={{ textAlign: 'center' }}>AÇÕES</th>}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={perfil === 'logistica' ? "13" : "12"} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    Carregando estoque do banco de dados...
                  </td>
                </tr>
              ) : dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={perfil === 'logistica' ? "13" : "12"} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Nenhum material encontrado no estoque ou aguardando aprovação de novas entradas.
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((item, index) => (
                  <tr 
                    key={index} 
                    className="linha-tabela-hover"
                    onDoubleClick={() => setModalItem(item)} // 👈 A MÁGICA DO DUPLO CLIQUE AQUI
                  >
                    <td className="fonte-mono">{item.sap}</td>
                    <td className="fonte-mono">{item.pn}</td>
                    <td style={{ minWidth: '220px' }}>{item.desc}</td>
                    <td>{item.fornecedor}</td>
                    <td>{item.nf}</td>
                    <td>{item.qtdNf}</td>
                    <td className={item.saldo > 0 ? 'texto-verde-destaque' : 'texto-vermelho-destaque'}>
                      {item.saldo}
                    </td>
                    <td>{item.un}</td>
                    <td>{item.valorUnit}</td>
                    <td className="fonte-mono">{item.alocacao}</td>
                    <td className="fonte-mono">{item.wbs}</td>
                    <td>
                      {item.status === 'Disponível' ? (
                        <span className="badge-status-tabela status-disponivel">
                          <CheckCircle2 size={12} /> Disp...
                        </span>
                      ) : (
                        <span className="badge-status-tabela status-zerado">
                          <XCircle size={12} /> Zerado
                        </span>
                      )}
                    </td>
                    
                    {perfil === 'logistica' && (
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditarItem(item.id); }} // e.stopPropagation evita que o clique no botão ative a linha
                          style={{
                            background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer',
                            padding: '6px', borderRadius: '6px', transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Editar Item"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

{/* ======================================================== */}
      {/* 👇 O NOSSO NOVO MODAL DE HISTÓRICO                       */}
      {/* ======================================================== */}
      {modalItem && (
        <div className="modal-historico-overlay" onClick={() => setModalItem(null)}>
          <div className="modal-historico-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Header do Modal */}
            <div className="modal-historico-header">
              <div className="modal-historico-titulo">
                <div className="modal-icone-bg"><Box size={24} /></div>
                <div>
                  <h3>Histórico de Saídas</h3>
                  <p>{modalItem.pn}</p>
                </div>
              </div>
              <button className="btn-fechar-modal" onClick={() => setModalItem(null)}>
                <X size={24} />
              </button>
            </div>

            {/* Faixa de Resumo */}
            <div className="modal-historico-resumo">
              <div className="resumo-item" style={{ flex: 1, minWidth: '200px' }}>
                <span>Descrição</span>
                <strong style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {modalItem.desc}
                </strong>
              </div>
              <div className="resumo-item">
                <span>Saldo Atual</span>
                {/* 👇 Removido o modalItem.un daqui */}
                <strong className="texto-verde-modal">{modalItem.saldo}</strong>
              </div>
              <div className="resumo-item">
                <span>Qtd. Original (NF)</span>
                {/* 👇 Removido o modalItem.un daqui */}
                <strong>{modalItem.qtdNf}</strong>
              </div>
              <div className="resumo-item">
                <span>Total Saído</span>
                {/* 👇 Removido o modalItem.un daqui */}
                <strong className="texto-vermelho-modal">93</strong>
              </div>
            </div>

            {/* Tabela de Saídas */}
            <div className="modal-historico-tabela-wrapper">
              <table className="tabela-modal">
                <thead>
                  <tr>
                    <th>BS</th>
                    <th>DATA</th>
                    <th>SOLICITANTE</th>
                    <th>DESTINO</th>
                    <th>QTD. SAÍDA</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {mockHistorico.map((hist, idx) => (
                    <tr key={idx}>
                      <td className="fonte-mono"><a href="#" className="link-azul">{hist.bs}</a></td>
                      <td>{hist.data}</td>
                      <td className="fonte-negrito" style={{ textTransform: 'uppercase' }}>{hist.solicitante}</td>
                      <td>{hist.destino}</td>
                      {/* 👇 Removido o modalItem.un daqui também */}
                      <td className="texto-vermelho-destaque">{hist.qtdSaida}</td>
                      <td><span className="badge-separacao-modal">{hist.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}