import React, { useState, useEffect } from 'react';
import './Traceabilly.css'; 
import { 
  Archive, 
  Search, 
  User, 
  Calendar, 
  Box, 
  ArrowRight,
  RotateCcw,
  Loader // Ícone extra para mostrar carregamento
} from 'lucide-react';

export default function Traceabilly({ perfil = 'logistica' }) {
  // 1. ESTADOS DO COMPONENTE
  // Guardamos os itens reais vindos do banco de dados
  const [dadosRastreabilidade, setDadosRastreabilidade] = useState([]);
  // Controlamos se a tela está a carregar
  const [carregando, setCarregando] = useState(true);
  // Controlamos o campo de pesquisa
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // 2. BUSCA DE DADOS (Executado quando a tela abre)
  useEffect(() => {
    buscarHistorico();
  }, []);

  const buscarHistorico = async () => {
    try {
      setCarregando(true);
      // Faz a chamada à tua API real
      const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar');
      const json = await resposta.json();

      if (json.sucesso) {
        let itensExtraidos = [];

        // 3. LÓGICA DE EXTRAÇÃO: A API devolve as solicitações.
        // Precisamos de extrair os "itens" de dentro de cada solicitação aprovada.
        json.dados.forEach(solicitacao => {
          // Filtramos apenas o que já foi processado pela logística
          if (solicitacao.status === 'Em Separação' || solicitacao.status === 'Concluído') {
            
            solicitacao.itens.forEach(item => {
              // Formatamos os dados para encaixar perfeitamente na tua tabela
              itensExtraidos.push({
                id: item.id,
                partNumber: item.part_number_manual || '-',
                descricao: item.descricao_manual || '-',
                fornecedor: item.fornecedor || '-',
                nfEntrada: item.nf_entrada || 'N/A',
                bsSaida: solicitacao.bs || '-',
                solicitacao: solicitacao.id,
                solicitanteInicial: solicitacao.solicitante.charAt(0).toUpperCase(),
                solicitanteNome: solicitacao.solicitante,
                alocacao: item.alocacao || 'Padrão',
                qtd: `${item.quantidade_solicitada} ${item.unidade_medida_manual || 'Unid'}`,
                valor: item.valor_unitario_manual ? `R$ ${item.valor_unitario_manual}` : '-',
                wbs: solicitacao.wbs || '-',
                data: solicitacao.dataSolicitacao
              });
            });
          }
        });

        setDadosRastreabilidade(itensExtraidos);
      }
    } catch (error) {
      console.error("Erro ao buscar rastreabilidade:", error);
    } finally {
      setCarregando(false);
    }
  };

  // 4. FILTRO DE PESQUISA INTELIGENTE
  // Filtra a tabela conforme o utilizador digita no input de pesquisa
  const dadosFiltrados = dadosRastreabilidade.filter(item => 
    item.partNumber.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    item.descricao.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    item.solicitanteNome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    item.solicitacao.toLowerCase().includes(termoPesquisa.toLowerCase())
  );

  return (
    <div className="traceabilly-wrapper">
      
      {/* --- CABEÇALHO DA PÁGINA --- */}
      <header className="pagina-cabecalho">
        <h1>Rastreabilidade</h1>
        <p>Banco de dados histórico — rastreador completo de saída de itens</p>
      </header>

      {/* --- CARTÃO PRINCIPAL --- */}
      <div className="traceabilly-cartao">
        
        {/* Barra superior com Título e Pesquisa */}
        <div className="cartao-topo">
          <div className="titulo-grupo">
            <Archive className="icone-azul" size={20} />
            <h2>Itens Arquivados</h2>
            <span className="badge-contador">{dadosFiltrados.length}</span>
          </div>
          
          <div className="pesquisa-grupo">
            <Search className="icone-pesquisa" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por PN, NF, BS, WBS, Solicitante..." 
              className="input-pesquisa"
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)} // Atualiza o termo de pesquisa
            />
          </div>
        </div>

        {/* Linha de Filtros Rápidos */}
        <div className="filtros-linha">
          <button className="btn-filtro">
            <User size={16} /> Quem solicitou
          </button>
          <button className="btn-filtro">
            <Calendar size={16} /> Quando saiu
          </button>
          <button className="btn-filtro destaque">
            <Box size={16} /> Qual BS/Solicitação
          </button>
        </div>

        {/* --- TABELA COM SCROLL HORIZONTAL --- */}
        <div className="tabela-container">
          {carregando ? (
             // Feedback visual enquanto carrega os dados
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <Loader className="icone-girando" size={32} />
              <p>A carregar o histórico de saídas...</p>
            </div>
          ) : (
            <table className="tabela-rastreabilidade" style={{ minWidth: '1300px' }}>
              <thead>
                <tr>
                  <th>PART NUMBER</th>
                  <th>DESCRIÇÃO</th>
                  <th>FORNECEDOR</th>
                  <th>NF ENTRADA</th>
                  <th>BS SAÍDA</th>
                  <th>SOLICITAÇÃO</th>
                  <th>SOLICITANTE</th>
                  <th>ALOCAÇÃO</th>
                  <th>QTD</th>
                  <th>VALOR</th>
                  <th>WBS</th>
                  <th>DATA</th>
                  {perfil === 'logistica' && <th style={{ width: '40px' }}></th>}
                </tr>
              </thead>
              
              <tbody>
                {dadosFiltrados.length > 0 ? (
                  dadosFiltrados.map((linha, index) => (
                    // Usamos index + linha.id como key para garantir unicidade
                    <tr key={`${linha.id}-${index}`}>
                      <td className="fonte-forte">{linha.partNumber}</td>
                      <td>{linha.descricao}</td>
                      <td className="texto-cinza">{linha.fornecedor}</td>
                      
                      <td><span className="badge-borda">{linha.nfEntrada}</span></td>
                      
                      <td>
                        <div className="celula-flex">
                          <ArrowRight size={14} className="icone-seta" />
                          <span className="badge-azul-claro">{linha.bsSaida}</span>
                        </div>
                      </td>
                      
                      <td><span className="badge-azul-suave">{linha.solicitacao}</span></td>
                      
                      <td>
                        <div className="celula-flex">
                          <span className="avatar-circulo">{linha.solicitanteInicial}</span>
                          <span className="fonte-forte">{linha.solicitanteNome}</span>
                        </div>
                      </td>
                      
                      <td><a href="#" className="link-alocacao">{linha.alocacao}</a></td>
                      
                      <td className="fonte-forte">{linha.qtd}</td>
                      <td className="texto-cinza">{linha.valor}</td>
                      <td><a href="#" className="link-alocacao">{linha.wbs}</a></td>
                      <td className="texto-cinza">{linha.data}</td>

                      {perfil === 'logistica' && (
                        <td>
                          <button className="btn-reverter" title="Reverter Saída">
                            <RotateCcw size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                      Nenhum registo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}