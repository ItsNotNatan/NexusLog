import * as XLSX from 'xlsx';

/**
 * Processa o Excel em lotes para não congelar a tela e emitir o progresso.
 */
export const processarExcelComProgresso = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    onProgress({ fase: 'A ler ficheiro...', progresso: 10 });

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        onProgress({ fase: 'A abrir planilha...', progresso: 30 });
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        onProgress({ fase: 'Convertendo dados...', progresso: 50 });
        
        // ✨ LÊ A PLANILHA COMO UM ARRAY BIDIMENSIONAL PARA DESCOBRIR A LINHA DO CABEÇALHO
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (rawData.length === 0) {
          reject('A planilha está vazia.');
          return;
        }

        // Procura a linha que contém os cabeçalhos.
        let headerRowIndex = 0;
        let cabecalhos = [];
        
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
          const row = rawData[i];
          if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.toUpperCase().includes('SAP'))) {
            headerRowIndex = i;
            cabecalhos = row.map(c => c ? String(c).trim().toUpperCase() : '');
            break;
          }
        }

        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", blankrows: false, range: headerRowIndex });

        const totalLinhas = json.length;
        const itensValidos = [];
        const ignorados = [];
        const erros = [];

        let linhaAtual = 0;
        const tamanhoLote = 500;

        // ✨ FUNÇÃO MÁGICA: Procura o valor por várias palavras chave nos cabeçalhos lidos
        const obterValor = (linhaObj, palavrasChave) => {
          const chavesAtuais = Object.keys(linhaObj);
          for (const palavra of palavrasChave) {
            const chaveCerta = chavesAtuais.find(k => k.toUpperCase().trim().includes(palavra.toUpperCase()));
            if (chaveCerta && linhaObj[chaveCerta] !== undefined && linhaObj[chaveCerta] !== "") {
              return linhaObj[chaveCerta];
            }
          }
          return '-';
        };

        const processarLote = () => {
          const limite = Math.min(linhaAtual + tamanhoLote, totalLinhas);
          for (let i = linhaAtual; i < limite; i++) {
            const linha = json[i];

            // Pega os campos cruciais para validação
            const desenho = obterValor(linha, ['NUM SAP', 'DESENHO SAP', 'SAP']);
            const partNumber = obterValor(linha, ['FABRICANTE', 'Nº PEÇA', 'PART NUMBER', 'PN']);
            const desc = obterValor(linha, ['DESCRIÇÃO', 'DESCRICAO', 'MATERIAL DESCRIPTION']);

            if (partNumber === '-' && desenho === '-' && desc === '-') {
              ignorados.push(`Linha ${i + 2}: Vazia ou sem identificador principal.`);
              continue;
            }

            try {
              let qtdVal = obterValor(linha, ['QTDE ENTRADA', 'QTD', 'QUANTIDADE']);
              const qtd = (qtdVal !== '-' && !isNaN(Number(qtdVal))) ? Number(qtdVal) : 1;

              itensValidos.push({
                id: `excel-${Date.now()}-${i}`,
                desenhoSAP: desenho !== '-' ? desenho : '',
                materialDescription: desc !== '-' ? desc : '',
                vendorDescription: obterValor(linha, ['VENDOR DESCRIPTION']) !== '-' ? obterValor(linha, ['VENDOR DESCRIPTION']) : '',
                numPecaFabricante: partNumber !== '-' ? partNumber : '',
                fornecedor: obterValor(linha, ['FORNECEDOR']) !== '-' ? obterValor(linha, ['FORNECEDOR']) : '',
                qtdSelecionada: qtd,
                qtdFornecida: qtd, // Duplo mapeamento para cobrir Cliente e Logística
                referencia: obterValor(linha, ['REFERÊNCIA', 'REFERENCIA']) !== '-' ? obterValor(linha, ['REFERÊNCIA', 'REFERENCIA']) : '',
                unidadeMedida: obterValor(linha, ['UNID. MEDIDA', 'UNIDADE DE MEDIDA', 'UNID']) !== '-' ? obterValor(linha, ['UNID. MEDIDA', 'UNIDADE DE MEDIDA', 'UNID']) : 'Unid',
                wbs: obterValor(linha, ['CENTRO DE CUSTO - WBS', 'WBS ELEMENT', 'WBS']) !== '-' ? obterValor(linha, ['CENTRO DE CUSTO - WBS', 'WBS ELEMENT', 'WBS']) : '',
                nomeProjeto: obterValor(linha, ['NOME CENTRO DE CUSTO', 'PROJETO']) !== '-' ? obterValor(linha, ['NOME CENTRO DE CUSTO', 'PROJETO']) : '',
                nfEntrada: obterValor(linha, ['NUM DA NOTA FISCAL', 'NF DE ENTRADA', 'NOTA FISCAL']) !== '-' ? obterValor(linha, ['NUM DA NOTA FISCAL', 'NF DE ENTRADA', 'NOTA FISCAL']) : '',
                emissaoNF: obterValor(linha, ['EMISSÃO NF', 'EMISSAO']) !== '-' ? obterValor(linha, ['EMISSÃO NF', 'EMISSAO']) : '',
                recebNF: obterValor(linha, ['RECEB. NF', 'RECEBIMENTO']) !== '-' ? obterValor(linha, ['RECEB. NF', 'RECEBIMENTO']) : '',
                docCompras: obterValor(linha, ['PEDIDO DE COMPRA', 'CPV', 'COMPRAS', 'DOCUMENTO']) !== '-' ? obterValor(linha, ['PEDIDO DE COMPRA', 'CPV', 'COMPRAS', 'DOCUMENTO']) : '',
                poNetPrice: obterValor(linha, ['VLR. UNITÁRIO', 'VALOR UNITÁRIO', 'PO NET PRICE']) !== '-' ? obterValor(linha, ['VLR. UNITÁRIO', 'VALOR UNITÁRIO', 'PO NET PRICE']) : '',
                centro: obterValor(linha, ['FILIAL', 'CENTRO']) !== '-' ? obterValor(linha, ['FILIAL', 'CENTRO']) : '',
                deposito: obterValor(linha, ['DEPÓSITO', 'DEPOSITO']) !== '-' ? obterValor(linha, ['DEPÓSITO', 'DEPOSITO']) : '',
                alocacao: obterValor(linha, ['ALOCAÇÃO', 'ALOCACAO']) !== '-' ? obterValor(linha, ['ALOCAÇÃO', 'ALOCACAO']) : ''
              });
            } catch (err) {
              erros.push(`Linha ${i + 2}: Erro de formatação (${err.message})`);
            }
          }

          linhaAtual = limite;

          const progressoCalculado = 50 + Math.floor((linhaAtual / totalLinhas) * 50);
          onProgress({
            fase: `A processar linha ${linhaAtual} de ${totalLinhas}...`,
            progresso: progressoCalculado
          });

          if (linhaAtual < totalLinhas) {
            setTimeout(processarLote, 10);
          } else {
            resolve({
              itens: itensValidos,
              estatisticas: {
                totalLido: totalLinhas,
                sucesso: itensValidos.length,
                ignorados: ignorados.length,
                errosLista: erros
              }
            });
          }
        };

        setTimeout(processarLote, 50);
      } catch (error) {
        reject('Erro fatal ao processar o ficheiro Excel.');
      }
    };

    reader.onerror = () => reject('Erro de leitura do ficheiro.');
    reader.readAsBinaryString(file);
  });
};

/**
 * Função simplificada para ler o SAP diretamente, retornando apenas o array de itens.
 * Utilizada na página de Consulta de Estoque.
 */
export const lerRelatorioSAP = async (file) => {
  const resultado = await processarExcelComProgresso(file, () => { });
  return resultado.itens;
};