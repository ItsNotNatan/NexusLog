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

      // ✨ COLUNAS EXATAMENTE NA ORDEM E NOME REQUERIDOS
      const colunas = [
        'NUM SAP | DESENHO',
        'REFERÊNCIA',
        'DESCRIÇÃO',
        'FABRICANTE',
        'QTDE ENTRADA',
        'UNID. MEDIDA',
        'NUM DA NOTA FISCAL',
        'FORNECEDOR / REGISTRO',
        'CENTRO DE CUSTO - WBS',
        'NOME CENTRO DE CUSTO / PROJETO',
        'EMISSÃO NF',
        'RECEB. NF',
        'Nº PEDIDO DE COMPRA / CPV',
        'VLR. UNITÁRIO NOTA FISCAL',
        'FILIAL',
        'DEPÓSITO',
        'ALOCAÇÃO'
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

      // ✨ EXEMPLO PREENCHIDO COM A NOVA COLUNA E NOVA ESTRUTURA
      worksheet.addRow({
        'NUM SAP | DESENHO': 'DS-778899',
        'REFERÊNCIA': 'REF-9988', 
        'DESCRIÇÃO': 'Desc Vendor Exemplo',
        'FABRICANTE': 'PN-12345',
        'QTDE ENTRADA': 10,
        'UNID. MEDIDA': 'Unid',
        'NUM DA NOTA FISCAL': 'NF-001',
        'FORNECEDOR / REGISTRO': 'Fornecedor A',
        'CENTRO DE CUSTO - WBS': 'WBS-EX-001',
        'NOME CENTRO DE CUSTO / PROJETO': 'Projeto Stellantis',
        'EMISSÃO NF': '01/01/2026',
        'RECEB. NF': '05/01/2026',
        'Nº PEDIDO DE COMPRA / CPV': 'DOC-999',
        'VLR. UNITÁRIO NOTA FISCAL': 'R$ 100,00',
        'FILIAL': 'BR01',
        'DEPÓSITO': '0010',
        'ALOCAÇÃO': 'A-01'
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