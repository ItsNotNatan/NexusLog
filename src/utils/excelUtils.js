import * as XLSX from 'xlsx';

/**
 * Lê um ficheiro Excel e converte as linhas para itens do sistema.
 * USADO NA TELA: Fazer Solicitação -> Material de Estoque
 * @param {File} file - O ficheiro Excel (.xlsx, .xls) recebido do input.
 * @returns {Promise<Array>} - Retorna os itens formatados para o painel lateral direito.
 */
export const lerExcelParaItens = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // 1. GARANTIA DA ABA: Pega a segunda aba (índice 1). Se não existir, tenta a primeira (índice 0).
        const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 2. CONVERSÃO: blankrows: false ajuda a ignorar linhas 100% vazias
        const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: false });

        // 3. FILTRO E MAPEAMENTO: Só processa a linha se tiver um Part Number ou uma Descrição
        const itensMapeados = json
          .filter(linha => (linha['Nº peça fabricante'] || linha['DESENHO SAP'] || linha['Material Description']))
          .map((linha, index) => ({
            id: `excel-${Date.now()}-${index}`,
            pn: linha['Nº peça fabricante'] || linha['DESENHO SAP'] || 'Desconhecido',
            desc: linha['Material Description'] || 'Sem descrição',
            qtdSelecionada: Number(linha['Qtd.fornecida']) || 1,
            alocacao: linha['Alocação'] || 'Não definida',
            wbs: linha['WBS'] || '',
            saldo: 'Consultar BD' 
          }));

        resolve(itensMapeados);
      } catch (error) {
        reject('Erro ao processar o ficheiro Excel. Verifique se o formato está correto.');
      }
    };

    reader.onerror = () => {
      reject('Erro de leitura do ficheiro.');
    };

    // Inicia a leitura do ficheiro
    reader.readAsBinaryString(file);
  });
};


/**
 * Lê o relatório gerado pelo SAP e converte para a tabela completa do sistema.
 * USADO NA TELA: Consulta de Estoque
 * @param {File} file - Ficheiro Excel do SAP
 * @returns {Promise<Array>} - Retorna os itens detalhados com todas as colunas do SAP.
 */
export const lerRelatorioSAP = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // 1. GARANTIA DA ABA: Pega a segunda aba (índice 1).
        const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[sheetName];
        
        // 2. CONVERSÃO: defval: "" garante que células que não existem fiquem como texto vazio
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", blankrows: false });

        // 3. FILTRO E MAPEAMENTO PARA O ESTOQUE
        const itensMapeados = json
          .filter(linha => (linha['Nº peça fabricante'] || linha['DESENHO SAP'] || linha['Material Description']))
          .map((linha, index) => {
            
            // Garante que a quantidade é tratada como número para definirmos o status
            const qtd = Number(linha['Qtd.fornecida']) || 0;
            
            return {
              id: `sap-${Date.now()}-${index}`,
              desenhoSAP: linha['DESENHO SAP'] || '-',
              materialDescription: linha['Material Description'] || 'Sem descrição',
              numPecaFabricante: linha['Nº peça fabricante'] || '-',
              fornecedor: linha['Fornecedor'] || '-',
              qtdFornecida: qtd.toString(),
              referencia: linha['Referência'] || '-',
              unidadeMedida: linha['Unidade de medida'] || '-',
              vendorDescription: linha['Vendor Description'] || '-',
              wbs: linha['WBS'] || '-',
              emissaoNF: linha['EMISSÃO NF'] || '-',
              recebNF: linha['RECEB. NF'] || '-',
              docCompras: linha['Documento de compras'] || '-',
              // Formatação segura de moeda
              poNetPrice: linha['PO Net Price'] ? (String(linha['PO Net Price']).includes('R$') ? linha['PO Net Price'] : `R$ ${linha['PO Net Price']}`) : 'R$ 0,00',
              centro: linha['Centro'] || '-',
              deposito: linha['Depósito'] || '-',
              alocacao: linha['Alocação'] || '-',
              status: qtd > 0 ? 'Disponível' : 'Zerado'
            };
        });

        resolve(itensMapeados);
      } catch (error) {
        reject('Erro ao processar o ficheiro Excel. Certifique-se de que a segunda aba possui as colunas corretas do SAP.');
      }
    };

    reader.onerror = () => {
      reject('Erro de leitura do ficheiro.');
    };

    // Inicia a leitura do ficheiro
    reader.readAsBinaryString(file);
  });
};