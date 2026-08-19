import React from 'react';
import { PackageX, Box, ArrowRightLeft, FileText, PackagePlus, Truck, RefreshCcw } from 'lucide-react';
import MostrarArquivo from '../../../../components/MostrarArquivo/MostrarArquivo';

export default function DetalhesSolicitacao({ item, perfil, onDeleteAnexo }) {
  const itensReais = item.itens || [];

  // ========================================================
  // LÓGICA DE SEPARAÇÃO DOS ANEXOS E FUNÇÕES AUXILIARES
  // ========================================================
  const anexosCliente = (item.anexos || []).filter(arq => arq.origem !== 'logistica');
  const anexosLogistica = (item.anexos || []).filter(arq => arq.origem === 'logistica');

  const RenderizarAnexos = ({ tituloCliente, tituloLogistica }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
      <MostrarArquivo 
        arquivos={anexosCliente} 
        tituloCustomizado={tituloCliente || "Documentos Anexados pelo Solicitante"} 
      />
      <MostrarArquivo 
        arquivos={anexosLogistica} 
        tituloCustomizado={tituloLogistica || "Documentos de Liberação (Logística)"} 
        exibirOrigem={perfil === 'logistica'} 
        onDelete={perfil === 'logistica' ? onDeleteAnexo : undefined}
      />
    </div>
  );

  const formatarData = (dataStr) => {
    if (!dataStr || dataStr === '-') return '-';
    if (dataStr.includes('/')) return dataStr;
    try {
      return new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
      return dataStr;
    }
  };

  // ========================================================
  // COMPONENTE: TABELA ULTRA DETALHADA
  // ========================================================
  const TabelaUltraDetalhada = ({ itens, corIcone, icone, titulo, corDestaque, bgDestaque }) => (
    <div className="area-expandida-cliente">
      <div className="expandida-cabecalho" style={{ marginBottom: '24px' }}>
        <span>WBS Principal: <strong style={{ color: '#2563eb' }}>{item.wbs}</strong></span>
        <span>Observações: <strong>{item.observacoes || 'Nenhuma'}</strong></span>
      </div>

      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
        {icone} 
        <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>{titulo}</h3>
      </div>

      {/* ✨ Scroll nativo lateral configurado aqui com overflowX: 'auto' */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', paddingTop: '12px', width: '100%', maxWidth: '78vw' }}>
        <table className="tabela-sub-itens" style={{ width: '100%', minWidth: '2200px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>DESENHO SAP</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>Nº PEÇA FABRICANTE</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>FORNECEDOR</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>REFERÊNCIA</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b', textAlign: 'center' }}>QUANTIDADE</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>NF DE ENTRADA</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b', textAlign: 'center' }}>UNID. MEDIDA</th>
              <th style={{ minWidth: '200px', padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>VENDOR DESCRIPTION</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>WBS ELEMENT</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>EMISSÃO NF</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>RECEB. NF</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>DOC. COMPRAS</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>PO NET PRICE</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>CENTRO</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>DEPÓSITO</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#64748b' }}>ALOCAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {itens.length > 0 ? (
              itens.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', color: '#64748b', fontFamily: 'monospace' }}>{it.desenho_sap_manual || it.desenho_sap || '-'}</td>
                  <td style={{ padding: '12px', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{it.part_number_manual || it.part_number || '-'}</td>
                  <td style={{ padding: '12px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>{it.fornecedor || '-'}</td>
                  <td style={{ padding: '12px', color: '#475569', fontSize: '0.8rem' }}>{it.referencia || '-'}</td>
                  
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', backgroundColor: bgDestaque, color: corDestaque, padding: '4px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem' }}>
                      {it.quantidade_solicitada}
                    </span>
                  </td>
                  
                  <td style={{ padding: '12px', color: '#475569', fontFamily: 'monospace', fontSize: '0.8rem' }}>{it.nf_entrada || '-'}</td>
                  <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', fontSize: '0.8rem' }}>{it.unidade_medida_manual || 'Unid'}</td>
                  <td style={{ padding: '12px', color: '#334155', fontSize: '0.85rem' }}>{it.descricao_manual || it.descricao || '-'}</td>
                  <td style={{ padding: '12px', color: '#2563eb', fontFamily: 'monospace', fontSize: '0.8rem' }}>{it.wbs_element || it.wbs || '-'}</td>
                  <td style={{ padding: '12px', color: '#64748b', fontSize: '0.8rem' }}>{formatarData(it.emissao_nf)}</td>
                  <td style={{ padding: '12px', color: '#64748b', fontSize: '0.8rem' }}>{formatarData(it.receb_nf)}</td>
                  <td style={{ padding: '12px', color: '#475569', fontFamily: 'monospace', fontSize: '0.8rem' }}>{it.documento_compras || '-'}</td>
                  <td style={{ padding: '12px', color: '#1e293b', fontWeight: '500', fontSize: '0.85rem' }}>{it.valor_unitario_manual ? `R$ ${Number(it.valor_unitario_manual).toFixed(2)}` : '-'}</td>
                  <td style={{ padding: '12px', color: '#475569', fontSize: '0.8rem' }}>{it.centro || '-'}</td>
                  <td style={{ padding: '12px', color: '#475569', fontSize: '0.8rem' }}>{it.deposito || '-'}</td>
                  <td style={{ padding: '12px', color: '#475569', fontSize: '0.8rem' }}>{it.alocacao || '-'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="16" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>Nenhum detalhe de item encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <RenderizarAnexos tituloLogistica={item.tipo === 'Entrada' ? "Documentos de Recebimento Final" : "Documentos de Liberação (Logística)"} />
    </div>
  );

  // ========================================================
  // 1. VISUAL: MATERIAL (RETIRADA) 
  // ========================================================
  if (item.tipo === 'Material') {
    return (
      <TabelaUltraDetalhada 
        itens={itensReais} 
        corIcone="#2563eb" 
        icone={<Box size={18} color="#2563eb" />} 
        titulo="Itens Retirados do Estoque"
        corDestaque="#2563eb"
        bgDestaque="#eff6ff"
      />
    );
  }

  // ========================================================
  // 2. VISUAL: ENTRADA 
  // ========================================================
  if (item.tipo === 'Entrada') {
    return (
      <TabelaUltraDetalhada 
        itens={itensReais} 
        corIcone="#059669" 
        icone={<PackagePlus size={18} color="#059669" />} 
        titulo="Materiais Recebidos e Cadastrados"
        corDestaque="#059669"
        bgDestaque="#ecfdf5"
      />
    );
  }

  // ========================================================
  // 3. VISUAL: TRANSFERÊNCIA WBS
  // ========================================================
  if (item.tipo === 'Transferencia WBS' || item.tipo === 'Transfer. WBS') {
    return (
      <div className="area-expandida-cliente">
        <div className="expandida-cabecalho" style={{ marginBottom: '24px' }}>
          <span>Rota da Transferência: <strong style={{ color: '#2563eb' }}>{item.wbs}</strong></span>
          <span>Justificativa: <strong>{item.observacoes || 'Sem justificativa'}</strong></span>
        </div>

        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <ArrowRightLeft size={18} color="#ca8a04" /> 
          <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>Itens Transferidos</h3>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', paddingTop: '12px', width: '100%', maxWidth: '78vw' }}>
          <table className="tabela-sub-itens" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>DESENHO SAP</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>PART NUMBER</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>DESCRIÇÃO DO MATERIAL</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>QTD. TRANSFERIDA</th>
              </tr>
            </thead>
            <tbody>
              {itensReais.length > 0 ? (
                itensReais.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>{it.desenho_sap_manual || '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{it.part_number_manual || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.85rem' }}>{it.descricao_manual}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', backgroundColor: '#fefce8', color: '#ca8a04', padding: '4px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem', border: '1px solid #fef08a' }}>
                        {it.quantidade_solicitada} <span style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>{it.unidade_medida_manual}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Nenhum item encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <RenderizarAnexos />
      </div>
    );
  }

  // ========================================================
  // 4. VISUAL: NOTA FISCAL
  // ========================================================
  if (item.tipo === 'Nota Fiscal') {
    const valorEstimado = itensReais[0]?.valor_unitario_manual 
      ? `R$ ${itensReais[0].valor_unitario_manual.toFixed(2)}` 
      : 'R$ 0,00';

    return (
      <div className="area-expandida-cliente" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px', fontSize: '0.875rem', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Descrição / Motivo:</span>
            <span style={{ color: '#475569', lineHeight: '1.5' }}>{itensReais[0]?.descricao_manual || item.observacoes}</span>
          </div>
          <div style={{ minWidth: '150px' }}>
            <span style={{ color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Valor Estimado:</span>
            <span style={{ color: '#059669', fontWeight: '700', fontSize: '1.1rem' }}>{valorEstimado}</span>
          </div>
        </div>

        <RenderizarAnexos tituloCliente="Notas Fiscais e Espelhos (Solicitante)" />
      </div>
    );
  }

  // ========================================================
  // 5. VISUAL: CROSSDOCKING
  // ========================================================
  if (item.tipo === 'Crossdocking') {
    return (
      <div className="area-expandida-cliente">
        <div className="expandida-cabecalho" style={{ marginBottom: '24px' }}>
          <span>WBS / Destino: <strong style={{ color: '#2563eb' }}>{item.wbs}</strong></span>
          <span>Observações: <strong>{item.observacoes || 'Nenhuma'}</strong></span>
        </div>

        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <Truck size={18} color="#9333ea" /> 
          <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>Volumes do Crossdocking</h3>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', paddingTop: '12px', width: '100%', maxWidth: '78vw' }}>
          <table className="tabela-sub-itens" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>DESENHO SAP / REFERÊNCIA</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>VOLUME SOLICITADO</th>
              </tr>
            </thead>
            <tbody>
              {itensReais.length > 0 ? (
                itensReais.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{it.desenho_sap_manual || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', backgroundColor: '#faf5ff', color: '#9333ea', padding: '4px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem', border: '1px solid #e9d5ff' }}>
                        {it.quantidade_solicitada} <span style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>{it.unidade_medida_manual}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Saída Total (Sem itens especificados). Veja os anexos.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <RenderizarAnexos 
          tituloCliente="Nota Fiscal Original (Solicitante)" 
          tituloLogistica="Conhecimento de Transporte (CT-e) e NFs (Logística)" 
        />
      </div>
    );
  }

  // ========================================================
  // 6. VISUAL: REINTEGRAÇÃO E CANCELAMENTO
  // ========================================================
  if (item.tipo === 'Reintegracao' || item.tipo === 'Reintegração' || item.tipo === 'Cancelado') {
    const isCancelamento = item.tipo === 'Cancelado';
    return (
      <div className="area-expandida-cliente">
        <div className="expandida-cabecalho" style={{ marginBottom: '24px' }}>
          <span>WBS de Origem: <strong style={{ color: '#2563eb' }}>{item.wbs}</strong></span>
          <span>Observações: <strong>{item.observacoes || 'Nenhuma'}</strong></span>
        </div>

        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <RefreshCcw size={18} color={isCancelamento ? "#dc2626" : "#ea580c"} /> 
          <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>
            {isCancelamento ? "Itens Cancelados (A Devolver ao Estoque)" : "Itens Devolvidos ao Estoque"}
          </h3>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', paddingTop: '12px', width: '100%', maxWidth: '78vw' }}>
          <table className="tabela-sub-itens" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>DESENHO SAP</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>PART NUMBER</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>DESCRIÇÃO DO MATERIAL</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>QTD. DEVOLVIDA</th>
              </tr>
            </thead>
            <tbody>
              {itensReais.length > 0 ? (
                itensReais.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>{it.desenho_sap_manual || '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{it.part_number_manual || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.85rem' }}>{it.descricao_manual}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', backgroundColor: isCancelamento ? '#fef2f2' : '#fff7ed', color: isCancelamento ? '#dc2626' : '#ea580c', padding: '4px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem', border: `1px solid ${isCancelamento ? '#fecaca' : '#fed7aa'}` }}>
                        + {it.quantidade_solicitada} <span style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>{it.unidade_medida_manual}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>O Cancelamento foi registado sem itens individuais especificados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <RenderizarAnexos tituloLogistica={isCancelamento ? "Documento de Cancelamento" : "Documento Final de Reintegração"} />
      </div>
    );
  }

  // ========================================================
  // DEFAULT
  // ========================================================
  return (
    <div className="area-expandida-cliente" style={{ textAlign: 'center', color: '#64748b' }}>
      <p>O painel detalhado para o tipo <strong>{item.tipo}</strong> será construído em breve.</p>
      <RenderizarAnexos />
    </div>
  );
}