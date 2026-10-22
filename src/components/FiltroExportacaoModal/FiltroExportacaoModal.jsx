// =================================================================
// ARQUIVO: src/components/FiltroExportacaoModal/FiltroExportacaoModal.jsx
// =================================================================
import React from 'react';
import { X, Filter, Trash2 } from 'lucide-react';

export default function FiltroExportacaoModal({ aberto, onClose, filtros, setFiltros, onLimpar, opcoesStatus }) {
  if (!aberto) return null;

  const handleChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '450px', maxWidth: '95%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Filter size={20} color="#2563eb" /> Filtros Avançados
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Solicitante</label>
              <input type="text" value={filtros.solicitante || ''} onChange={(e) => handleChange('solicitante', e.target.value)} placeholder="Ex: Patrick..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>WBS</label>
              <input type="text" value={filtros.wbs || ''} onChange={(e) => handleChange('wbs', e.target.value)} placeholder="Ex: BRBC..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Nº da PL</label>
            <input type="text" value={filtros.pl || ''} onChange={(e) => handleChange('pl', e.target.value)} placeholder="Ex: 356" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Período de Criação</label>
            <select value={filtros.periodo} onChange={(e) => handleChange('periodo', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none' }}>
              <option value="Todo Período">Todo Período</option>
              <option value="Este Mês">Este Mês</option>
              <option value="Semana Passada">Semana Passada</option>
              <option value="Hoje">Hoje</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Status</label>
              <select value={filtros.status} onChange={(e) => handleChange('status', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none' }}>
                {opcoesStatus.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tipo</label>
              <select value={filtros.tipo} onChange={(e) => handleChange('tipo', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none' }}>
                <option value="Todos">Todos os Tipos</option>
                <option value="Material">Material</option>
                <option value="Entrada">Entrada</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>SLA (Target)</label>
            <select value={filtros.target} onChange={(e) => handleChange('target', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none' }}>
              <option value="Todos">Mostrar Todos</option>
              <option value="Dentro">Dentro do Target</option>
              <option value="Fora">Fora do Target</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onLimpar} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer' }}><Trash2 size={16} /> Limpar</button>
          <button onClick={onClose} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Aplicar Filtros</button>
        </div>

      </div>
    </div>
  );
}
