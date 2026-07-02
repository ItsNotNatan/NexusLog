import React, { useState } from 'react';
import './ConsultaEstoque.css';
import {
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  Search,
  FileText
} from 'lucide-react';

// 1. DADOS SIMULADOS (MOCK) BASEADOS NA IMAGEM
const dadosTabela = [
  {
    id: 1,
    desenhoSAP: 'TLXXX-0000023499',
    partNumber: '1534534',
    descricao: 'SENSOR DE INDUÇÃO',
    fornecedor: 'BALLUF',
    nfEntrada: '1497',
    qtdNF: '20',
    qtdNFUnd: 'Unid',
    qtdCor: 'azul',
    saldo: '0',
    saldoUnd: 'Unid',
    saldoCor: 'vermelho',
    valorUnit: 'R$ 250,00',
    valorTotal: 'R$ 0,00',
    alocacao: '200-A-003',
    wbs: 'BRBCBBB20',
    status: 'Zerado'
  },
  {
    id: 2,
    desenhoSAP: '-',
    partNumber: 'PN-TUB-7890',
    descricao: 'Tubo Aço Inox 316L 6" Sch...',
    fornecedor: 'Aperam South America',
    nfEntrada: 'NF-45830',
    qtdNF: '-',
    qtdNFUnd: '',
    qtdCor: 'cinza',
    saldo: '4',
    saldoUnd: 'Metro',
    saldoCor: 'verde',
    valorUnit: 'R$ 890,00',
    valorTotal: 'R$ 3.560,00',
    alocacao: '400-A-003',
    wbs: 'WBS-PRJ-2024-001',
    status: 'Disponível'
  },
  {
    id: 3,
    desenhoSAP: '-',
    partNumber: 'PN-FLG-1580',
    descricao: 'Flange Cego 4" ANSI 150',
    fornecedor: 'Conforminas',
    nfEntrada: 'NF-45822',
    qtdNF: '-',
    qtdNFUnd: '',
    qtdCor: 'cinza',
    saldo: '17',
    saldoUnd: 'Unid',
    saldoCor: 'verde',
    valorUnit: 'R$ 380,50',
    valorTotal: 'R$ 6.468,50',
    alocacao: '300-C-012',
    wbs: 'WBS-PRJ-2024-001',
    status: 'Disponível'
  }
];

