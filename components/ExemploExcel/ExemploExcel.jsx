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

      // ✨ COLUNAS DEFINIDAS COM A NOVA ORDEM SOLICITADA
      worksheet.columns = [
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

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, "Modelo_Importacao_Estoque.xlsx");

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
