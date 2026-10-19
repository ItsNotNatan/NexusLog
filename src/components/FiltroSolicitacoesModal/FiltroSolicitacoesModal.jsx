// =================================================================
// ARQUIVO: src/components/FiltroSolicitacoesModal/FiltroSolicitacoesModal.jsx
// =================================================================
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';

const XCircle = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
);
const X = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

const CAMPOS_FILTRO = [
  { chave: 'tipo', label: 'Tipo de Operação' },
  { chave: 'id', label: 'ID (PS)' },
  { chave: 'solicitante', label: 'Solicitante' },
  { chave: 'wbs', label: 'WBS / Projeto' },
  { chave: 'pl', label: 'Nº da PL' },
  { chave: 'filial', label: 'Origem (De)' },
  { chave: 'destino', label: 'Destino (Para)' },
  { chave: 'statusExibicao', label: 'Status Atual' }
];

export default function FiltroSolicitacoesModal({ 
  aberto, onClose, dadosTabela, filtros, setFiltros, onLimpar
}) {
  
  // Extrai as opções únicas baseadas nos dados reais da tabela
  const opcoesMapeadas = useMemo(() => {
    const mapaOpcoes = {};
    
    CAMPOS_FILTRO.forEach(({ chave }) => {
      const valoresUnicos = new Set(
        dadosTabela
          .map(item => item[chave])
          .filter(v => v !== null && v !== undefined && v !== '' && v !== '—' && v !== '-' && v !== 'Não informado')
      );
      
      mapaOpcoes[chave] = Array.from(valoresUnicos).sort().map(val => ({
        value: val,
        label: String(val)
      }));
    });

    return mapaOpcoes;
  }, [dadosTabela]);

  const temFiltroAtivo = Object.values(filtros).some(valor => valor !== null && valor !== '');

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1',
      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
      borderRadius: '8px',
      padding: '0px',
      minHeight: '36px',
      fontSize: '0.875rem',
      '&:hover': { borderColor: '#94a3b8' }
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#334155',
    })
  };

  if (!aberto) return null;

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Refine a sua listagem com precisão</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>Filtros de Solicitações</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {CAMPOS_FILTRO.map((campo) => (
            <div key={campo.chave} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>{campo.label}</label>
              <Select 
                options={opcoesMapeadas[campo.chave] || []}
                value={filtros[campo.chave] || null}
                onChange={(opt) => setFiltros({ ...filtros, [campo.chave]: opt })}
                placeholder={`Qualquer ${campo.label.toLowerCase()}...`}
                isClearable
                styles={selectStyles}
                noOptionsMessage={() => "Sem dados"}
              />
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {temFiltroAtivo && (
              <button onClick={onLimpar} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px' }}>
                <XCircle size={16} /> Limpar Filtros
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
            Aplicar e Fechar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
