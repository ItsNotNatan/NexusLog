// =================================================================
// ARQUIVO: src/components/FiltroSolicitacoesModal/FiltroSolicitacoesModal.jsx
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

export default function FiltroSolicitacoesModal({ 
  dadosTabela, filtros, onFiltroChange, onLimpar, aberto, onClose 
}) {
  
  // Estados para os botões "Tags | Intervalo"
  const [modoId, setModoId] = useState('especifico');
  const [modoWbs, setModoWbs] = useState('especifico');
  const [modoPl, setModoPl] = useState('especifico');
  const [modoDataCriacao, setModoDataCriacao] = useState('especifico');
  const [modoDataEntrega, setModoDataEntrega] = useState('especifico');

  // Extração automática de opções únicas
  const opcoesFiltro = useMemo(() => {
    const tipos = new Set();
    const ids = new Set();
    const solicitantes = new Set();
    const wbsList = new Set();
    const pls = new Set();
    const filiais = new Set();
    const destinos = new Set();
    const datasCriacao = new Set();
    const datasEntrega = new Set();
    const statusList = new Set();

    dadosTabela.forEach(item => {
      if (item.tipo) tipos.add(item.tipo);
      if (item.id) ids.add(item.id);
      if (item.solicitante && item.solicitante !== 'Não informado') solicitantes.add(item.solicitante);
      if (item.wbs && item.wbs !== '—') wbsList.add(item.wbs);
      if (item.pl && item.pl !== '-') pls.add(item.pl);
      if (item.filial && item.filial !== '-') filiais.add(item.filial);
      if (item.destino && item.destino !== 'Não informado') destinos.add(item.destino);
      if (item.dataSolicitacao && item.dataSolicitacao !== '-') datasCriacao.add(item.dataSolicitacao);
      if (item.dataEntrega && item.dataEntrega !== '-' && item.dataEntrega !== '—') datasEntrega.add(item.dataEntrega);
      if (item.statusExibicao) statusList.add(item.statusExibicao);
    });

    const formatarOpcoes = (set) => Array.from(set).filter(Boolean).sort().map(item => ({ value: item, label: String(item) }));

    return {
      tipos: formatarOpcoes(tipos),
      ids: formatarOpcoes(ids),
      solicitantes: formatarOpcoes(solicitantes),
      wbs: formatarOpcoes(wbsList),
      pls: formatarOpcoes(pls),
      filiais: formatarOpcoes(filiais),
      destinos: formatarOpcoes(destinos),
      datasCriacao: formatarOpcoes(datasCriacao),
      datasEntrega: formatarOpcoes(datasEntrega),
      statusList: formatarOpcoes(statusList)
    };
  }, [dadosTabela]);

  const alternarModo = (campo, modo) => {
    if (campo === 'id') { setModoId(modo); onFiltroChange({ target: { name: 'id', value: '' } }); }
    if (campo === 'wbs') { setModoWbs(modo); onFiltroChange({ target: { name: 'wbs', value: '' } }); }
    if (campo === 'pl') { setModoPl(modo); onFiltroChange({ target: { name: 'pl', value: '' } }); }
    if (campo === 'dataCriacao') { setModoDataCriacao(modo); onFiltroChange({ target: { name: 'dataCriacao', value: '' } }); }
    if (campo === 'dataEntrega') { setModoDataEntrega(modo); onFiltroChange({ target: { name: 'dataEntrega', value: '' } }); }
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

  const getRangeValues = (campo, modo) => {
    let currentDe = null; let currentAte = null;
    if (filtros[campo] && modo === 'lote' && filtros[campo].includes(' - ')) {
      const [de, ate] = filtros[campo].split(' - ').map(s => s.trim());
      currentDe = de ? { value: de, label: de } : null;
      currentAte = ate ? { value: ate, label: ate } : null;
    }
    return { currentDe, currentAte };
  };

  const rangeId = getRangeValues('id', modoId);
  const rangeWbs = getRangeValues('wbs', modoWbs);
  const rangePl = getRangeValues('pl', modoPl);
  const rangeDataC = getRangeValues('dataCriacao', modoDataCriacao);
  const rangeDataE = getRangeValues('dataEntrega', modoDataEntrega);

  const temFiltroAtivo = Object.values(filtros).some(valor => valor !== null && valor !== '');

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

            {/* BLOCO 1: STATUS DA SOLICITAÇÃO E TIPO */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Status da Solicitação</label></div>
              <Select isMulti options={opcoesFiltro.statusList} value={getMultiValue(filtros.statusExibicao)} onChange={(opts) => handleMultiSelectChange('statusExibicao', opts)} placeholder="Ex: Concluído..." styles={selectStyles} />
            </div>

            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Tipo de Operação</label></div>
              <Select isMulti options={opcoesFiltro.tipos} value={getMultiValue(filtros.tipo)} onChange={(opts) => handleMultiSelectChange('tipo', opts)} placeholder="Ex: Entrada..." styles={selectStyles} />
            </div>

            {/* BLOCO 2: ID (PS) COM TAGS / INTERVALO */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>ID da Solicitação (PS)</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('id', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoId === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoId === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('id', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoId === 'lote' ? '#2563eb' : '#e2e8f0', color: modoId === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoId === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.ids} value={getMultiValue(filtros.id)} onChange={(opts) => handleMultiSelectChange('id', opts)} placeholder="Selecionar IDs..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.ids} value={rangeId.currentDe} onChange={(opt) => handleRangeChange('id', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.ids} value={rangeId.currentAte} onChange={(opt) => handleRangeChange('id', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO 3: WBS COM TAGS / INTERVALO */}
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

            {/* BLOCO 4: Nº DA PL COM TAGS / INTERVALO */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>Nº da PL</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('pl', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoPl === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoPl === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('pl', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoPl === 'lote' ? '#2563eb' : '#e2e8f0', color: modoPl === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoPl === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.pls} value={getMultiValue(filtros.pl)} onChange={(opts) => handleMultiSelectChange('pl', opts)} placeholder="Selecionar PLs..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.pls} value={rangePl.currentDe} onChange={(opt) => handleRangeChange('pl', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.pls} value={rangePl.currentAte} onChange={(opt) => handleRangeChange('pl', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            {/* BLOCO 5: SOLICITANTE */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Solicitante</label></div>
              <Select isMulti options={opcoesFiltro.solicitantes} value={getMultiValue(filtros.solicitante)} onChange={(opts) => handleMultiSelectChange('solicitante', opts)} placeholder="Selecionar Solicitantes..." styles={selectStyles} />
            </div>

            {/* BLOCO 6: DE -> PARA */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Origem (De)</label></div>
              <Select isMulti options={opcoesFiltro.filiais} value={getMultiValue(filtros.filial)} onChange={(opts) => handleMultiSelectChange('filial', opts)} placeholder="Selecionar Origem..." styles={selectStyles} />
            </div>

            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}><label style={{ fontWeight: '600', color: '#334155' }}>Destino (Para)</label></div>
              <Select isMulti options={opcoesFiltro.destinos} value={getMultiValue(filtros.destino)} onChange={(opts) => handleMultiSelectChange('destino', opts)} placeholder="Selecionar Destino..." styles={selectStyles} />
            </div>

            {/* BLOCO 7: DATAS COM TAGS / INTERVALO */}
            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>Data de Criação</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('dataCriacao', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoDataCriacao === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoDataCriacao === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('dataCriacao', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoDataCriacao === 'lote' ? '#2563eb' : '#e2e8f0', color: modoDataCriacao === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoDataCriacao === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.datasCriacao} value={getMultiValue(filtros.dataCriacao)} onChange={(opts) => handleMultiSelectChange('dataCriacao', opts)} placeholder="Selecionar Datas..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.datasCriacao} value={rangeDataC.currentDe} onChange={(opt) => handleRangeChange('dataCriacao', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.datasCriacao} value={rangeDataC.currentAte} onChange={(opt) => handleRangeChange('dataCriacao', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

            <div className="filtro-card" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>Data de Entrega</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => alternarModo('dataEntrega', 'especifico')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoDataEntrega === 'especifico' ? '#2563eb' : '#e2e8f0', color: modoDataEntrega === 'especifico' ? 'white' : '#64748b', cursor: 'pointer' }}>Tags</button>
                  <button onClick={() => alternarModo('dataEntrega', 'lote')} style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: modoDataEntrega === 'lote' ? '#2563eb' : '#e2e8f0', color: modoDataEntrega === 'lote' ? 'white' : '#64748b', cursor: 'pointer' }}>Intervalo</button>
                </div>
              </div>
              {modoDataEntrega === 'especifico' ? (
                <Select isMulti options={opcoesFiltro.datasEntrega} value={getMultiValue(filtros.dataEntrega)} onChange={(opts) => handleMultiSelectChange('dataEntrega', opts)} placeholder="Selecionar Datas..." styles={selectStyles} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.datasEntrega} value={rangeDataE.currentDe} onChange={(opt) => handleRangeChange('dataEntrega', 'de', opt)} placeholder="De" styles={selectStyles} isClearable /></div>
                  <span style={{ color: '#94a3b8' }}>até</span>
                  <div style={{ flex: 1 }}><Select options={opcoesFiltro.datasEntrega} value={rangeDataE.currentAte} onChange={(opt) => handleRangeChange('dataEntrega', 'ate', opt)} placeholder="Até" styles={selectStyles} isClearable /></div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <div>
            {temFiltroAtivo && (
              <button type="button" onClick={onLimpar} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                <XCircle size={18} /> Limpar Filtros
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            Ver Resultados
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
