import * as XLSX from 'xlsx';

/**
 * Lê um ficheiro Excel e converte as linhas para itens do sistema.
 * @param {File} file - O ficheiro Excel (.xlsx, .xls) recebido do input.
 * @returns {Promise<Array>} - Retorna os itens formatados.
 */
export const lerExcelParaItens = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Pega a primeira aba da planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converte a aba para JSON (array de objetos)
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Mapeia as colunas do Excel para as chaves que o nosso sistema usa.
        // O utilizador pode ter colunas chamadas "PN", "Part Number", "Quantidade", etc.
        const itensMapeados = json.map((linha, index) => ({
          id: `excel-${Date.now()}-${index}`,
          pn: linha['PN'] || linha['Part Number'] || linha['PART NUMBER'] || 'Desconhecido',
          desc: linha['Descrição'] || linha['Descricao'] || linha['DESCRIÇÃO'] || 'Item importado via planilha',
          qtdSelecionada: linha['Quantidade'] || linha['QTD'] || linha['Qtd'] || 1,
          saldo: 'Consultar', // Como veio do Excel, o saldo exato tem de ser verificado no backend depois
          alocacao: 'Importado'
        }));

        resolve(itensMapeados);
      } catch (error) {
        reject('Erro ao processar o ficheiro Excel. Verifique o formato.');
      }
    };

    reader.onerror = (error) => {
      reject('Erro de leitura do ficheiro.');
    };

    // Inicia a leitura do ficheiro
    reader.readAsBinaryString(file);
  });
};