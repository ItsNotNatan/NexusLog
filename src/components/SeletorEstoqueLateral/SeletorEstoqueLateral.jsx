// =================================================================
// ARQUIVO: src/components/SeletorEstoqueLateral/SeletorEstoqueLateral.jsx
// DESCRIÇÃO: Componente completo: Seletor lateral de estoque + Tabela de Itens Selecionados
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, AlertCircle, Loader2, ChevronLeft, ChevronRight, Copy, Check, Box, X } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';

export default function SeletorEstoqueLateral({ 
  estoque, 
  carregando, 
  onAdicionarItem, 
  itensSelecionados = [], 
  bloquearTransferidos = false,
  limiteMaximo = 20,
  onRemoverItem, 
  onAtualizarQuantidade 
}) {
  
  const { estoqueAtual } = useContext(AuthContext);

  const [busca, setBusca] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 5;

  const [hoverId, setHoverId] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  // MOTOR DE FILTRAGEM (LADO ESQUERDO)
  const estoqueFiltrado = estoque?.filter(item => {
    const filialItem = item.filial_id || item.filial || item.filial_origem_id;
    if (estoqueAtual && estoqueAtual !== 'TODOS' && filialItem && filialItem !== estoqueAtual) {
      return false; 
    }

    const idDoItem = item.idBD || item.id;
    const jaEstaSelecionado = itensSelecionados.some(selecionado => 
      selecionado.estoque_id === idDoItem || selecionado.id === idDoItem || selecionado.idBD === idDoItem
    );
    if (jaEstaSelecionado) return false;

    const termo = busca.toLowerCase();
    return (
      (item.desenhoSAP && item.desenhoSAP.toLowerCase().includes(termo)) ||
      (item.desenho_sap && item.desenho_sap.toLowerCase().includes(termo)) ||
      (item.fabricante && item.fabricante.toLowerCase().includes(termo)) ||
      (item.wbs && item.wbs.toLowerCase().includes(termo)) ||
      (item.wbs_element && item.wbs_element.toLowerCase().includes(termo)) ||
      (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
      (item.materialDescription && item.materialDescription.toLowerCase().includes(termo))
    );
  }) || [];

  useEffect(() => { setPaginaAtual(1); }, [busca, estoqueAtual]);

  const totalPaginas = Math.ceil(estoqueFiltrado.length / itensPorPagina) || 1;
  
  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [estoqueFiltrado.length, totalPaginas, paginaAtual]);

  const indexInicio = (Math.max(1, paginaAtual) - 1) * itensPorPagina;
  const itensPaginados = estoqueFiltrado.slice(indexInicio, indexInicio + itensPorPagina);

  const copiarParaAreaTransferencia = (e, texto, idUnico) => {
    e.stopPropagation(); 
    if (!texto || texto === "SEM SAP") return;
    navigator.clipboard.writeText(texto);
    setCopiadoId(idUnico);
    setTimeout(() => { setCopiadoId(null); }, 2000);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "350px minmax(0, 1fr)", gap: "24px", alignItems: "start", width: "100%" }}>
      
      {/* =========================================================
          LADO ESQUERDO: SELETOR DE ITENS
          ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', height: '100%', minHeight: '550px', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
              Estoque Disponível
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {estoqueFiltrado.length} items
            </span>
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por SAP, Fabricante, Descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', 
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', outline: 'none', 
                fontSize: '0.85rem', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {carregando ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', gap: '12px', marginTop: '40px' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Carregando...</span>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : estoqueFiltrado.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
              <AlertCircle size={36} style={{ opacity: 0.4, margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '0.85rem', margin: 0, padding: '0 16px' }}>
                {estoque?.length > 0 ? `Nenhum material encontrado para a filial selecionada.` : "Nenhum material encontrado."}
              </p>
            </div>
          ) : (
            itensPaginados.map((item, index) => {
              const idUnicoItem = item.idBD || item.id || `linha-${index}`;
              const isHovered = hoverId === idUnicoItem;
              const isCopied = copiadoId === idUnicoItem;
              const textoSAP = item.desenhoSAP || item.desenho_sap || "SEM SAP";
              const temSAP = textoSAP !== "SEM SAP" && textoSAP !== "-";
              
              const saldo = item.quantidade_disponivel ?? item.qtdFornecida ?? 0;
              const reservado = item.quantidade_reservada ?? item.qtdReservada ?? 0;

              const isTransferido = item.is_transferencia || item.isTransferencia;
              const corFundo = isTransferido ? '#fefce8' : 'transparent';
              const corBorda = isTransferido ? '#fef08a' : '#e2e8f0';
              const botaoBloqueado = bloquearTransferidos && isTransferido;

              return (
                <div 
                  key={idUnicoItem} 
                  style={{ 
                    padding: '16px', borderBottom: `1px solid ${corBorda}`, backgroundColor: corFundo, 
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', transition: 'background-color 0.2s'
                  }}
                >
                  {isTransferido && (
                    <span style={{ fontSize: '0.65rem', color: '#ca8a04', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                      ★ Material de Transferência
                    </span>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div 
                      onMouseEnter={() => setHoverId(idUnicoItem)}
                      onMouseLeave={() => setHoverId(null)}
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <span style={{ 
                        backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', 
                        padding: '4px 16px', borderRadius: '999px', fontSize: '0.9rem', 
                        fontWeight: '700', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px'
                      }}>
                        {textoSAP}
                        {temSAP && (isHovered || isCopied) && (
                          <button
                            onClick={(e) => copiarParaAreaTransferencia(e, textoSAP, idUnicoItem)}
                            style={{
                              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', color: isCopied ? '#10b981' : '#3b82f6',
                              transition: 'color 0.2s',
                            }}
                            title="Copiar Desenho SAP"
                          >
                            {isCopied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                          </button>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => !botaoBloqueado && onAdicionarItem(item, index)}
                      disabled={botaoBloqueado}
                      style={{ 
                        background: 'none', border: 'none', cursor: botaoBloqueado ? 'not-allowed' : 'pointer', 
                        color: botaoBloqueado ? '#cbd5e1' : '#2563eb', padding: '4px', display: 'flex' 
                      }}
                      title={botaoBloqueado ? "Material já transferido" : "Adicionar Item"}
                    >
                      <Plus size={20} strokeWidth={2} />
                    </button>
                  </div>

                  {/* ✨ AQUI: SUBSTITUÍMOS O PART NUMBER PELO WBS E FABRICANTE */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#2563eb', fontWeight: '700', fontFamily: 'monospace' }}>
                      WBS: {item.wbs || item.wbs_element || "-"}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                      Fab: {item.fabricante || "-"}
                    </div>
                  </div>

                  {(item.nf || item.nf_entrada) && (item.nf !== "-" && item.nf_entrada !== "-") && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        NF: {item.nf || item.nf_entrada}
                      </span>
                    </div>
                  )}

                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>
                    {item.descricao || item.materialDescription}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', fontFamily: 'monospace', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>
                      Saldo: {saldo} {item.unidade_medida || item.unidadeMedida || 'Unid'}
                    </span>
                    
                    {reservado > 0 && (
                      <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                        Reservado: {reservado}
                      </span>
                    )}

                    {item.alocacao && item.alocacao !== "-" && (
                      <span style={{ color: '#2563eb' }}>{item.alocacao}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!carregando && estoqueFiltrado.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <button 
              onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
              disabled={paginaAtual <= 1}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px',
                backgroundColor: paginaAtual <= 1 ? 'transparent' : '#ffffff',
                border: paginaAtual <= 1 ? '1px solid transparent' : '1px solid #cbd5e1',
                borderRadius: '6px', color: paginaAtual <= 1 ? '#cbd5e1' : '#475569',
                cursor: paginaAtual <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Página {paginaAtual} de {totalPaginas}</span>
            <button 
              onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
              disabled={paginaAtual >= totalPaginas}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px',
                backgroundColor: paginaAtual >= totalPaginas ? 'transparent' : '#ffffff',
                border: paginaAtual >= totalPaginas ? '1px solid transparent' : '1px solid #cbd5e1',
                borderRadius: '6px', color: paginaAtual >= totalPaginas ? '#cbd5e1' : '#475569',
                cursor: paginaAtual >= totalPaginas ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* =========================================================
          LADO DIREITO: TABELA DE ITENS SELECIONADOS
          ========================================================= */}
      <div className="painel-lista" style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden", display: 'flex', flexDirection: 'column', height: '100%', minHeight: '550px' }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", color: "#0f172a", fontSize: "1.05rem" }}>
            <Box size={20} color="#2563eb" /> Itens Selecionados
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b', border: '1px solid #e2e8f0', padding: '4px 14px', borderRadius: '16px' }}>
            {itensSelecionados.length} / {limiteMaximo}
          </span>
        </div>

        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
          {itensSelecionados.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", height: '100%', minHeight: '300px' }}>
              <Box size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: "16px" }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Clique nos itens do estoque à esquerda para adicioná-los.</p>
            </div>
          ) : (
            <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#2563eb", fontWeight: "700", textTransform: "uppercase" }}>DESENHO SAP</th>
                  {/* ✨ COLUNA FABRICANTE NO LUGAR DO PART NUMBER */}
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>FABRICANTE</th>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>DESCRIÇÃO</th>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>NF ENTRADA</th>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>ALOCAÇÃO</th>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>WBS ITEM</th>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#10b981", fontWeight: "700", textTransform: "uppercase" }}>SALDO</th>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#f59e0b", fontWeight: "700", textTransform: "uppercase" }}>RESERVADO</th>
                  <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>QTD</th>
                  <th style={{ padding: "16px", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {itensSelecionados.map((item) => {
                  const
