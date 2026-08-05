import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SeletorEstoqueLateral({ estoque, carregando, onAdicionarItem }) {
  const [busca, setBusca] = useState('');
  
  // 🚀 Lógica de paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 5;

  const estoqueFiltrado = estoque?.filter(item => {
    const termo = busca.toLowerCase();
    return (
      (item.desenhoSAP && item.desenhoSAP.toLowerCase().includes(termo)) ||
      (item.materialDescription && item.materialDescription.toLowerCase().includes(termo)) ||
      (item.numPecaFabricante && item.numPecaFabricante.toLowerCase().includes(termo)) ||
      (item.wbs && item.wbs.toLowerCase().includes(termo))
    );
  }) || [];

  // Volta para a página 1 sempre que o termo de busca mudar
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca]);

  const totalPaginas = Math.ceil(estoqueFiltrado.length / itensPorPagina) || 1;
  const indexInicio = (paginaAtual - 1) * itensPorPagina;
  const itensPaginados = estoqueFiltrado.slice(indexInicio, indexInicio + itensPorPagina);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', height: '100%', minHeight: '600px', overflow: 'hidden' }}>
      
      {/* 📌 CABEÇALHO LATERAL */}
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
            placeholder="Buscar por SAP, PN, Descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px 12px 8px 36px', 
              borderRadius: '8px', 
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0', 
              outline: 'none', 
              fontSize: '0.85rem', 
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* 📌 LISTA DE ITENS PAGINADA */}
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
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Nenhum material encontrado.</p>
          </div>
        ) : (
          itensPaginados.map((item, index) => (
            <div 
              key={item.idBD || index} 
              style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              {/* SAP Pill + Plus Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ 
                  backgroundColor: '#eff6ff', 
                  border: '1px solid #bfdbfe',
                  color: '#2563eb', 
                  padding: '4px 16px', 
                  borderRadius: '999px', 
                  fontSize: '0.9rem', 
                  fontWeight: '700', 
                  fontFamily: 'monospace' 
                }}>
                  {item.desenhoSAP && item.desenhoSAP !== "-" ? item.desenhoSAP : "SEM SAP"}
                </span>
                <button
                  onClick={() => onAdicionarItem(item, index)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px', display: 'flex' }}
                  title="Adicionar Item"
                >
                  <Plus size={20} strokeWidth={2} />
                </button>
              </div>

              {/* Part Number */}
              <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#475569', fontFamily: 'monospace' }}>
                {item.numPecaFabricante !== "-" ? item.numPecaFabricante : "S/N Fabricante"}
              </div>

              {/* NF Pill */}
              {item.nf && item.nf !== "-" && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    NF: {item.nf}
                  </span>
                </div>
              )}

              {/* Descrição */}
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>
                {item.materialDescription}
              </div>
              
              {/* Saldo e Alocação */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', fontFamily: 'monospace', marginTop: '8px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>Saldo: {item.qtdFornecida} {item.unidadeMedida || 'NR'}</span>
                {item.alocacao && item.alocacao !== "-" && (
                  <span style={{ color: '#2563eb' }}>{item.alocacao}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📌 CONTROLES DE PAGINAÇÃO */}
      {!carregando && estoqueFiltrado.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px', 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <button 
            onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
            disabled={paginaAtual === 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              backgroundColor: paginaAtual === 1 ? 'transparent' : '#ffffff',
              border: paginaAtual === 1 ? '1px solid transparent' : '1px solid #cbd5e1',
              borderRadius: '6px',
              color: paginaAtual === 1 ? '#cbd5e1' : '#475569',
              cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Página {paginaAtual} de {totalPaginas}
          </span>

          <button 
            onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
            disabled={paginaAtual === totalPaginas}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              backgroundColor: paginaAtual === totalPaginas ? 'transparent' : '#ffffff',
              border: paginaAtual === totalPaginas ? '1px solid transparent' : '1px solid #cbd5e1',
              borderRadius: '6px',
              color: paginaAtual === totalPaginas ? '#cbd5e1' : '#475569',
              cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}