// =================================================================
// ARQUIVO: src/components/FiltroExportacaoModal/FiltroExportacaoModal.jsx
// DESCRIÇÃO: Modal reutilizável para filtros avançados na exportação.
// =================================================================
import React from 'react';
import { X, Filter, Trash2 } from 'lucide-react';

export default function FiltroExportacaoModal({ 
  aberto, 
  onClose, 
  filtros, 
  setFiltros, 
  onLimpar, 
  opcoesStatus 
}) {
  if (!aberto) return null;

  const handleChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '400px', maxWidth: '90%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Filter size={20} color="#2563eb" /> Filtros Avançados
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Período de Criação</label>
            <select value={filtros.periodo} onChange={(e) => handleChange('periodo', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#f8fafc', outline: 'none' }}>
              <option value="Todo Período">Todo Período</option>
              <option value="Este Mês">Este Mês</option>
              <option value="Semana Passada">Semana Passada</option>
              <option value="Hoje">Hoje</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Status da Solicitação</label>
            <select value={filtros.status} onChange={(e) => handleChange('status', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#f8fafc', outline: 'none' }}>
              {opcoesStatus.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tipo de Demanda</label>
            <select value={filtros.tipo} onChange={(e) => handleChange('tipo', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#f8fafc', outline: 'none' }}>
              <option value="Todos">Todos os Tipos</option>
              <option value="Material">Material</option>
              <option value="Entrada">Entrada</option>
              <option value="Crossdocking">Crossdocking</option>
              <option value="Nota Fiscal">Nota Fiscal</option>
              <option value="Transferencia WBS">Transferência WBS</option>
              <option value="Reintegracao">Reintegração</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Cumprimento de Target (SLA)</label>
            <select value={filtros.target} onChange={(e) => handleChange('target', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', backgroundColor: '#f8fafc', outline: 'none' }}>
              <option value="Todos">Mostrar Todos</option>
              <option value="Dentro">Apenas Dentro do Target</option>
              <option value="Fora">Apenas Fora do Target (Atrasados)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onLimpar} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
            <Trash2 size={16} /> Limpar
          </button>
          <button onClick={onClose} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', transition: 'background 0.2s' }}>
            Aplicar Filtros
          </button>
        </div>

      </div>
    </div>
  );
}
