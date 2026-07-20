import React, { useState, useEffect } from 'react';
import { Search, Boxes, Loader2, MapPin } from 'lucide-react';
import './VisaoGeralEstoque.css'; 

export default function VisaoGeralEstoque({ perfil = 'logistica' }) {
  // --- 1. VARIÁVEIS DE ESTADO ---
  const [dadosEstoque, setDadosEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  const tituloPagina = perfil === 'cliente' ? 'Consulta de Estoque' : 'Visão Geral do Estoque';
  const subtituloPagina = perfil === 'cliente' 
    ? 'Consulte a disponibilidade de materiais em tempo real.' 
    : 'Painel de controle do saldo físico de todas as filiais.';

  // --- 2. CONEXÃO COM O BACKEND VIA API ---
  useEffect(() => {
    const carregarEstoqueDoBackend = async () => {
      try {
        setCarregando(true);

        // 🚀 Faz a chamada para a nova rota que ativamos no teu Node.js (Porta 3001)
        const resposta = await fetch('http://localhost:3001/api/estoque/listar');
        const resultado = await resposta.json();

        // Valida se a requisição correu bem e se o backend retornou sucesso
        if (!resposta.ok || !resultado.sucesso) {
          throw new Error(resultado.erro || 'Falha ao buscar dados do servidor.');
        }

        // Mapeamos os dados vindos da propriedade `.dados` do teu Backend
        const estoqueTratado = (resultado.dados || []).map((item) => ({
          ...item,
          part_number: item.part_number || 'Sem PN',
          descricao: item.descricao || 'Sem descrição',
          alocacao: item.alocacao || 'Pendente',
          filial: item.filial_id || 'Geral', 
          quantidade_disponivel: item.quantidade_disponivel || 0
        }));
        
        // Ordena a lista por Part Number para melhor organização visual
        estoqueTratado.sort((a, b) => a.part_number.localeCompare(b.part_number));
        setDadosEstoque(estoqueTratado);

      } catch (erro) {
        console.error("Erro capturado no carregamento do estoque:", erro.message);
        alert("❌ [ERRO] Não foi possível carregar o estoque do servidor: " + erro.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarEstoqueDoBackend();
  }, []);

  // --- 3. BARRA DE PESQUISA FILTRADA ---
  const dadosFiltrados = dadosEstoque.filter((item) => {
    const termo = termoPesquisa.toLowerCase();
    return (
      (item.part_number && item.part_number.toLowerCase().includes(termo)) ||
      (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
      (item.alocacao && item.alocacao.toLowerCase().includes(termo)) ||
      (item.filial && item.filial.toLowerCase().includes(termo))
    );
  });

  // --- 4. RENDERIZAÇÃO DA INTERFACE (JSX) ---
  return (
    <div style={{ padding: '32px', backgroundColor: '#f4f5f7', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* CABEÇALHO DINÂMICO */}
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>
          {tituloPagina}
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
          {subtituloPagina}
        </p>
      </header>

      {/* CARD DA TABELA */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        
        {/* Barra Superior com Input de Pesquisa */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por PN, Descrição, Alocação ou Filial..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.875rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '999px' }}>
            {dadosFiltrados.length} materiais globais
          </span>
        </div>

        {/* Tabela de Dados Física */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          {carregando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader2 size={32} className="animate-spin" color="#2563eb" />
              <span>A ler dados do servidor local...</span>
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Boxes size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
              <p style={{ margin: 0 }}>Nenhum saldo de estoque encontrado no sistema.</p>
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Filial</th>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Part Number</th>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Descrição do Material</th>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Alocação</th>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '0.875rem', color: '#475569', fontWeight: '600' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                        <MapPin size={14} color="#2563eb" /> {item.filial}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.875rem', fontWeight: '600', fontFamily: 'monospace', color: '#1e293b' }}>
                      {item.part_number}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.875rem', color: '#334155' }}>
                      {item.descricao}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.875rem', color: '#2563eb', fontWeight: '500', fontFamily: 'monospace' }}>
                      {item.alocacao}
                    </td>
                    <td style={{ padding: '16px', fontSize: '1rem', fontWeight: '700', color: '#10b981', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                      {Number(item.quantidade_disponivel).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}