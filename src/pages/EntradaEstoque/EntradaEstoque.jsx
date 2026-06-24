import React from 'react';
import './EntradaEstoque.css';
import { 
  PackagePlus, 
  Search, 
  Filter, 
  Trash2,
  Package
} from 'lucide-react';

// 1. DADOS SIMULADOS PARA A TABELA (MOCK DATA)
const dadosEstoque = [
  {
    id: 1,
    desenho: '-',
    pn: 'PN-TUB-7890',
    descricao: 'Tubo Aço Inox 316L 6" S...',
    fornecedor: 'Aperam South America',
    nf: 'NF-45830',
    qtdEntrada: '-',
    saldoQtd: '4',
    saldoUnd: 'Metro',
    alocacao: '400-A-003',
    valorUnit: 'R$ 890.00',
    wbs: 'WBS-PRJ-2024-001',
    status: 'disponível'
  },
  {
    id: 2,
    desenho: '-',
    pn: 'PN-FLG-1580',
    descricao: 'Flange Cego 4" ANSI 150',
    fornecedor: 'Conforminas',
    nf: 'NF-45822',
    qtdEntrada: '-',
    saldoQtd: '17',
    saldoUnd: 'Unid',
    alocacao: '300-C-012',
    valorUnit: 'R$ 380.50',
    wbs: 'WBS-PRJ-2024-001',
    status: 'disponível'
  },
  {
    id: 3,
    desenho: '-',
    pn: 'PN-JTA-2210',
    descricao: 'Junta Spiral Wound 4" CS',
    fornecedor: 'Teadit',
    nf: 'NF-45835',
    qtdEntrada: '-',
    saldoQtd: '78',
    saldoUnd: 'Unid',
    alocacao: '200-D-018',
    valorUnit: 'R$ 125.00',
    wbs: 'WBS-PRJ-2024-002',
    status: 'disponível'
  },
  {
    id: 4,
    desenho: '-',
    pn: 'PN-VLV-3420',
    descricao: 'Válvula Esfera 2" ANSI 3...',
    fornecedor: 'Flowserve Brasil',
    nf: 'NF-45821',
    qtdEntrada: '-',
    saldoQtd: '3',
    saldoUnd: 'Unid',
    alocacao: '300-B-006',
    valorUnit: 'R$ 1250.00',
    wbs: 'WBS-PRJ-2024-001',
    status: 'disponível'
  },
  {
    id: 5,
    desenho: '-',
    pn: 'PN-CHP-7780',
    descricao: 'Chapa Aço Inox 304 #12...',
    fornecedor: 'Usiminas',
    nf: 'NF-45860',
    qtdEntrada: '-',
    saldoQtd: '5',
    saldoUnd: 'Unid',
    alocacao: '600-A-002',
    valorUnit: 'R$ 3200.00',
    wbs: 'WBS-PRJ-2024-005',
    status: 'disponível'
  }
];