export default function ConsultaEstoque() {
  const [periodoAtivo, setPeriodoAtivo] = useState('Total');

  return (
    <div className="consulta-wrapper">

      {/* --- CABEÇALHO --- */}
      <header className="consulta-cabecalho">
        <h1>Consulta de Estoque</h1>
        <p>Visão completa dos materiais disponíveis em todos os projetos</p>
      </header>

      {/* --- DESTAQUE: VALOR TOTAL --- */}
      <div className="cartao-valor-total">
        <div className="valor-info-grupo">
          <div className="icone-cifrao">
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
          <div className="valor-textos">
            <label>VALOR TOTAL DO ESTOQUE</label>
            <h2>R$ 56.704,75</h2>
          </div>
        </div>

        <div className="itens-ativos-badge">
          <span>Itens Ativos</span>
          <strong>9</strong>
        </div>
      </div>

      {/* --- FILTROS DE PERÍODO --- */}
      <div className="filtros-periodo">
        <span>PERÍODO:</span>
        {['Total', 'Hoje', 'Semana', 'Mês'].map(periodo => (
          <button
            key={periodo}
            className={`btn-periodo ${periodoAtivo === periodo ? 'ativo' : ''}`}
            onClick={() => setPeriodoAtivo(periodo)}
          >
            {periodo}
          </button>
        ))}
      </div>

      {/* --- CARTÕES KPI (Total, Disponíveis, Zerados) --- */}
      <div className="kpis-estoque">
        <div className="kpi-card selecionado">
          <div className="kpi-icone">
            <Package size={20} />
          </div>
          <div className="kpi-textos">
            <label>Total de Itens</label>
            <strong>11</strong>
          </div>
        </div>

        <div className="kpi-card verde">
          <div className="kpi-icone">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-textos">
            <label>Disponíveis</label>
            <strong>9</strong>
          </div>
        </div>

        <div className="kpi-card vermelho">
          <div className="kpi-icone">
            <XCircle size={20} />
          </div>
          <div className="kpi-textos">
            <label>Zerados</label>
            <strong>2</strong>
          </div>
        </div>
      </div>

      {/* --- ÁREA DA TABELA --- */}
      <div className="tabela-area">

        {/* Pesquisas */}
        <div className="tabela-pesquisas">
          <div className="pesquisa-grupo principal">
            <Search className="icone-busca" size={18} />
            <input type="text" placeholder="Buscar por Desenho SAP, Part Number, Descrição, WBS..." />
          </div>
          <div className="pesquisa-grupo secundaria">
            <FileText className="icone-busca" size={18} />
            <input type="text" placeholder="Buscar por Nota Fiscal..." />
          </div>
        </div>

        {/* Info Resultados */}
        <div className="resultados-info">
          11 resultados
        </div>

        {/* Tabela com Scroll */}
        <div className="scroll-tabela">
          <table className="tabela-dados">
            <thead>
              <tr>
                <th>DESCRIÇÃO DO MAT.</th>
                <th>N° PRÇA</th>
                <th>DESCRIÇÃO</th>
                <th>FORNECEDOR</th>
                <th>QTD</th>
                <th>REFERÊNCIA</th>
                <th>UNI. DE MED.</th>
                <th>VENDOR DESCR.</th>
                <th>WBS</th>
                <th>EMISSÃO NF.</th>
                <th>RECIBO NF.</th>
                <th>DOC. DE COMPRAS</th>
                <th>PO. NET PRICE</th>
                <th>CENTRO</th>
                <th>DEPÓSITO</th>
                <th>ALOCAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {dadosTabela.map((item) => (
                <tr key={item.id}>

                  {/* Desenho SAP */}
                  <td>
                    {item.desenhoSAP !== '-' ? (
                      <span className="texto-cinza-claro" style={{ display: 'block', maxWidth: '80px', wordWrap: 'break-word' }}>
                        {item.desenhoSAP}
                      </span>
                    ) : (
                      <span className="texto-cinza-claro">-</span>
                    )}
                  </td>

                  {/* Part Number */}
                  <td>
                    <span className="badge-partnumber">{item.partNumber}</span>
                  </td>

                  {/* Descrição e Fornecedor */}
                  <td className="texto-preto">{item.descricao}</td>
                  <td className="texto-cinza-escuro">{item.fornecedor}</td>

                  {/* NF Entrada */}
                  <td>
                    <span className="badge-nf">
                      <FileText size={14} /> {item.nfEntrada}
                    </span>
                  </td>

                  {/* QTD NF */}
                  <td>
                    <div className={`qtd-celula ${item.qtdCor}`}>
                      {item.qtdNF}
                      {item.qtdNFUnd && <span>{item.qtdNFUnd}</span>}
                    </div>
                  </td>

                  {/* SALDO */}
                  <td>
                    <div className={`qtd-celula ${item.saldoCor}`}>
                      {item.saldo}
                      {item.saldoUnd && <span>{item.saldoUnd}</span>}
                    </div>
                  </td>

                  {/* Valores */}
                  <td className="texto-cinza-escuro">{item.valorUnit}</td>
                  <td className="texto-preto">{item.valorTotal}</td>

                  {/* Links (Alocação e WBS) */}
                  <td><a href="#" className="link-azul">{item.alocacao}</a></td>
                  <td><a href="#" className="link-azul">{item.wbs}</a></td>

                  {/* Situação (Badge Status) */}
                  <td>
                    {item.status === 'Zerado' ? (
                      <span className="badge-status-tabela status-zerado">
                        <XCircle size={14} /> {item.status}
                      </span>
                    ) : (
                      <span className="badge-status-tabela status-disponivel">
                        <CheckCircle2 size={14} /> {item.status}
                      </span>
                    )}
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