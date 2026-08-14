import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, Archive, Calendar, User, MapPin, Hash } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';

export default function Traceabilly({ perfil }) {
  // ✨ Filiais globais
  const { estoqueAtual, filiaisGlobais } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // ✨ Função Dinâmica de formatação
  const obterNomeFilialDinamico = (codigo) => {
    if (!codigo || codigo === '-') return 'N/D';
    const codLimpo = String(codigo).toUpperCase().trim();
    const filialEncontrada = filiaisGlobais.find(f => f.id === codLimpo);
    return filialEncontrada ? filialEncontrada.nome : codigo;
  };

  useEffect(() => {
    const buscarHistorico = async () => {
      try {
        setCarregando(true);
        const urlParams = estoqueAtual === 'TODOS' ? '?limit=1000' : `?filial=${estoqueAtual}&limit=1000`;
        const resposta = await apiFetch(`/solicitacoes/listar${urlParams}`);
        
        if (resposta.sucesso) {
          // Filtramos para mostrar apenas coisas que já mexeram no estoque (Em Separação, Concluído, Reintegrado)
          const movimentos = resposta.dados.filter(sol => 
            sol.status === 'Em Separação' || sol.status === 'Concluído' || sol.status === 'Reintegrado' || sol.status === 'Cancelado'
          );
          setHistorico(movimentos);
        } else {
          showAlert("Erro", resposta.erro, "error");
        }
      } catch (error) {
        showAlert("Erro de Conexão", "Não foi possível carregar o histórico de movimentações.", "error");
      } finally {
        setCarregando(false);
      }
    };
    buscarHistorico();
  }, [estoqueAtual, showAlert]);

  const historicoFiltrado = historico.filter(item => 
    (item.ps && item.ps.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.solicitante && item.solicitante.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.wbs && item.wbs.toLowerCase().includes(termoPesquisa.toLowerCase()))
  );

  return (
    <div style={{ padding: '32px', backgroundColor: '#f4f5f7', minHeight: '100vh', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Histórico de Rastreabilidade</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Consulte o histórico imutável de todas as movimentações de estoque do STOCKLog.</p>
      </header>

      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por PS, Solicitante, WBS..." 
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>{historicoFiltrado.length} registos encontrados</span>
        </div>

        <div style={{ padding: '24px' }}>
          {carregando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', display: 'block' }} /> A sincronizar histórico...</div>
          ) : historicoFiltrado.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><Archive size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px auto' }} /> Nenhum movimento registado no sistema.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {historicoFiltrado.map(mov => (
                <div key={mov.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '20px', transition: 'box-shadow 0.2s' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Data Registo</span>
                    <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '700', textAlign: 'center' }}>{mov.dataSolicitacao.split(' ')[0]}<br/><span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>{mov.dataSolicitacao.split(' ')[1]}</span></span>
                  </div>

                  <div style={{ width: '1px', backgroundColor: '#e2e8f0', alignSelf: 'stretch' }}></div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ backgroundColor: mov.tipo === 'Entrada' ? '#ecfdf5' : mov.tipo === 'Cancelado' ? '#fef2f2' : '#eff6ff', color: mov.tipo === 'Entrada' ? '#10b981' : mov.tipo === 'Cancelado' ? '#ef4444' : '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: `1px solid ${mov.tipo === 'Entrada' ? '#a7f3d0' : mov.tipo === 'Cancelado' ? '#fecaca' : '#bfdbfe'}` }}>
                        {mov.tipo.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}><Hash size={14}/> {mov.ps}</span>
                      {mov.pl && mov.pl !== '-' && <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{mov.pl}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '0.85rem', color: '#475569', marginTop: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} color="#94a3b8"/> {mov.solicitante}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} color="#94a3b8"/> 
                        {/* ✨ NOME DA FILIAL TRADUZIDO DE FORMA DINÂMICA */}
                        {obterNomeFilialDinamico(mov.filial)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="#94a3b8"/> WBS: <strong style={{ color: '#2563eb' }}>{mov.wbs}</strong></span>
                    </div>

                    {mov.observacoes && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#f8fafc', borderLeft: '3px solid #cbd5e1', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', borderRadius: '0 4px 4px 0' }}>
                        "{mov.observacoes}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}