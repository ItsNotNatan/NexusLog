// =================================================================
// ARQUIVO: src/services/backupExcelService.js
// DESCRIÇÃO: Serviço responsável por exportar os dados do sistema
// para um ficheiro Excel, criando uma aba (worksheet) para cada filial.
// =================================================================

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const db = require('../db'); // Importamos a conexão com o banco de dados

/**
 * Função principal que gera o backup em Excel com múltiplas abas.
 */
async function gerarBackupExcel() {
  try {
    console.log('\n📊 [BACKUP EXCEL] Iniciando a geração do backup distribuído por filiais...');
    
    // PASSO 1: Criação de um novo "Livro" de Excel (O ficheiro único)
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NexusLog Auto-Backup';
    workbook.created = new Date();

    // PASSO 2: Buscar as filiais e o stock à base de dados
    // Utilizamos a função listar do db.js para ir buscar tudo
    const filiais = await db.listar('filiais');
    const estoque = await db.listar('estoque');

    // --- FUNÇÃO AUXILIAR ---
    // Cria as 17 colunas e aplica o estilo (fundo azul, texto branco)
    const configurarCabecalho = (sheet) => {
      sheet.columns = [
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

      const linhaCabecalho = sheet.getRow(1);
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
    };

    // --- FUNÇÃO AUXILIAR ---
    // Adiciona uma linha de dados na aba fornecida
    const adicionarItemNaAba = (sheet, item) => {
      sheet.addRow({
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
    };

    // PASSO 3: Lógica de Distribuição por Abas
    if (!filiais || filiais.length === 0) {
      // Se não existirem filiais, criamos uma aba única por segurança
      console.log('⚠️ [BACKUP EXCEL] Nenhuma filial encontrada. A gerar aba única "Estoque Geral".');
      const sheetGeral = workbook.addWorksheet('Estoque Geral');
      configurarCabecalho(sheetGeral);
      estoque.forEach(item => adicionarItemNaAba(sheetGeral, item));
    } else {
      // Para cada filial, criamos uma aba nova
      for (const filial of filiais) {
        const codigoFilial = filial.codigo || filial.id; 
        
        // workbook.addWorksheet cria a aba. Limitamos a 31 caracteres para evitar erros no Excel
        const nomeAba = `Estoque ${codigoFilial}`.substring(0, 31);
        const sheetFilial = workbook.addWorksheet(nomeAba);
        
        configurarCabecalho(sheetFilial);

        // Filtramos os itens e adicionamos apenas os que pertencem a esta filial
        const itensDestaFilial = estoque.filter(item => item.filial_id === codigoFilial);
        itensDestaFilial.forEach(item => adicionarItemNaAba(sheetFilial, item));
      }

      // PASSO 4: Segurança para itens órfãos (sem filial registada)
      const itensSemFilial = estoque.filter(item => !item.filial_id || item.filial_id.trim() === '');
      if (itensSemFilial.length > 0) {
        console.log(`⚠️ [BACKUP EXCEL] Encontrados ${itensSemFilial.length} itens sem filial atribuída.`);
        const sheetSemFilial = workbook.addWorksheet('Sem Filial');
        configurarCabecalho(sheetSemFilial);
        itensSemFilial.forEach(item => adicionarItemNaAba(sheetSemFilial, item));
      }
    }

    // PASSO 5: Salvar o ficheiro
    // Vai criar uma pasta "BackupsExcel" dentro da pasta "Servidor"
    const pastaDestino = path.join(__dirname, '../../BackupsExcel');
    if (!fs.existsSync(pastaDestino)) {
      fs.mkdirSync(pastaDestino, { recursive: true });
    }

    const dataAtual = new Date();
    const dataFormatada = dataAtual.toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
    const nomeArquivo = `Backup_NexusLog_${dataFormatada}.xlsx`;
    const caminhoCompleto = path.join(pastaDestino, nomeArquivo);

    await workbook.xlsx.writeFile(caminhoCompleto);
    
    console.log(`✅ [BACKUP EXCEL] Concluído! Guardado em: ${caminhoCompleto}\n`);

  } catch (error) {
    console.error('❌ [BACKUP EXCEL] Erro ao gerar o Excel:', error.message);
  }
}

module.exports = { gerarBackupExcel };
