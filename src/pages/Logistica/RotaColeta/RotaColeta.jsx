import React, { useState, useEffect, useContext } from 'react';
import { Truck, MapPin, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import './RotaColeta.css';

export default function RotaColeta() {
  // ✨ Puxamos as filiais dinâmicas do nosso contexto global
  const { filiaisGlobais } = useContext(AuthContext);
  const { showAlert, showConfirm } = useAlert();

  const [rotas, setRotas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  const [novaRota, setNovaRota] = useState({
    origem: '',
    destino: '',
    frequencia: 'Diária',
    horario: '',
    motorista: ''
  });

  useEffect(() => {
    // Exemplo de fetch genérico (ajuste conforme a sua API real)
    const buscarRotas = async () => {
      try {
        setCarregando(true);
        const resposta = await apiFetch('/rotas/listar');
        if (resposta.sucesso) {
          setRotas(resposta.dados || []);
        }
      } catch (error) {
        console.warn("Rota de coleta não implementada no backend ainda. A usar dados vazios.");
      } finally {
        setCarregando(false);
      }
    };
    buscarRotas();
  }, []);

  const handleAdicionarRota = async () => {
    if (!novaRota.origem || !novaRota.destino) {
      showAlert("Campos Obrigatórios", "Selecione a filial de origem e de destino.", "warning");
      return;
    }
    if (novaRota.origem === novaRota.destino) {
      showAlert("Ação Inválida", "A origem e o destino não podem ser a mesma filial.", "error");
      return;
    }

    try {
      const resposta = await apiFetch('/rotas/criar', {
        method: 'POST',
        body: JSON.stringify(novaRota)
      });

      if (resposta.sucesso) {
        showAlert("Sucesso!", "Rota adicionada com sucesso.", "success");
        setRotas([...rotas, { ...novaRota, id: Date.now() }]);
        setNovaRota({ origem: '', destino: '', frequencia: 'Diária', horario: '', motorista: '' });
      } else {
        showAlert("Erro", resposta.erro || "Falha ao criar rota.", "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", "Falha ao comunicar com o servidor.", "error");
    }
  };

  const handleRemoverRota = async (id) => {
    const confirmado = await showConfirm("Remover Rota", "Tem certeza que deseja apagar esta rota de coleta?", "error", "Sim, Apagar");
    if (!confirmado) return;

    try {
      await apiFetch(`/rotas/${id}`, { method: 'DELETE' });
      setRotas(rotas.filter(r => r.id !== id));
      showAlert("Removida", "A rota foi apagada do sistema.", "success");
    } catch (error) {
      showAlert("Erro", "Não foi possível remover a rota.", "error");
    }
  };

  const rotasFiltradas = rotas.filter(r => 
    r.origem.toLowerCase().includes(termoPesquisa.toLowerCase()) || 
    r.destino.toLowerCase().includes(termoPesquisa.toLowerCase())
  );

  return (
    <div className="rota-coleta-wrapper" style={{ padding: '32px', backgroundColor: '#f4f5f7', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Gestão de Rotas de Coleta</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Configure os fluxos de transporte entre as filiais dinâmicas do STOCKLog.</p>
      </header>

      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>
          <Truck size={20} color="#2563eb" /> Cadastrar Nova Rota
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', alignItems: 'end' }}>
          
          {/* ✨ SELECTS DINÂMICOS ALIMENTADOS PELA BASE DE DADOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>ORIGEM *</label>
            <select 
              value={novaRota.origem} 
              onChange={e => setNovaRota({...novaRota, origem: e.target.value})}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none' }}
            >
              <option value="">Selecione...</option>
              {filiaisGlobais.map(filial => (
                <option key={filial.id} value={filial.id}>{filial.id} — {filial.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>DESTINO *</label>
            <select 
              value={novaRota.destino} 
              onChange={e => setNovaRota({...novaRota, destino: e.target.value})}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none' }}
            >
              <option value="">Selecione...</option>
              {filiaisGlobais.map(filial => (
                <option key={filial.id} value={filial.id}>{filial.id} — {filial.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>FREQUÊNCIA</label>
            <select 
              value={novaRota.frequencia} 
              onChange={e => setNovaRota({...novaRota, frequencia: e.target.value})}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none' }}
            >
              <option value="Diária">Diária</option>
              <option value="Semanal">Semanal</option>
              <option value="Sob Demanda">Sob Demanda</option>
            </select>
          </div>

          <button 
            onClick={handleAdicionarRota}
            style={{ padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '39px' }}
          >
            <Plus size={16} /> Adicionar Rota
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Rotas Ativas</h3>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Pesquisar filial..." 
              value={termoPesquisa}
              onChange={e => setTermoPesquisa(e.target.value)}
              style={{ padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Origem</th>
              <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Destino</th>
              <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Frequência</th>
              <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
            ) : rotasFiltradas.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Nenhuma rota configurada.</td></tr>
            ) : (
              rotasFiltradas.map(rota => (
                <tr key={rota.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1e293b' }}><MapPin size={14} color="#3b82f6" style={{ display: 'inline', marginRight: '6px' }}/> {rota.origem}</td>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1e293b' }}><MapPin size={14} color="#10b981" style={{ display: 'inline', marginRight: '6px' }}/> {rota.destino}</td>
                  <td style={{ padding: '16px 20px', color: '#475569' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>{rota.frequencia}</span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <button onClick={() => handleRemoverRota(rota.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}