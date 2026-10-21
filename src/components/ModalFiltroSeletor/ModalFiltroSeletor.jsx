// =================================================================
// ARQUIVO: src/components/SeletorEstoqueLateral/ModalFiltroSeletor.jsx
// DESCRIÇÃO: Componente independente para filtrar o seletor lateral
// =================================================================
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { X } from 'lucide-react';

export default function ModalFiltroSeletor({ aberto, onClose, dadosEstoque, filtros, setFiltros, onLimpar }) {
  
  // Extrai inteligentemente os dados da prateleira para não mostrar opções vazias
  const opcoesMapeadas = useMemo(() => {
    const mapas = { wbs: new Set(), docCompras: new Set(), nf: new Set(), alocacao: new Set() };
    
    dadosEstoque.forEach(item => {
      const wbs = item.wbs || item.wbs_element;
      if (wbs && wbs !== '-' && wbs !== '—') mapas.wbs.add(wbs);

      const doc = item.documento_compras;
      if (doc && doc !== '-' && doc !== '—') mapas.docCompras.add(doc);

      const nf = item.nf_entrada || item.nf;
      if (nf && nf !== '-' && nf !== '—') mapas.nf.add(nf);

      const aloc = item.alocacao;
      if (aloc && aloc !== '-' && aloc !== '—') mapas.alocacao.add(aloc);
    });

    const formatarLista = (set) => Array.from(set).sort().map(val => ({ value: val, label: String(val) }));

    return {
      wbs: formatarLista(mapas.wbs),
      docCompras: formatarLista(mapas.docCompras),
      nf: formatarLista(mapas.nf),
      alocacao: formatarLista(mapas.alocacao)
    };
  }, [dadosEstoque]);

  const temFiltroAtivo = Object.values(filtros).some(valor => valor !== null && valor !== undefined);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1',
      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
      borderRadius: '8px', padding: '0px', minHeight: '36px', fontSize: '0.875rem',
      '&:hover': { borderColor: '#94a3b8' }
    }),
    option: (base, state) => ({
      ...base, fontSize: '0.875rem',
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#334155',
    })
  };

  if (!aberto) return null;

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ backgroundColor: '#ffffff', width: '450px', maxWidth: '90%', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Seletor Lateral</span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: '700' }}>Filtro Específico</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>WBS do Item</label>
            <Select options={opcoesMapeadas.wbs} value={filtros.wbs} onChange={(opt) => setFiltros({ ...filtros, wbs: opt })} placeholder="Qualquer WBS..." isClearable styles={selectStyles} noOptionsMessage={() => "Sem dados"} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Pedido de Compra / CPV</label>
            <Select options={opcoesMapeadas.docCompras} value={filtros.docCompras} onChange={(opt) => setFiltros({ ...filtros, docCompras: opt })} placeholder="Qualquer Pedido..." isClearable styles={selectStyles} noOptionsMessage={() => "Sem dados"} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Nota Fiscal (NF)</label>
            <Select options={opcoesMapeadas.nf} value={filtros.nf} onChange={(opt) => setFiltros({ ...filtros, nf: opt })} placeholder="Qualquer NF..." isClearable styles={selectStyles} noOptionsMessage={() => "Sem dados"} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Alocação</label>
            <Select options={opcoesMapeadas.alocacao} value={filtros.alocacao} onChange={(opt) => setFiltros({ ...filtros, alocacao: opt })} placeholder="Qualquer Alocação..." isClearable styles={selectStyles} noOptionsMessage={() => "Sem dados"} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div>
            {temFiltroAtivo && (
              <button onClick={onLimpar} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
                Limpar Filtros
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
            Aplicar e Fechar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
