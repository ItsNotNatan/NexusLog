import React, { useState } from 'react';
import './EntradaEstoque.css';
import { 
  PackagePlus, 
  Search, 
  Filter, 
  Trash2,
  FileSpreadsheet
} from 'lucide-react';

// IMPORTAÇÕES PARA O EXCEL FUNCIONAR
import CarregarArquivo from '../../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../../hooks/useProcessadorExcel';
import ExemploExcel from '../../../components/ExemploExcel/ExemploExcel';

export default function EntradaEstoque() {
  // O estado começa como uma lista vazia []
  const [itensEstoque, setItensEstoque] = useState([]);
  const processador = useProcessadorExcel();

  // FUNÇÃO PARA LER E FORMATAR O EXCEL COM AS NOVAS COLUNAS
  const handleImportarExcel = async (arquivo) => {
    const novosItens = await processador.iniciarProcessamento(arquivo);
    
    if (novosItens && Array.isArray(novosItens)) {
      const itensFormatados = novosItens.map((item, index) => ({
        id: `excel-${Date.now()}-${index}`,
        numPecaFabricante: item['Nº peça fabricante'] || item.numPecaFabricante || '-',
        fornecedor: item['FORNECEDOR'] || item['Fornecedor'] || item.fornecedor || '-',
        qtdFornecida: item['Qtd.fornecida'] || item.qtdFornecida || '0',
        nfEntrada: item['NF DE ENTRADA'] || '-',
        unidadeMedida: item['Unidade de medida'] || item.unidadeMedida || 'Unid',
        vendorDescription: item['Vendor Description'] || item.vendorDescription || 'Sem descrição',
        wbsElement: item['WBS Element'] || item.wbs || '-',
        emissaoNF: item['EMISSÃO NF'] || item.emissaoNF || '-',
        recebNF: item['RECEB. NF'] || item.recebNF || '-',
        docCompras: item['Documento de compras'] || item.docCompras || '-',
        poNetPrice: item['PO Net Price'] || item.poNetPrice || 'R$ 0,00',
        centro: item['Centro'] || item.centro || '-',
        deposito: item['Depósito'] || item.deposito || '-',
        alocacao: item['Alocação'] || item.alocacao || '-'
      }));

      // Remove as linhas que estejam em branco antes de adicionar
      const listaLimpa = itensFormatados.filter(i => i.numPecaFabricante !== '-');
      setItensEstoque(prev => [...prev, ...listaLimpa]);
    }
  };

  // FUNÇÃO PARA APAGAR ITEM DA TABELA
  const removerItem = (idParaRemover) => {
    setItensEstoque(prev => prev.filter(item => item.id !== idParaRemover));
  };

  return (
    <div className="estoque-wrapper">
      
      {/* TELA DE CARREGAMENTO DO EXCEL (MODAL) */}
      <ModalProcessamento 
        estaProcessando={processador.estaProcessando}
        concluido={processador.concluido}
        estadoProgresso={processador.estadoProgresso}
        resultado={processador.resultado}
        erroFatal={processador.erroFatal}
        onClose={processador.resetarProcessador}
      />

      {/* --- CABEÇALHO DA PÁGINA --- */}
      <header className="estoque-cabecalho">
        <h1>Entrada de Estoque</h1>
        <p>Cadastro detalhado de itens — Back-Office Logística</p>
      </header>

      {/* --- CARTÃO 1: FORMULÁRIO DE CADASTRO --- */}
      <div className="estoque-cartao form-cartao">
        <div className="cartao-titulo-grupo">
          <div className="icone-fundo-azul">
            <PackagePlus size={20} className="icone-azul" />
          </div>
          <h2>Cadastro de Item Manual</h2>
        </div>

        <div className="form-grid">
          {/* Linha 1 */}
          <div className="input-grupo">
            <label>Nº Peça Fabricante <span className="obrigatorio">*</span></label>
            <input type="text" placeholder="PN-12345" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Fornecedor</label>
            <input type="text" placeholder="Nome do fornecedor" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Vendor Description <span className="obrigatorio">*</span></label>
            <input type="text" placeholder="Descrição do item" className="input-campo" />
          </div>

          {/* Linha 2 */}
          <div className="input-grupo">
            <label>Qtd. Fornecida <span className="obrigatorio">*</span></label>
            <input type="number" placeholder="0" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>NF de Entrada</label>
            <input type="text" placeholder="NF-00001" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Unidade de Medida</label>
            <select className="input-campo select-campo">
              <option>Unid</option>
              <option>Metro</option>
              <option>Kg</option>
              <option>Caixa</option>
              <option>Litro</option>
            </select>
          </div>

          {/* Linha 3 */}
          <div className="input-grupo">
            <label>WBS Element <span className="obrigatorio">*</span></label>
            <input type="text" placeholder="WBS-2024-001" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Emissão NF</label>
            <input type="date" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Receb. NF</label>
            <input type="date" className="input-campo" />
          </div>

          {/* Linha 4 */}
          <div className="input-grupo">
            <label>Documento de Compras</label>
            <input type="text" placeholder="DOC-999" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>PO Net Price (R$)</label>
            <input type="text" placeholder="0,00" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Alocação</label>
            <input type="text" placeholder="300-B-006" className="input-campo" />
          </div>

          {/* Linha 5 (Centros e Depósito) */}
          <div className="input-grupo">
            <label>Centro</label>
            <input type="text" placeholder="BR01" className="input-campo" />
          </div>
          <div className="input-grupo">
            <label>Depósito</label>
            <input type="text" placeholder="0010" className="input-campo" />
          </div>
        </div>

        <div className="form-acoes">
          <button className="btn-primario">
            <PackagePlus size={18} />
            Cadastrar Item
          </button>
        </div>
      </div>

      {/* --- SECÇÃO 2: LISTAGEM E TABELA --- */}
      <div className="tabela-seccao">
        
        <div className="tabela-controlos">
          <div className="pesquisa-caixa">
            <Search size={18} className="icone-controlo" />
            <input type="text" placeholder="Buscar por PN, Descrição, WBS..." />
          </div>
          
          <div className="filtro-caixa">
            <Filter size={18} className="icone-controlo" />
            <input type="text" placeholder="Filtrar por Nota Fiscal..." />
          </div>
          <ExemploExcel />

          <CarregarArquivo 
            variante="botao"
            accept=".xlsx, .xls"
            label="Importar Excel SAP"
            icone={<FileSpreadsheet size={18} color="#10b981" />}
            onFileSelect={handleImportarExcel}
          />
        </div>

        {/* TABELA DE DADOS ATUALIZADA */}
        <div className="tabela-container">
          <table className="estoque-tabela">
            <thead>
              <tr>
                <th>Nº PEÇA FABRICANTE</th>
                <th>FORNECEDOR</th>
                <th>QTD. FORNECIDA</th>
                <th>NF DE ENTRADA</th>
                <th>UNIDADE</th>
                <th style={{ minWidth: '200px' }}>VENDOR DESCRIPTION</th>
                <th>WBS ELEMENT</th>
                <th>EMISSÃO NF</th>
                <th>RECEB. NF</th>
                <th>DOC. DE COMPRAS</th>
                <th>PO NET PRICE</th>
                <th>CENTRO</th>
                <th>DEPÓSITO</th>
                <th>ALOCAÇÃO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itensEstoque.length === 0 ? (
                <tr>
                  {/* 👇 Reduzi o colSpan de 16 para 15 porque tirámos uma coluna */}
                  <td colSpan="15" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Nenhum item na entrada de estoque. Importe um Excel ou cadastre manualmente.
                  </td>
                </tr>
              ) : (
                itensEstoque.map((item) => (
                  <tr key={item.id}>
                    <td className="fonte-negrito">{item.numPecaFabricante}</td>
                    <td className="texto-cinza">{item.fornecedor}</td>
                    <td className="texto-azul-claro font-bold">{item.qtdFornecida}</td>
                    <td className="texto-cinza">{item.nfEntrada}</td>
                    <td className="texto-cinza">{item.unidadeMedida}</td>
                    <td>{item.vendorDescription}</td>
                    <td className="wbs-celula"><a href="#" className="link-azul">{item.wbsElement}</a></td>
                    <td className="texto-cinza">{item.emissaoNF}</td>
                    <td className="texto-cinza">{item.recebNF}</td>
                    <td className="texto-cinza">{item.docCompras}</td>
                    <td>{item.poNetPrice}</td>
                    <td className="texto-cinza">{item.centro}</td>
                    <td className="texto-cinza">{item.deposito}</td>
                    <td><a href="#" className="link-azul">{item.alocacao}</a></td>
                    <td className="acao-celula">
                      <button className="btn-icone" onClick={() => removerItem(item.id)}>
                        <Trash2 size={18} />
                      </button>
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