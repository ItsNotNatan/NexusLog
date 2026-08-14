import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, PackageOpen, Download } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import './VisaoGeralEstoque.css'; // Mantenha o seu CSS atual!

export default function VisaoGeralEstoque({ perfil }) {
  // ✨ Puxamos as filiais globais
  const { estoqueAtual, filiaisGlobais } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [estoque, setEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // ✨ Função Dinâmica de formatação
  const obterNomeFilialDinamico = (codigo) => {
    if (!codigo || codigo === '-') return 'N/D';
    const codLimpo = String(codigo).toUpperCase().trim();
    if (codLimpo === "TODOS") return "Todas as Filiais";
    const filialEncontrada = filiaisGlobais.find(f => f.id === codLimpo);
    return filialEncontrada ? filialEncontrada.nome : codigo;
  };

  useEffect(() => {
    const buscarEstoque = async () => {
      try {
        setCarregando(true);
        const urlEstoque = estoqueAtual === 'TODOS' ? '/estoque/listar' : `/estoque/listar?filial_id=${estoqueAtual}`;
        const resposta = await apiFetch(urlEstoque);
        
        if (resposta.sucesso) {
          setEstoque(resposta.dados || []);
        } else {
          showAlert("Erro", resposta.erro || "Falha ao buscar estoque", "error");
        }
      } catch (error) {
        showAlert("Erro de Conexão", "Não foi possível carregar os dados.", "error");
      } finally {
        setCarregando(false);
      }
    };
    buscarEstoque();
  }, [estoqueAtual, showAlert]);

  const estoqueFiltrado = estoque.filter(item => 
    (item.desenho_sap && item.desenho_sap.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.part_number && item.part_number.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.descricao && item.descricao.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.wbs && item.wbs.toLowerCase().includes(termoPesquisa.toLowerCase()))
  );

  return (
    <div style={{ padding: '32px', backgroundColor: '#f4f5f7', minHeight: '100vh', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Consulta de Estoque</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Visão geral em tempo real dos materiais disponíveis no STOCKLog.</p>
        </div>
      </header>

      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por SAP, PN, Descrição, WBS..." 
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total: {estoqueFiltrado.length} registos</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>Filial</th>
                <th style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>Desenho SAP</th>
                <th style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>Part Number</th>
                <th style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>Descrição</th>
                <th style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Saldo</th>
                <th style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>Alocação</th>
                <th style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>WBS</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><Loader2 className="animate-spin" size={28} style={{ margin: '0 auto' }} /></td></tr>
              ) : estoqueFiltrado.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><PackageOpen size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px auto' }} /> Nenhum material encontrado.</td></tr>
              ) : (
                estoqueFiltrado.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px', fontSize: '0.85rem' }}>
                      {/* ✨ A FILIAL AGORA É TRADUZIDA PELA BASE DE DADOS */}
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                        {obterNomeFilialDinamico(item.filial_id || item.filial)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: '#2563eb', fontWeight: '600' }}>{item.desenho_sap}</td>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' }}>{item.part_number}</td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontSize: '0.85rem' }}>{item.descricao}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: '#10b981', fontWeight: '700' }}>{item.quantidade_disponivel} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.unidade_medida || 'Un'}</span></td>
                    <td style={{ padding: '16px 24px', color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.alocacao || '-'}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '0.85rem' }}>{item.wbs || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}