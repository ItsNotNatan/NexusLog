import React, { useState } from 'react';
import { FileText } from 'lucide-react';

// Importações do pdfmake
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Importação apenas do logo
import logoComau from '../../assets/logo-comau.png';

try {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} catch (e) {
  console.error("Erro ao carregar fontes do PDF:", e);
}

export default function BotaoGerarPDF({ linha, nomeFilial, showAlert }) {
  const [gerando, setGerando] = useState(false);

  if (!linha) return null;

  // Função auxiliar para converter imagens em Base64
  const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
      var img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(this, 0, 0);
        var dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  };

  const handleGerarPdf = async (e) => {
    e.stopPropagation(); // Impede a expansão da linha na tabela
    setGerando(true);
    
    if (showAlert) {
      showAlert("Gerando PDF...", "O Boletim será aberto num novo separador dentro de instantes.", "info");
    }

    try {
      // Carregar a imagem do logo em Base64
      const [logoBase64] = await Promise.all([
        getBase64ImageFromURL(logoComau).catch(() => null)
      ]);

      // Monta as linhas da tabela de itens
      const linhasItens = (linha.itens && linha.itens.length > 0)
        ? linha.itens.map((it, idx) => [
            { text: it.desenho_sap_manual || '-', margin: [0, 4], color: '#475569' },
            { text: it.part_number_manual || '-', margin: [0, 4], bold: true, color: '#1e293b' },
            { text: it.descricao_manual || '-', margin: [0, 4] },
            { text: `${it.quantidade_solicitada} ${it.unidade_medida_manual || 'Un'}`, alignment: 'center', margin: [0, 4], bold: true, color: '#2563eb' }
          ])
        : [[{ text: 'Nenhum item individual especificado na solicitação.', colSpan: 4, alignment: 'center', margin: [0, 10], color: '#94a3b8' }, {}, {}, {}]];

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 30, 40, 30], 
        content: [
          
          // ==========================================
          // CABEÇALHO DO DOCUMENTO
          // ==========================================
          logoBase64 ? {
            image: logoBase64,
            width: 85,
            alignment: 'center',
            margin: [0, 0, 0, 8] 
          } : { 
            text: 'STOCKLog', 
            style: 'headerMain', 
            color: '#2563eb', 
            margin: [0, 0, 0, 5] 
          },
          { text: `BOLETIM DE PACKING LIST / ${linha.tipo ? linha.tipo.toUpperCase() : 'DOCUMENTO'}`, style: 'headerSub' },
          { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 515, y2: 3, lineWidth: 1.5, lineColor: '#2563eb' }] },
          
          // ==========================================
          // NÚMEROS E IDENTIFICAÇÃO BÁSICA
          // ==========================================
          {
            margin: [0, 15, 0, 15],
            columns: [
              { text: [{ text: 'Nº PL: ', bold: true, color: '#1e293b' }, { text: linha.pl || 'N/A', color: '#2563eb', fontSize: 14, bold: true }] },
              { text: [{ text: 'Identificador (PS): ', bold: true, color: '#1e293b' }, `${linha.prefixo}:${linha.id}`], alignment: 'right' }
            ]
          },

          // ==========================================
          // DADOS DA SOLICITAÇÃO
          // ==========================================
          {
            table: { widths: ['*'], body: [[{ text: 'INFORMAÇÕES DA SOLICITAÇÃO', style: 'sectionTitle', fillColor: '#f1f5f9' }]] },
            layout: 'noBorders',
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: [150, '*'],
              body: [
                [{ text: 'Solicitante:', bold: true, margin: [0, 4] }, { text: linha.solicitante || 'N/A', margin: [0, 4] }],
                [{ text: 'WBS / Destino:', bold: true, margin: [0, 4] }, { text: linha.wbs || 'N/A', margin: [0, 4] }],
                [{ text: 'Filial / Base:', bold: true, margin: [0, 4] }, { text: nomeFilial || 'N/A', margin: [0, 4] }],
                [{ text: 'Data do Registo:', bold: true, margin: [0, 4] }, { text: linha.dataSolicitacao || 'N/A', margin: [0, 4] }],
                [{ text: 'Tipo Operação:', bold: true, margin: [0, 4] }, { text: linha.tipo || 'N/A', margin: [0, 4] }]
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
          },

          // ==========================================
          // TABELA DE ITENS
          // ==========================================
          {
            table: { widths: ['*'], body: [[{ text: `ITENS DA SOLICITAÇÃO`, style: 'sectionTitle', fillColor: '#f1f5f9' }]] },
            layout: 'noBorders',
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['auto', 'auto', '*', 60],
              headerRows: 1,
              body: [
                [
                  { text: 'Desenho SAP', bold: true, fillColor: '#f8fafc', margin: [0, 6], color: '#475569' },
                  { text: 'Part Number', bold: true, fillColor: '#f8fafc', margin: [0, 6], color: '#475569' },
                  { text: 'Descrição do Material', bold: true, fillColor: '#f8fafc', margin: [0, 6], color: '#475569' },
                  { text: 'Qtd.', bold: true, alignment: 'center', fillColor: '#f8fafc', margin: [0, 6], color: '#475569' }
                ],
                ...linhasItens
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // ==========================================
          // OBSERVAÇÕES
          // ==========================================
          linha.observacoes ? {
            table: { widths: ['*'], body: [[{ text: 'OBSERVAÇÕES / JUSTIFICATIVA', style: 'sectionTitle', fillColor: '#fefce8', color: '#b45309' }]] },
            layout: 'noBorders',
            margin: [0, 0, 0, 4]
          } : {},
          linha.observacoes ? {
            table: { widths: ['*'], body: [[{ text: linha.observacoes, margin: [5, 4, 5, 4], color: '#78350f' }]] },
            margin: [0, 0, 0, 20]
          } : {},

          // ==========================================
          // ASSINATURAS (Sem Carimbo)
          // ==========================================
          {
            margin: [0, 60, 0, 0], 
            columns: [
              {
                width: '*',
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                  { text: 'Solicitante', style: 'signatureLabel', margin: [0, 5, 0, 2] },
                  { text: linha.solicitante, fontSize: 9, color: '#64748b' }
                ],
                alignment: 'center'
              },
              {
                width: '*',
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                  { text: 'Responsável Almoxarifado / Logística', style: 'signatureLabel', margin: [0, 5, 0, 2] },
                  { text: 'Data e Assinatura', fontSize: 9, color: '#64748b' }
                ],
                alignment: 'center'
              }
            ]
          },
          
          // ==========================================
          // RODAPÉ DO SISTEMA
          // ==========================================
          {
            text: `Documento gerado automaticamente pelo sistema STOCKLog em ${new Date().toLocaleString('pt-BR')}`,
            alignment: 'center',
            fontSize: 8,
            color: '#94a3b8',
            margin: [0, 40, 0, 0]
          }
        ],
        styles: {
          headerMain: { fontSize: 24, bold: true, alignment: 'center' },
          headerSub: { fontSize: 11, alignment: 'center', margin: [0, 1, 0, 6], color: '#64748b', bold: true, characterSpacing: 1 },
          sectionTitle: { fontSize: 10, bold: true, color: '#1e293b', margin: [5, 4, 5, 4] },
          signatureLabel: { fontSize: 10, bold: true, color: '#1e293b' }
        },
        defaultStyle: { 
          fontSize: 9.5, 
          color: '#334155',
          font: 'Roboto' 
        }
      };

      // Abre o PDF numa nova aba
      pdfMake.createPdf(docDefinition).open();

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      if (showAlert) showAlert("Erro", "Ocorreu um problema ao compilar os dados para o PDF.", "error");
    } finally {
      setGerando(false);
    }
  };

  return (
    <span 
      className="badge-pl"
      onClick={handleGerarPdf}
      style={{ 
        cursor: gerando ? 'not-allowed' : 'pointer', 
        transition: 'all 0.2s', 
        userSelect: 'none',
        opacity: gerando ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
      title="Clique para abrir o Boletim em PDF numa nova aba"
      onMouseOver={(e) => { 
        if(!gerando) {
          e.currentTarget.style.backgroundColor = '#dbeafe'; 
          e.currentTarget.style.borderColor = '#93c5fd'; 
        }
      }}
      onMouseOut={(e) => { 
        if(!gerando) {
          e.currentTarget.style.backgroundColor = '#eff6ff'; 
          e.currentTarget.style.borderColor = '#bfdbfe'; 
        }
      }}
    >
      <FileText size={14} /> 
      {gerando ? 'A Gerar...' : (linha.pl || 'Gerar PDF')}
    </span>
  );
}