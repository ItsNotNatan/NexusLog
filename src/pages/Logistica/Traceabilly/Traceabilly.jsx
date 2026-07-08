import React from 'react';
import './Traceabilly.css'; // Importação do nosso CSS exclusivo
import { 
  Archive, 
  Search, 
  User, 
  Calendar, 
  Box, 
  ArrowRight 
} from 'lucide-react';

// 1. DADOS SIMULADOS DA TABELA
// Criamos um array para facilitar a adição de novas linhas no futuro
const dadosTabela = [
  {
    id: 1,
    partNumber: 'PN-RED-5567',
    descricao: 'Redução Concêntri...',
    fornecedor: 'Aperam South America',
    nfEntrada: 'NF-45850',
    bsSaida: 'BS #10976',
    solicitacao: 'PS:2306261114',
    solicitanteInicial: 'T',
    solicitanteNome: 'TESTE',
    alocacao: '400-B-014'
  }
];

// 2. COMPONENTE PRINCIPAL
export default function Traceabilly() {
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
            <span className="badge-contador">1</span>
          </div>
          
          <div className="pesquisa-grupo">
            <Search className="icone-pesquisa" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por PN, NF, BS, WBS, Solicitante..." 
              className="input-pesquisa"
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
          <table className="tabela-rastreabilidade">
            {/* Cabeçalho da Tabela */}
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
              </tr>
            </thead>
            
            {/* Corpo da Tabela */}
            <tbody>
              {dadosTabela.map((linha) => (
                <tr key={linha.id}>
                  {/* Colunas simples */}
                  <td className="fonte-forte">{linha.partNumber}</td>
                  <td>{linha.descricao}</td>
                  <td className="texto-cinza">{linha.fornecedor}</td>
                  
                  {/* Etiqueta de NF */}
                  <td>
                    <span className="badge-borda">{linha.nfEntrada}</span>
                  </td>
                  
                  {/* Etiqueta de BS com seta */}
                  <td>
                    <div className="celula-flex">
                      <ArrowRight size={14} className="icone-seta" />
                      <span className="badge-azul-claro">{linha.bsSaida}</span>
                    </div>
                  </td>
                  
                  {/* Etiqueta de Solicitação */}
                  <td>
                    <span className="badge-azul-suave">{linha.solicitacao}</span>
                  </td>
                  
                  {/* Avatar e Nome do Solicitante */}
                  <td>
                    <div className="celula-flex">
                      <span className="avatar-circulo">{linha.solicitanteInicial}</span>
                      <span className="fonte-forte">{linha.solicitanteNome}</span>
                    </div>
                  </td>
                  
                  {/* Alocação (Link Azul) */}
                  <td>
                    <a href="#" className="link-alocacao">{linha.alocacao}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}