export default function EntradaEstoque() {
  return (
    <div className="estoque-wrapper">
      
      {/* --- CABEÇALHO DA PÁGINA --- */}
      <header className="estoque-cabecalho">
        <h1>Entrada de Estoque</h1>
        <p>Cadastro detalhado de itens — Back-Office Logística</p>
      </header>

      {/* --- CARTÃO 1: FORMULÁRIO DE CADASTRO --- */}
      <div className="estoque-cartao form-cartao">
        
        {/* Título do Cartão */}
        <div className="cartao-titulo-grupo">
          <div className="icone-fundo-azul">
            <PackagePlus size={20} className="icone-azul" />
          </div>
          <h2>Cadastro de Item</h2>
        </div>

        {/* Grelha do Formulário (CSS Grid) */}
        <div className="form-grid">
          
          {/* Linha 1 */}
          <div className="input-grupo">
            <label>Desenho SAP</label>
            <input type="text" placeholder="SAP-001" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Part Number <span className="obrigatorio">*</span></label>
            <input type="text" placeholder="PN-12345" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Descrição <span className="obrigatorio">*</span></label>
            <input type="text" placeholder="Descrição do item" className="input-campo" />
          </div>

          {/* Linha 2 */}
          <div className="input-grupo">
            <label>Fornecedor</label>
            <input type="text" placeholder="Nome do fornecedor" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>NF de Entrada</label>
            <input type="text" placeholder="NF-00001" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Qtd. de Entrada pela NF</label>
            <input type="number" placeholder="0" className="input-campo" />
          </div>

          {/* Linha 3 */}
          <div className="input-grupo">
            <label>Alocação</label>
            <input type="text" placeholder="300-B-006" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Valor Unitário (R$)</label>
            <input type="text" placeholder="0.00" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>WBS do Projeto <span className="obrigatorio">*</span></label>
            <input type="text" placeholder="WBS-2024-001" className="input-campo" />
          </div>

          {/* Linha 4 (Apenas 2 campos e espaço vazio para alinhar) */}
          <div className="input-grupo">
            <label>Saldo Atual <span className="obrigatorio">*</span></label>
            <input type="number" placeholder="0" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Unidade</label>
            <select className="input-campo select-campo">
              <option>Unid</option>
              <option>Metro</option>
              <option>Kg</option>
            </select>
          </div>
          
        </div>

        {/* Botão de Submissão alinhado à direita */}
        <div className="form-acoes">
          <button className="btn-primario">
            <PackagePlus size={18} />
            Cadastrar Item
          </button>
        </div>
      </div>

      {/* --- SECÇÃO 2: LISTAGEM E TABELA --- */}
      <div className="tabela-seccao">
        
        {/* Controlos de Pesquisa e Filtro */}
        <div className="tabela-controlos">
          <div className="pesquisa-caixa">
            <Search size={18} className="icone-controlo" />
            <input type="text" placeholder="Buscar por Desenho SAP, PN, Descrição, WBS..." />
          </div>
          
          <div className="filtro-caixa">
            <Filter size={18} className="icone-controlo" />
            <input type="text" placeholder="Filtrar por Nota Fiscal..." />
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="tabela-container">
          <table className="estoque-tabela">
            <thead>
              <tr>
                <th>DESENHO SAP</th>
                <th>PART NUMBER</th>
                <th>DESCRIÇÃO</th>
                <th>FORNECEDOR</th>
                <th>NF ENTRADA</th>
                <th>QTD. ENTRADA NF</th>
                <th>SALDO</th>
                <th>ALOCAÇÃO</th>
                <th>VALOR UNIT.</th>
                <th>WBS</th>
                <th>STATUS</th>
                <th></th> {/* Coluna para a lixeira */}
              </tr>
            </thead>
            <tbody>
              {dadosEstoque.map((item) => (
                <tr key={item.id}>
                  <td className="texto-cinza">{item.desenho}</td>
                  <td className="fonte-negrito">{item.pn}</td>
                  <td>{item.descricao}</td>
                  <td className="texto-cinza">{item.fornecedor}</td>
                  <td className="texto-cinza">{item.nf}</td>
                  <td className="texto-azul-claro font-bold">{item.qtdEntrada}</td>
                  
                  {/* Célula de Saldo (Número em negrito, unidade abaixo ou ao lado) */}
                  <td>
                    <div className="saldo-celula">
                      <strong>{item.saldoQtd}</strong>
                      <span>{item.saldoUnd}</span>
                    </div>
                  </td>
                  
                  <td><a href="#" className="link-azul">{item.alocacao}</a></td>
                  <td>{item.valorUnit}</td>
                  
                  {/* WBS com quebra de linha natural pelo espaço reduzido */}
                  <td className="wbs-celula">
                    <a href="#" className="link-azul">{item.wbs}</a>
                  </td>
                  
                  {/* Badge de Status */}
                  <td>
                    <span className="badge-disponivel">
                      <Package size={12} className="mr-1" />
                      {item.status}
                    </span>
                  </td>
                  
                  {/* Ação: Lixeira */}
                  <td className="acao-celula">
                    <button className="btn-icone">
                      <Trash2 size={18} />
                    </button>
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