import React from 'react';
import { Eye } from 'lucide-react';
// 👇 IMPORTAÇÃO DO NOVO COMPONENTE
import MostrarArquivo from '../../../../components/MostrarArquivo/MostrarArquivo';

export default function DetalhesSolicitacao({ item }) {

  // Mock de arquivos: Usado caso a API ainda não devolva a propriedade "anexos" no item
  const anexosMock = item.anexos || [
    { nome_arquivo: 'nota_fiscal_396340.pdf', tamanho: '1.2 MB', url_arquivo: '#' },
    { nome_arquivo: 'comprovante_recebimento.jpg', tamanho: '850 KB', url_arquivo: '#' }
  ];

  // ========================================================
  // 1. VISUAL: MATERIAL
  // ========================================================
  if (item.tipo === 'Material') {
    const itensMaterial = [
      { sap: 'TLXXX-0000021870', pn: '2967073', desc: 'MODULO DE RELE PLC RSC 24UC 21 21', nf: '396340', wbs: 'BRBRRCY21-SPST003-BET-00', qtd: '10 NR', alocacao: '200-E-006-0044' }
    ];

    return (
      <div className="area-expandida-cliente">
        <div className="expandida-cabecalho">
          <span>Origem: <strong>BR02 — Santo André, SP</strong></span>
          <span>Destino: <strong>TESTE</strong></span>
        </div>

        <table className="tabela-sub-itens">
          <thead>
            <tr>
              <th>DESENHO SAP</th>
              <th>PART NUMBER</th>
              <th>DESCRIÇÃO</th>
              <th>NF ENTRADA</th>
              <th>WBS</th>
              <th>QTD. SOLICITADA</th>
              <th>ALOCAÇÃO</th>
              <th>DETALHES</th>
            </tr>
          </thead>
          <tbody>
            {itensMaterial.map((it, idx) => (
              <tr key={idx}>
                <td><a href="#" className="texto-azul-link">{it.sap}</a></td>
                <td style={{ fontWeight: '600' }}>{it.pn}</td>
                <td style={{ minWidth: '250px' }}>{it.desc}</td>
                <td style={{ color: '#64748b' }}>{it.nf}</td>
                <td><a href="#" className="texto-azul-link">{it.wbs}</a></td>
                <td className="texto-azul-link">{it.qtd}</td>
                <td><a href="#" className="texto-azul-link">{it.alocacao}</a></td>
                <td>
                  <button className="btn-detalhes-olho">
                    <Eye size={16} /> Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 👇 RENDERIZAR ARQUIVOS DA SOLICITAÇÃO */}
        <MostrarArquivo arquivos={anexosMock} />
      </div>
    );
  }

  // ========================================================
  // 2. VISUAL: TRANSFERÊNCIA WBS
  // ========================================================
  if (item.tipo === 'Transferencia WBS' || item.tipo === 'Transfer. WBS') {
    const itensTransferencia = [
      { pn: '1534534', desc: 'SENSOR DE INDUÇÃO', qtd: '2 NR' },
      { pn: 'PN-TUB-7890', desc: 'Tubo Aço Inox 316L 6" Sch40', qtd: '4 Metro' }
    ];

    return (
      <div className="area-expandida-cliente">
        <div className="expandida-cabecalho">
          <span>Rota da Transferência: <strong style={{ color: '#2563eb' }}>{item.wbs}</strong></span>
          <span>Justificativa: <strong>Manutenção preventiva antecipada</strong></span>
        </div>

        <table className="tabela-sub-itens">
          <thead>
            <tr>
              <th>PART NUMBER</th>
              <th>DESCRIÇÃO DO MATERIAL</th>
              <th style={{ width: '150px' }}>QTD. TRANSFERIDA</th>
            </tr>
          </thead>
          <tbody>
            {itensTransferencia.map((it, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{it.pn}</td>
                <td>{it.desc}</td>
                <td className="texto-azul-link">{it.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 👇 RENDERIZAR ARQUIVOS DA SOLICITAÇÃO */}
        <MostrarArquivo arquivos={anexosMock} />
      </div>
    );
  }

  // ========================================================
  // 3. VISUAL: NOTA FISCAL
  // ========================================================
  if (item.tipo === 'Nota Fiscal') {
    const descricao = item.observacoes || 'Emissão de Nota Fiscal para faturamento de serviços do mês corrente.';
    const valorEstimado = item.valorEstimado || 'R$ 150.000,00';

    return (
      <div className="area-expandida-cliente" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '0.875rem', marginBottom: '16px' }}>
          <div>
            <span style={{ color: '#1e293b', fontWeight: '600', marginRight: '6px' }}>Descrição / Motivo:</span>
            <span style={{ color: '#64748b' }}>{descricao}</span>
          </div>
          <div>
            <span style={{ color: '#1e293b', fontWeight: '600', marginRight: '6px' }}>Valor Estimado:</span>
            <span style={{ color: '#64748b' }}>{valorEstimado}</span>
          </div>
        </div>

        {/* 👇 RENDERIZAR ARQUIVOS DA SOLICITAÇÃO */}
        <MostrarArquivo arquivos={anexosMock} tituloCustomizado="Notas Fiscais e Espelhos em Anexo" />
      </div>
    );
  }

  // ========================================================
  // 4. VISUAL: ENTRADA (NOVO)
  // ========================================================
  if (item.tipo === 'Entrada') {
    const itensEntrada = [
      { po: 'PO-99231', pn: '8837261', desc: 'Válvula Borboleta 2"', fornecedor: 'Válvulas Brasil S.A.', qtd: '15 NR' }
    ];

    return (
      <div className="area-expandida-cliente">
        <div className="expandida-cabecalho">
          <span>Fornecedor Principal: <strong>Válvulas Brasil S.A.</strong></span>
          <span>Nº da Nota Fiscal: <strong>NF-88219</strong></span>
        </div>

        <table className="tabela-sub-itens">
          <thead>
            <tr>
              <th>ORDEM DE COMPRA (PO)</th>
              <th>PART NUMBER</th>
              <th>DESCRIÇÃO DO MATERIAL</th>
              <th>FORNECEDOR</th>
              <th style={{ width: '150px' }}>QTD. RECEBIDA</th>
            </tr>
          </thead>
          <tbody>
            {itensEntrada.map((it, idx) => (
              <tr key={idx}>
                <td style={{ color: '#64748b' }}>{it.po}</td>
                <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{it.pn}</td>
                <td>{it.desc}</td>
                <td>{it.fornecedor}</td>
                <td className="texto-azul-link">{it.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 👇 RENDERIZAR ARQUIVOS DA SOLICITAÇÃO */}
        <MostrarArquivo arquivos={anexosMock} tituloCustomizado="Documentos de Recebimento (XML/PDF)" />
      </div>
    );
  }

  // ========================================================
  // 5. VISUAL: CROSSDOCKING (NOVO)
  // ========================================================
  if (item.tipo === 'Crossdocking') {
    const itensCrossdocking = [
      { nf: 'NF-10293', desc: 'Kit de Instalação Elétrica', destino: 'BR06 - BETIM', qtd: '1 Pallet' }
    ];

    return (
      <div className="area-expandida-cliente">
        <div className="expandida-cabecalho">
          <span>Doca de Recebimento: <strong>Doca 04</strong></span>
          <span>Status Operacional: <strong style={{ color: '#eab308' }}>Aguardando Transporte</strong></span>
        </div>

        <table className="tabela-sub-itens">
          <thead>
            <tr>
              <th>NOTA FISCAL ORIGEM</th>
              <th>DESCRIÇÃO DA CARGA</th>
              <th>FILIAL DE DESTINO</th>
              <th style={{ width: '150px' }}>VOLUME</th>
            </tr>
          </thead>
          <tbody>
            {itensCrossdocking.map((it, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: '600' }}>{it.nf}</td>
                <td>{it.desc}</td>
                <td><span className="badge-wbs">{it.destino}</span></td>
                <td className="texto-azul-link">{it.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 👇 RENDERIZAR ARQUIVOS DA SOLICITAÇÃO */}
        <MostrarArquivo arquivos={anexosMock} tituloCustomizado="Conhecimento de Transporte (CT-e) e NFs" />
      </div>
    );
  }

  // ========================================================
  // DEFAULT: OUTROS TIPOS AINDA NÃO DESENHADOS
  // ========================================================
  return (
    <div className="area-expandida-cliente" style={{ textAlign: 'center', color: '#64748b' }}>
      O painel detalhado para o tipo <strong>{item.tipo}</strong> será construído em breve.
      
      {/* Mesmo não tendo layout específico, mostramos os arquivos se existirem */}
      <MostrarArquivo arquivos={anexosMock} />
    </div>
  );
}