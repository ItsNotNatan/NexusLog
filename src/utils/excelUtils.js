import * as XLSX from 'xlsx';

/**
 * Lê um ficheiro Excel e converte as linhas para itens do sistema.
 * USADO NA TELA: Fazer Solicitação -> Material de Estoque
 * @param {File} file - Ficheiro Excel (.xlsx, .xls) do SAP
 */
export const lerExcelParaItens = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Pega a segunda aba (índice 1)
        const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", blankrows: false });

        // FILTRO E MAPEAMENTO COMPLETO DAS 15 COLUNAS DO SAP
        const itensMapeados = json
          .filter(linha => (linha['Nº peça fabricante'] || linha['DESENHO SAP'] || linha['Material Description']))
          .map((linha, index) => {
            const qtd = Number(linha['Qtd.fornecida']) || 1;
            return {
              id: `excel-${Date.now()}-${index}`,
              desenhoSAP: linha['DESENHO SAP'] || '-',
              materialDescription: linha['Material Description'] || 'Sem descrição',
              numPecaFabricante: linha['Nº peça fabricante'] || '-',
              fornecedor: linha['Fornecedor'] || '-',
              qtdSelecionada: qtd,
              referencia: linha['Referência'] || '-',
              unidadeMedida: linha['Unidade de medida'] || '-',
              vendorDescription: linha['Vendor Description'] || '-',
              wbs: linha['WBS'] || '-',
              emissaoNF: linha['EMISSÃO NF'] || '-',
              recebNF: linha['RECEB. NF'] || '-',
              docCompras: linha['Documento de compras'] || '-',
              poNetPrice: linha['PO Net Price'] ? (String(linha['PO Net Price']).includes('R$') ? linha['PO Net Price'] : `R$ ${linha['PO Net Price']}`) : 'R$ 0,00',
              centro: linha['Centro'] || '-',
              deposito: linha['Depósito'] || '-',
              alocacao: linha['Alocação'] || '-'
            };
          });

        resolve(itensMapeados);
      } catch (error) {
        reject('Erro ao processar o ficheiro Excel. Verifique o formato.');
      }
    };

    reader.onerror = () => reject('Erro de leitura do ficheiro.');
    reader.readAsBinaryString(file);
  });
};

/**
 * Lê o relatório gerado pelo SAP e converte para a tabela de Consulta de Estoque.
 */
export const lerRelatorioSAP = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[sheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", blankrows: false });

        const itensMapeados = json
          .filter(linha => (linha['Nº peça fabricante'] || linha['DESENHO SAP'] || linha['Material Description']))
          .map((linha, index) => {
            const qtd = Number(linha['Qtd.fornecida']) || 0;
            return {
              id: `sap-${Date.now()}-${index}`,
              desenhoSAP: linha['DESENHO SAP'] || '-',
              materialDescription: linha['Material Description'] || 'Sem descrição',
              numPecaFabricante: linha['Nº peça fabricante'] || '-',
              fornecedor: linha['Fornecedor'] || '-',
              qtdFornecida: qtd.toString(),
              referencia: inline['Referência'] || '-',
              unidadeMedida: linha['Unidade de medida'] || '-',
              vendorDescription: linha['Vendor Description'] || '-',
              wbs: linha['WBS'] || '-',
              emissaoNF: linha['EMISSÃO NF'] || '-',
              recebNF: linha['RECEB. NF'] || '-',
              docCompras: linha['Documento de compras'] || '-',
              poNetPrice: linha['PO Net Price'] ? (String(linha['PO Net Price']).includes('R$') ? linha['PO Net Price'] : `R$ ${linha['PO Net Price']}`) : 'R$ 0,00',
              centro: linha['Centro'] || '-',
              deposito: linha['Depósito'] || '-',
              alocacao: linha['Alocação'] || '-',
              status: qtd > 0 ? 'Disponível' : 'Zerado'
            };
          });

        resolve(itensMapeados);
      } catch (error) {
        reject('Erro ao processar o ficheiro Excel.');
      }
    };

    reader.onerror = () => reject('Erro de leitura do ficheiro.');
    reader.readAsBinaryString(file);
  });
};