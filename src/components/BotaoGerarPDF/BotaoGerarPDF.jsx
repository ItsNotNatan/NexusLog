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

  // Trata a formatação de datas que vêm do banco (DD/MM/AAAA)
  const formatarDataSimples = (data) => {
    if (!data) return '-';
    if (data.includes('/')) return data;
    try {
      return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
      return data;
    }
  };

  const handleGerarPdf = async (e) => {
    e.stopPropagation(); // Impede a expansão da linha na tabela
    setGerando(true);
    
    if (showAlert) {
      showAlert("Gerando PDF...", "O Boletim Detalhado será aberto num novo separador dentro de instantes.", "info");
    }

    try {
      // Carregar a imagem do logo em Base64
      const [logoBase64] = await Promise.all([
        getBase64ImageFromURL(logoComau).catch(() => null)
      ]);

      // ✨ IDENTIFICAÇÃO DO TIPO DE SOLICITAÇÃO
      const isCrossdocking = linha.tipo === 'Crossdocking';
      const isReintegracao = linha.tipo === 'Reintegracao' || linha.tipo === 'Reintegração';

      // A data de necessidade está vinculada à solicitação global (linha)
      const dataNecessidadeFormatada = formatarDataSimples(linha.data_necessidade || linha.dataNecessidade);

      // Monta as linhas da tabela mapeando os campos exatos do banco
      let linhasItens = [];

      if (linha.itens && linha.itens.length > 0) {
        linhasItens = linha.itens.map((it) => [
          { text: it.desenho_sap_manual || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.part_number_manual || '-', margin: [0, 4], fontSize: 6, bold: true, color: '#1e293b' },
          { text: it.fornecedor || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.referencia || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.quantidade_solicitada || '-', alignment: 'center', margin: [0, 4], fontSize: 6, bold: true, color: '#2563eb' },
          // Se for Crossdocking e não tiver NF no item, puxa a NF global da solicitação
          { text: it.nf_entrada || linha.nfCrossdocking || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.unidade_medida_manual || 'Un', alignment: 'center', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.descricao_manual || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.wbs_element || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: dataNecessidadeFormatada, margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: formatarDataSimples(it.emissao_nf), margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: formatarDataSimples(it.receb_nf), margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.documento_compras || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.valor_unitario_manual ? `R$ ${Number(it.valor_unitario_manual).toFixed(2)}` : '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.centro || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.deposito || '-', margin: [0, 4], fontSize: 6, color: '#475569' },
          { text: it.alocacao || '-', margin: [0, 4], fontSize: 6, color: '#475569' }
        ]);
      } else if (isCrossdocking) {
        // Se for Crossdocking de Saída Total (sem itens)
        linhasItens = [[{ text: `Saída Total (Crossdocking). Todos os volumes referentes à NF ${linha.nfCrossdocking || ''} estão incluídos. Consulte o anexo.`, colSpan: 17, alignment: 'center', margin: [0, 10], color: '#d97706', bold: true }, ...Array(16).fill({})]];
      } else {
        // Padrão vazio genérico
        linhasItens = [[{ text: 'Nenhum item individual detalhado nesta solicitação.', colSpan: 17, alignment: 'center', margin: [0, 10], color: '#94a3b8' }, ...Array(16).fill({})]];
      }

      // ✨ TÍTULOS DINÂMICOS
      const tituloPrincipal = isReintegracao 
        ? 'BOLETIM DE REINTEGRAÇÃO DE ESTOQUE' 
        : `BOLETIM DETALHADO / ${linha.tipo ? linha.tipo.toUpperCase() : 'DOCUMENTO'}`;

      const docDefinition = {
        // Folha A4 na horizontal para caber as 17 colunas
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [30, 30, 30, 30], 
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
          { text: tituloPrincipal, style: 'headerSub' },
          // Linha divisória adaptada para o tamanho landscape
          { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 781, y2: 3, lineWidth: 1.5, lineColor: '#2563eb' }] },
          
          // ==========================================
          // NÚMEROS E IDENTIFICAÇÃO BÁSICA
          // ==========================================
          {
            margin: [0, 15, 0, 15],
            columns: [
              { text: [{ text: isReintegracao ? 'Nº DOCUMENTO: ' : 'Nº PL / DOCUMENTO: ', bold: true, color: '#1e293b' }, { text: linha.pl || 'N/A', color: '#2563eb', fontSize: 12, bold: true }] },
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
                [{ text: isReintegracao ? 'Devolvido Por:' : 'Solicitante:', bold: true, margin: [0, 4] }, { text: linha.solicitante || 'N/A', margin: [0, 4] }],
                [{ text: 'WBS / Destino Geral:', bold: true, margin: [0, 4] }, { text: linha.wbs || 'N/A', margin: [0, 4] }],
                [{ text: 'Filial / Base:', bold: true, margin: [0, 4] }, { text: nomeFilial || 'N/A', margin: [0, 4] }],
                [{ text: 'Data do Registo:', bold: true, margin: [0, 4] }, { text: linha.dataSolicitacao || 'N/A', margin: [0, 4] }],
                [{ text: 'Tipo Operação:', bold: true, margin: [0, 4] }, { text: linha.tipo || 'N/A', margin: [0, 4] }],
                // SE FOR CROSSDOCKING, ADICIONA A NF VINCULADA NAS INFORMAÇÕES PRINCIPAIS
                ...(linha.nfCrossdocking ? [
                  [{ text: 'NF Vinculada (Crossdocking):', bold: true, margin: [0, 4], color: '#b45309' }, { text: linha.nfCrossdocking, margin: [0, 4], bold: true, color: '#d97706' }]
                ] : [])
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
          },

          // ==========================================
          // TABELA DE ITENS EXTREMAMENTE DETALHADA
          // ==========================================
          {
            table: { widths: ['*'], body: [[{ text: isReintegracao ? `ITENS DEVOLVIDOS AO ESTOQUE` : `DETALHAMENTO DE ITENS DA SOLICITAÇÃO`, style: 'sectionTitle', fillColor: '#f1f5f9' }]] },
            layout: 'noBorders',
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              // Ajuste de larguras para 17 colunas na folha A4 (Vendor Description recebe o '*')
              widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              headerRows: 1,
              body: [
                [
                  { text: 'DESENHO SAP', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'Nº PEÇA FAB.', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'FORNECEDOR', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'REFERÊNCIA', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  // ✨ COLUNA DINÂMICA: QTD. FORNECIDA vs QTD. DEVOLVIDA
                  { text: isReintegracao ? 'QTD. DEVOLVIDA' : 'QTD. FORN.', bold: true, alignment: 'center', fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'NF DE ENT.', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'UNID.', bold: true, alignment: 'center', fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'VENDOR DESC.', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'WBS', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'DT NEC.', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'EMIS. NF', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'REC. NF', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'DOC COMPRAS', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'PO PRICE', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'CENTRO', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'DEP.', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' },
                  { text: 'ALOC.', bold: true, fillColor: '#f8fafc', margin: [0, 4], fontSize: 5, color: '#475569' }
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
                  { text: isReintegracao ? 'Entregue por (Solicitante)' : 'Solicitante', style: 'signatureLabel', margin: [0, 5, 0, 2] },
                  { text: linha.solicitante, fontSize: 9, color: '#64748b' }
                ],
                alignment: 'center'
              },
              {
                width: '*',
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                  { text: isReintegracao ? 'Recebido por (Almoxarifado)' : 'Responsável Almoxarifado / Logística', style: 'signatureLabel', margin: [0, 5, 0, 2] },
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
      title="Clique para abrir o Boletim Detalhado em PDF numa nova aba"
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