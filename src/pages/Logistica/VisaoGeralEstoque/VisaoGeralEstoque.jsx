import React, { useState, useEffect } from 'react';
import './VisaoGeralEstoque.css';
import { DollarSign, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VisaoGeralEstoque() {
  const [pesquisa, setPesquisa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  
  // 👇 NOVOS ESTADOS: Para guardar os dados reais do banco e controlar o carregamento
  const [dadosEstoque, setDadosEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // MÁGICA: Buscar dados reais da API quando a página carrega
  useEffect(() => {
    const buscarEstoqueReal = async () => {
      try {
        const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar');
        const resultado = await resposta.json();

        if (resposta.ok && resultado.sucesso) {
          // 1. Filtra APENAS as solicitações de "Entrada" que já foram aprovadas
          const entradasAprovadas = resultado.dados.filter(sol => 
            sol.tipo === 'Entrada' && 
            (sol.status === 'Em Separação' || sol.status === 'Concluído')
          );

          // 2. Extrai todos os itens de dentro dessas solicitações e formata para a tabela
          const itensExtraidos = entradasAprovadas.flatMap(sol => {
            return sol.itens.map(item => ({
              id: item.id,
              sap: item.desenho_sap_manual || '-',
              pn: item.part_number_manual || '-',
              desc: item.descricao_manual || '-',
              fornecedor: item.fornecedor || '-',
              nf: item.nf_entrada || '-',
              qtdNf: item.quantidade_solicitada || 0,
              saldo: item.quantidade_solicitada || 0, // Num sistema avançado, este saldo seria calculado (Entradas - Saídas)
              un: item.unidade_medida_manual || 'Unid',
              valorUnit: item.valor_unitario_manual ? `R$ ${item.valor_unitario_manual.toFixed(2)}` : 'R$ 0,00',
              alocacao: item.alocacao || '-',
              wbs: item.wbs_element || sol.wbs || '-', // Puxa do item, se não tiver, puxa da solicitação pai
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

  // Lógica de Filtragem (Agora usando o estado dadosEstoque real)
  const dadosFiltrados = dadosEstoque.filter((item) => {
    // 1. Filtro de Status
    let passaStatus = true;
    if (filtroStatus === 'Disponíveis') passaStatus = item.status === 'Disponível';
    if (filtroStatus === 'Zerados') passaStatus = item.status === 'Zerado';

    // 2. Filtro de Pesquisa (SAP, PN, Descrição, WBS)
    const termo = pesquisa.toLowerCase();
    const passaPesquisa = 
      item.sap.toLowerCase().includes(termo) ||
      item.pn.toLowerCase().includes(termo) ||
      item.desc.toLowerCase().includes(termo) ||
      item.wbs.toLowerCase().includes(termo);

    return passaStatus && passaPesquisa;
  });

  // KPIs
  const totalItens = dadosEstoque.length;
  const disponiveis = dadosEstoque.filter(i => i.status === 'Disponível').length;
  const zerados = dadosEstoque.filter(i => i.status === 'Zerado').length;

  return (
    <div className="visao-geral-wrapper">
      
      {/* CABEÇALHO */}
      <header className="visao-cabecalho">
        <h1>Visão Geral do Estoque</h1>
        <p>Edição manual completa de todos os materiais — perfil Logística</p>
      </header>

      {/* CARTÃO RESUMO (VALORES E KPIs) */}
      <div className="cartao-resumo-estoque">
        <div className="bloco-valor-total">
          <div className="icone-cifrao-bg">
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
          <div className="textos-valor">
            <label>VALOR TOTAL DO ESTOQUE</label>
            <h2>R$ --,--</h2> {/* Numa fase futura podemos criar um .reduce() para somar os valoresUnit * saldo */}
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

      {/* TABELA E CONTROLES */}
      <div className="cartao-tabela">
        
        {/* Controles: Abas e Pesquisa */}
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

        {/* Total de Resultados da Busca */}
        <div className="tabela-info-resultados">
          {dadosFiltrados.length} resultado(s)
        </div>

        {/* Tabela Scrollável */}
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
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    Carregando estoque do banco de dados...
                  </td>
                </tr>
              ) : dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Nenhum material encontrado no estoque ou aguardando aprovação de novas entradas.
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((item, index) => (
                  <tr key={index}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}