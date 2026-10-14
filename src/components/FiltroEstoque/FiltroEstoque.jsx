// =================================================================
// ARQUIVO: src/components/FiltroEstoque/FiltroEstoque.jsx (ou na pasta que preferires)
// =================================================================
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';

const XCircle = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
);
const X = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

export default function FiltroEstoque({ estoque, filtros, onFiltroChange, onLimpar, aberto, onClose }) {
  const [modoSap, setModoSap] = useState('especifico');
  const [modoWbs, setModoWbs] = useState('especifico');
  const [modoNf, setModoNf] = useState('especifico');
  const [modoPedido, setModoPedido] = useState('especifico');

  // Extração automática de opções únicas baseadas nos dados do estoque
  const opcoesFiltro = useMemo(() => {
    const saps = new Set();
    const wbsList = new Set();
    const nfs = new Set();
    const pedidos = new Set();
    const fabricantes = new Set();
    const fornecedores = new Set();

    estoque.forEach(item => {
      if (item.desenho_sap && item.desenho_sap !== '-') saps.add(item.desenho_sap);
      if (item.wbs && item.wbs !== '-') wbsList.add(item.wbs);
      if (item.nf_entrada && item.nf_entrada !== '-') nfs.add(item.nf_entrada);
      if (item.documento_compras && item.documento_compras !== '-') pedidos.add(item.documento_compras);
      
      const fab = item.fabricante || item.fabricante_manual;
      if (fab && fab !== '-') fabricantes.add(fab);
      
      if (item.fornecedor && item.fornecedor !== '-') fornecedores.add(item.fornecedor);
    });

    const formatarOpcoes = (set) => Array.from(set).filter(Boolean).sort().map(item => ({ value: item, label: item }));

    return {
      saps: formatarOpcoes(saps),
      wbs: formatarOpcoes(wbsList),
      nfs: formatarOpcoes(nfs),
      pedidos: formatarOpcoes(pedidos),
      fabricantes: formatarOpcoes(fabricantes),
      fornecedores: formatarOpcoes(fornecedores),
      statusSaldo: [
        { value: 'TODOS', label: 'Todos os Itens' },
        { value: 'COM_SALDO', label: 'Apenas Itens com Saldo Livre' },
        { value: 'ZERADOS', label: 'Apenas Itens Zerados' },
        { value: 'TRANSFERENCIAS', label: 'Apenas Transferências WBS (Selos)' }
      ]
    };
  }, [estoque]);

  const alternarModo = (campo, modo) => {
    if (campo === 'sap') { setModoSap(modo); onFiltroChange({ target: { name: 'sap', value: '' } }); }
    if (campo === 'wbs') { setModoWbs(modo); onFiltroChange({ target: { name: 'wbs', value: '' } }); }
    if (campo === 'nf') { setModoNf(modo); onFiltroChange({ target: { name: 'nf', value: '' } }); }
    if (campo === 'pedido') { setModoPedido(modo); onFiltroChange({ target: { name: 'pedido', value: '' } }); }
  };

  const handleMultiSelectChange = (name, selectedOptions) => {
    const valores = selectedOptions ? selectedOptions.map(opt => opt.value).join(',') : '';
    onFiltroChange({ target: { name, value: valores } });
  };

  const handleRangeChange = (campo, tipo, selectedOption) => {
    let de = ''; let ate = '';
    if (filtros[campo] && filtros[campo].includes(' - ')) {
      [de, ate] = filtros[campo].split(' - ').map(s => s.trim());
    }
    if (tipo === 'de') de = selectedOption ? selectedOption.value : '';
    if (tipo === 'ate') ate = selectedOption ? selectedOption.value : '';
    onFiltroChange({ target: { name: campo, value: (de || ate) ? `${de} - ${ate}` : '' } });
  };

  const getMultiValue = (str) => {
    if (!str) return [];
    return str.split(',').filter(Boolean).map(v => ({ value: v.trim(), label: v.trim() }));
  };

  const getSingleValue = (str, options) => {
    if (!str) return options[0];
    return options.find(opt => opt.value === str) || options[0];
  };

  const getRangeValues = (campo, modo) => {
    let currentDe = null; let currentAte = null;
    if (filtros[campo] && modo === 'lote' && filtros[campo].includes(' - ')) {
      const [de, ate] = filtros[campo].split(' - ').map(s => s.trim());
      currentDe = de ? { value: de, label: de } : null;
      currentAte = ate ? { value: ate, label: ate } : null;
    }
    return { currentDe, currentAte };
  };

  const rangeSap = getRangeValues('sap', modoSap);
  const rangeWbs = getRangeValues('wbs', modoWbs);
  const rangeNf = getRangeValues('nf', modoNf);
  const rangePedido = getRangeValues('pedido', modoPedido);

  const selectStyles = {
    control: (base) => ({ ...base, borderColor: '#d1d5db', boxShadow: 'none', '&:hover': { borderColor: '#9ca3af' }, borderRadius: '0.375rem', padding: '0.1rem' }),
    multiValue: (base) => ({ ...base, backgroundColor: '#dbeafe', borderRadius: '0.25rem' }),
    multiValueLabel: (base) => ({ ...base, color: '#1e40af', fontWeight: 'bold' }),
    multiValueRemove: (base) => ({ ...base, color: '#1e40af', ':hover': { backgroundColor: '#bfdbfe', color: '#1e3a8a' } }),
    option: (base, state) => ({
      ...base,
      color: '#111827',
      backgroundColor: state.isFocused ? '#eff6ff' : 'white',
      cursor: 'pointer',
    }),
  };

  if (!aberto) return null;

  return createPortal(
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="modal-content fade-in" style={{ backgroundColor: '#fff', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>

        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase' }}>Refine sua busca</span>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>Filtros Avançados</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

            {/* BLOCO: STATUS DO SALDO */}
            <div className="filtro-card" style={{ gridColumn: '1 / -1', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Status do Estoque</label></div>
              <Select options={opcoesFiltro.statusSaldo} value={getSingleValue(filtros.status_saldo, opcoesFiltro.statusSaldo)} onChange={(opt) => onFiltroChange({ target: { name: 'status_saldo', value: opt.value } })} styles={selectStyles} />
            </div>

            {/* BLOCO: DESENHO SAP */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>Num SAP / Desenho</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('sap', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoSap === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoSap === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('sap', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoSap === 'lote' ? '#2563eb' : '#e2e8f0', color: modoSap === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoSap === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.saps} value={getMultiValue(filtros.sap)} onChange={(opts) => handleMultiSelectChange('sap', opts)} placeholder="Selecionar SAPs..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.saps} value={rangeSap.currentDe} onChange={(opt) => handleRangeChange('sap', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.saps} value={rangeSap.currentAte} onChange={(opt) => handleRangeChange('sap', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: WBS */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>WBS / Projeto</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('wbs', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoWbs === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoWbs === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('wbs', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoWbs === 'lote' ? '#2563eb' : '#e2e8f0', color: modoWbs === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoWbs === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.wbs} value={getMultiValue(filtros.wbs)} onChange={(opts) => handleMultiSelectChange('wbs', opts)} placeholder="Selecionar WBS..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.wbs} value={rangeWbs.currentDe} onChange={(opt) => handleRangeChange('wbs', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.wbs} value={rangeWbs.currentAte} onChange={(opt) => handleRangeChange('wbs', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: NOTA FISCAL */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>Nota Fiscal (NF)</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('nf', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoNf === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoNf === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('nf', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoNf === 'lote' ? '#2563eb' : '#e2e8f0', color: modoNf === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoNf === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.nfs} value={getMultiValue(filtros.nf)} onChange={(opts) => handleMultiSelectChange('nf', opts)} placeholder="Selecionar NFs..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.nfs} value={rangeNf.currentDe} onChange={(opt) => handleRangeChange('nf', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.nfs} value={rangeNf.currentAte} onChange={(opt) => handleRangeChange('nf', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: PEDIDO DE COMPRA */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>Pedido de Compra</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('pedido', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoPedido === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoPedido === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('pedido', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoPedido === 'lote' ? '#2563eb' : '#e2e8f0', color: modoPedido === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoPedido === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.pedidos} value={getMultiValue(filtros.pedido)} onChange={(opts) => handleMultiSelectChange('pedido', opts)} placeholder="Selecionar Pedidos..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.pedidos} value={rangePedido.currentDe} onChange={(opt) => handleRangeChange('pedido', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.pedidos} value={rangePedido.currentAte} onChange={(opt) => handleRangeChange('pedido', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO: FABRICANTE E FORNECEDOR */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Fabricante</label></div>
              <Select isMulti options={opcoesFiltro.fabricantes} value={getMultiValue(filtros.fabricante)} onChange={(opts) => handleMultiSelectChange('fabricante', opts)} placeholder="Ex: Weg..." styles={selectStyles} />
            </div>

            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Fornecedor</label></div>
              <Select isMulti options={opcoesFiltro.fornecedores} value={getMultiValue(filtros.fornecedor)} onChange={(opts) => handleMultiSelectChange('fornecedor', opts)} placeholder="Ex: L.M Costa..." styles={selectStyles} />
            </div>

          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <button type="button" onClick={onLimpar} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
            <XCircle size={18} /> Limpar Filtros
          </button>

          <button type="button" onClick={onClose} style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            Ver Resultados
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
