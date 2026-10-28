// =================================================================
// ARQUIVO: src/components/FiltroSolicitacoesModal/FiltroSolicitacoesModal.jsx
// DESCRIÇÃO: Filtros Avançados com Lógica de Cascata (Filtros Interdependentes)
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
  { chave: 'sap', label: 'Desenho SAP' }, 
  { chave: 'nf', label: 'Nota Fiscal' }, 
  { chave: 'pl', label: 'Nº da PL' },
  { chave: 'filial', label: 'Origem (De)' },
  { chave: 'destino', label: 'Destino (Para)' },
  { chave: 'statusExibicao', label: 'Status Atual' }
];

export default function FiltroSolicitacoesModal({ 
  aberto, onClose, dadosTabela, filtros, setFiltros, onLimpar
}) {

  // Função auxiliar para cruzar dados: checa se a linha passa num filtro específico
  const passaNoFiltro = (valorItem, valorFiltro) => {
    if (!valorFiltro) return true;
    const tagsArray = String(valorFiltro).split(',');
    return tagsArray.includes(String(valorItem));
  };

  // ✨ LÓGICA DE CASCATA: Gera as opções respeitando as outras seleções já feitas!
  const opcoesMapeadas = useMemo(() => {
    if (!aberto) return {}; // Otimização: Não processa se o modal estiver fechado

    const mapaOpcoes = {};

    CAMPOS_FILTRO.forEach(({ chave }) => {
      const valoresUnicos = new Set();

      dadosTabela.forEach(item => {
        // 1. CHECAGEM CRUZADA (CASCATA)
        // Antes de extrair o valor para este dropdown, verifica se esta linha
        // sobrevive aos OUTROS filtros que o utilizador já aplicou.
        let sobreviveAosOutrosFiltros = true;
        
        for (const campo of CAMPOS_FILTRO) {
          const outraChave = campo.chave;
          const valorFiltroAtivo = filtros[outraChave];
          
          // Ignora o próprio campo que estamos a construir e filtros vazios
          if (outraChave === chave || !valorFiltroAtivo) continue;

          let bateu = false;
          const listaItens = item.itensRaw || item.itens || [];

          if (outraChave === 'wbs') {
            bateu = passaNoFiltro(item.wbs, valorFiltroAtivo) || listaItens.some(it => passaNoFiltro(it.wbs_element || it.wbs, valorFiltroAtivo));
          } else if (outraChave === 'sap') {
            bateu = listaItens.some(it => passaNoFiltro(it.desenho_sap_manual || it.desenho_sap, valorFiltroAtivo));
          } else if (outraChave === 'nf') {
            bateu = passaNoFiltro(item.nfCrossdocking, valorFiltroAtivo) || listaItens.some(it => passaNoFiltro(it.nf_entrada || it.nfEntrada || it.nf, valorFiltroAtivo));
          } else {
            bateu = passaNoFiltro(item[outraChave], valorFiltroAtivo);
          }

          if (!bateu) {
            sobreviveAosOutrosFiltros = false;
            break;
          }
        }

        // Se a linha foi reprovada por outro filtro (ex: outra filial), ela NÃO entra na lista de opções
        if (!sobreviveAosOutrosFiltros) return;

        // 2. EXTRAÇÃO DE VALORES (A linha sobreviveu, logo os seus dados podem ir para o Dropdown)
        const listaItens = item.itensRaw || item.itens || [];

        if (chave !== 'sap' && chave !== 'nf') {
          const val = item[chave];
          if (val && val !== '—' && val !== '-' && val !== 'Não informado') {
            valoresUnicos.add(val);
          }
        }

        if ((chave === 'wbs' || chave === 'sap' || chave === 'nf') && listaItens.length > 0) {
          listaItens.forEach(it => {
            if (chave === 'wbs') {
              const v = it.wbs_element || it.wbs;
              if (v && v !== '-' && v !== '—') valoresUnicos.add(v);
            }
            if (chave === 'sap') {
              const v = it.desenho_sap_manual || it.desenho_sap;
              if (v && v !== '-' && v !== '—') valoresUnicos.add(v);
            }
            if (chave === 'nf') {
              const v = it.nf_entrada || it.nfEntrada || it.nf || item.nfCrossdocking;
              if (v && v !== '-' && v !== '—') valoresUnicos.add(v);
            }
          });
        }
      });

      // Ordena alfabeticamente para facilitar a procura
      mapaOpcoes[chave] = Array.from(valoresUnicos).sort().map(val => ({
        value: val,
        label: String(val)
      }));
    });

    return mapaOpcoes;
  }, [dadosTabela, filtros, aberto]);

  const getMultiValue = (str) => {
    if (!str) return [];
    return str.split(',').filter(Boolean).map(v => ({ value: v.trim(), label: v.trim() }));
  };

  const handleMultiSelectChange = (campoChave, selectedOptions) => {
    const valores = selectedOptions ? selectedOptions.map(opt => opt.value).join(',') : '';
    setFiltros({ ...filtros, [campoChave]: valores });
  };

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
    multiValue: (base) => ({ ...base, backgroundColor: '#dbeafe', borderRadius: '0.25rem' }),
    multiValueLabel: (base) => ({ ...base, color: '#1e40af', fontWeight: 'bold' }),
    multiValueRemove: (base) => ({ ...base, color: '#1e40af', ':hover': { backgroundColor: '#bfdbfe', color: '#1e3a8a' } }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#334155',
    })
  };

  if (!aberto) return null;

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Refine a sua listagem com precisão</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>Filtros de Solicitações</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {CAMPOS_FILTRO.map((campo) => (
            <div key={campo.chave} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>{campo.label}</label>
              <Select 
                isMulti
                options={opcoesMapeadas[campo.chave] || []}
                value={getMultiValue(filtros[campo.chave])}
                onChange={(opts) => handleMultiSelectChange(campo.chave, opts)}
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
