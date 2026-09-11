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
 * Consulta as tabelas do PocketBase e escreve num ficheiro .xlsx.
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
    
    // Definir as colunas (cabeçalhos) e larguras
    sheetEstoque.columns = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'DESENHO SAP', key: 'sap', width: 20 },
      { header: 'PART NUMBER', key: 'pn', width: 20 },
      { header: 'DESCRIÇÃO', key: 'desc', width: 40 },
      { header: 'SALDO', key: 'saldo', width: 15 },
      { header: 'FILIAL', key: 'filial', width: 15 },
    ];

    // Estilizar o cabeçalho (fundo azul, texto branco)
    sheetEstoque.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetEstoque.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    // 3. Buscar os dados na base de dados
    // Utilizamos a função listar do teu db.js para ir buscar tudo
    const estoque = await db.listar('estoque');

    // 4. Inserir os dados linha a linha no Excel
    estoque.forEach(item => {
      sheetEstoque.addRow({
        id: item.id,
        sap: item.desenho_sap || '-',
        pn: item.part_number || '-',
        desc: item.descricao || '-',
        saldo: item.quantidade_disponivel || 0,
        filial: item.filial_id || '-',
      });
    });

    // 5. Configurar a pasta onde os backups vão ficar guardados
    // Vai criar uma pasta "BackupsExcel" dentro da pasta "Servidor"
    const pastaDestino = path.join(__dirname, '../../BackupsExcel');
    
    // Se a pasta não existir, o Node.js cria-a automaticamente
    if (!fs.existsSync(pastaDestino)) {
      fs.mkdirSync(pastaDestino, { recursive: true });
    }

    // 6. Gerar o nome do ficheiro com a data e hora atual
    // Exemplo: Backup_NexusLog_2026-09-11_08-30.xlsx
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
