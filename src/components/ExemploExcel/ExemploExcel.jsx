import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import './ExemploExcel.css'; 

export default function ExemploExcel() {
  const baixarModelo = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Modelo SAP');

      // ✨ COLUNAS ATUALIZADAS (Com Desenho SAP e Referência)
      const colunas = [
        'Desenho SAP',
        'Nº peça fabricante',
        'FORNECEDOR',
        'REFERÊNCIA', // ✨ Nova coluna adicionada
        'Qtd.fornecida',
        'NF DE ENTRADA',
        'Unidade de medida',
        'Vendor Description',
        'WBS Element',
        'EMISSÃO NF',
        'RECEB. NF',
        'Documento de compras',
        'PO Net Price',
        'Centro',
        'Depósito',
        'Alocação'
      ];

      worksheet.columns = colunas.map(col => ({ header: col, key: col, width: 20 }));

      const linhaCabecalho = worksheet.getRow(1);
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

      // ✨ EXEMPLO PREENCHIDO COM A NOVA COLUNA
      worksheet.addRow({
        'Desenho SAP': 'DS-778899',
        'Nº peça fabricante': 'PN-12345',
        'FORNECEDOR': 'Fornecedor A',
        'REFERÊNCIA': 'REF-9988', // ✨ Exemplo de referência
        'Qtd.fornecida': 10,
        'NF DE ENTRADA': 'NF-001',
        'Unidade de medida': 'Unid',
        'Vendor Description': 'Desc Vendor',
        'WBS Element': 'WBS-EX-001',
        'EMISSÃO NF': '01/01/2026',
        'RECEB. NF': '05/01/2026',
        'Documento de compras': 'DOC-999',
        'PO Net Price': 'R$ 100,00',
        'Centro': 'BR01',
        'Depósito': '0010',
        'Alocação': 'A-01'
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, "Modelo_Importacao_SAP.xlsx");

    } catch (error) {
      console.error("Erro ao gerar o Excel:", error);
      alert("Houve um problema ao gerar o modelo Excel.");
    }
  };

  return (
    <button className="btn-exemplo-excel" onClick={baixarModelo} type="button">
      <Download size={16} />
      Baixar Modelo
    </button>
  );
}