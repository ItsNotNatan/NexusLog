// =================================================================
// ARQUIVO: src/services/backupExcelService.js
// DESCRIÇÃO: Serviço responsável por exportar os dados do sistema
// para um ficheiro Excel e guardá-lo como backup automaticamente.
// =================================================================

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const db = require('../db');

/**
 * Função principal que gera o backup em Excel.
 * Consulta as tabelas do PocketBase e escreve num ficheiro .xlsx com 
 * o formato exato do modelo de importação do sistema.
 */
async function gerarBackupExcel() {
  try {
    console.log('\n📊 [BACKUP EXCEL] Iniciando a geração do backup automático...');
    
    // 1. Criação de um novo "Livro" de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NexusLog Auto-Backup';
    workbook.created = new Date();

    // 2. Adicionar uma "Folha" para o Estoque
    const sheetEstoque = workbook.addWorksheet('Estoque Atual');
    
    // ✨ COLUNAS DEFINIDAS EXATAMENTE COMO NO MODELO DO FRONTEND
    sheetEstoque.columns = [
      { header: 'NUM SAP | DESENHO', key: 'sap', width: 20 },
      { header: 'DESCRIÇÃO', key: 'desc', width: 40 },
      { header: 'FABRICANTE', key: 'pn', width: 25 },
      { header: 'QTDE ENTRADA', key: 'qtd', width: 15 },
      { header: 'REFERÊNCIA', key: 'ref', width: 20 },
      { header: 'UNID. MEDIDA', key: 'unid', width: 15 },
      { header: 'NUM DA NOTA FISCAL', key: 'nf', width: 20 },
      { header: 'FORNECEDOR / REGISTRO', key: 'fornecedor', width: 25 },
      { header: 'CENTRO DE CUSTO - WBS', key: 'wbs', width: 25 },
      { header: 'NOME CENTRO DE CUSTO / PROJETO', key: 'projeto', width: 35 },
      { header: 'EMISSÃO NF', key: 'emi', width: 15 },
      { header: 'RECEB. NF', key: 'rec', width: 15 },
      { header: 'Nº PEDIDO DE COMPRA / CPV', key: 'doc', width: 25 },
      { header: 'VLR. UNITÁRIO NOTA FISCAL', key: 'val', width: 25 },
      { header: 'FILIAL', key: 'filial', width: 15 },
      { header: 'DEPÓSITO', key: 'dep', width: 15 },
      { header: 'ALOCAÇÃO', key: 'aloc', width: 20 }
    ];

    // Estilizar o cabeçalho idêntico ao modelo (fundo azul, texto branco)
    const linhaCabecalho = sheetEstoque.getRow(1);
    linhaCabecalho.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    linhaCabecalho.height = 25;

    // 3. Buscar os dados na base de dados
    const estoque = await db.listar('estoque');

    // 4. Inserir os dados linha a linha no Excel
    // Estamos a mapear as chaves que definimos nas colunas acima (sap, desc, pn, etc.)
    // com as propriedades reais que vêm da base de dados.
    estoque.forEach(item => {
      sheetEstoque.addRow({
        sap: item.desenho_sap || '-',
        desc: item.descricao || '-',
        pn: item.part_number || '-',
        qtd: item.quantidade_disponivel || 0,
        ref: item.referencia || '-',
        unid: item.unidade_medida || 'Unid',
        nf: item.nf_entrada || '-',
        fornecedor: item.fornecedor || '-',
        wbs: item.wbs || '-',
        projeto: item.nome_projeto || '-',
        emi: item.emissao_nf || '-',
        rec: item.receb_nf || '-',
        doc: item.documento_compras || '-',
        val: item.valor_unitario || 0,
        filial: item.filial_id || '-',
        dep: item.deposito || '-',
        aloc: item.alocacao || '-'
      });
    });

    // 5. Configurar a pasta onde os backups vão ficar guardados
    const pastaDestino = path.join(__dirname, '../../BackupsExcel');
    
    // Se a pasta não existir, o Node.js cria-a automaticamente
    if (!fs.existsSync(pastaDestino)) {
      fs.mkdirSync(pastaDestino, { recursive: true });
    }

    // 6. Gerar o nome do ficheiro com a data e hora atual
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
    const nomeArquivo = `Backup_NexusLog_${dataFormatada}.xlsx`;
    const caminhoCompleto = path.join(pastaDestino, nomeArquivo);

    // 7. Escrever o ficheiro no disco
    await workbook.xlsx.writeFile(caminhoCompleto);
    
    console.log(`✅ [BACKUP EXCEL] Concluído com sucesso! Guardado em: ${caminhoCompleto}\n`);

  } catch (error) {
    console.error('❌ [BACKUP EXCEL] Ocorreu um erro ao gerar o Excel:', error);
  }
}

module.exports = { gerarBackupExcel };
