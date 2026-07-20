import React, { useState, useEffect } from 'react';
import { Search, Boxes, Loader2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import './VisaoGeralEstoque.css'; 

export default function VisaoGeralEstoque({ perfil = 'logistica' }) {
  const [dadosEstoque, setDadosEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  const tituloPagina = perfil === 'cliente' ? 'Consulta de Estoque' : 'Visão Geral do Estoque';
  const subtituloPagina = perfil === 'cliente' 
    ? 'Consulte a disponibilidade de materiais em tempo real.' 
    : 'Painel de controle do saldo físico da filial atual.';

  useEffect(() => {
    const carregarEstoque = async () => {
      try {
        setCarregando(true);

        // 1. Busca os dados da tabela estoque E cruza com a tabela materiais (caso existam)
        const { data, error } = await supabase
          .from('estoque')
          .select(`
            *,
            materiais (
              part_number,
              descricao
            )
          `);

        if (error) throw error;

        // 2. O FILTRO INTELIGENTE E FORMATAÇÃO DOS DADOS
        let estoqueLimpo = (data || [])
          .filter((item) => {
            // Só entra na memória quem tem quantidade maior que zero e status 'Disponível'
            return item.quantidade_disponivel > 0 && item.status === 'Disponível';
          })
          .map((item) => {
            // 👇 A MÁGICA AQUI: Lemos primeiro da própria tabela de estoque!
            // Se por acaso estiver vazio, tentamos buscar no catálogo de materiais.
            const pnFinal = item.part_number || item.materiais?.part_number || 'Sem PN';
            const descFinal = item.descricao || item.materiais?.descricao || 'Sem descrição';

            return {
              ...item,
              part_number: pnFinal,
              descricao: descFinal
            };
          });

        // 3. ORDENAÇÃO ALFABÉTICA PELO PART NUMBER
        estoqueLimpo.sort((a, b) => a.part_number.localeCompare(b.part_number));

        // 4. Salva a lista pronta no estado
        setDadosEstoque(estoqueLimpo);

      } catch (erro) {
        console.error("Erro ao carregar o estoque:", erro.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarEstoque();
  }, []);

  const dadosFiltrados = dadosEstoque.filter((item) => {
    const termo = termoPesquisa.toLowerCase();
    return (
      (item.part_number && item.part_number.toLowerCase().includes(termo)) ||
      (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
      (item.alocacao && item.alocacao.toLowerCase().includes(termo))
    );
  });

  return (
    <div style={{ padding: '32px', backgroundColor: '#f4f5f7', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* CABEÇALHO */}
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>
          {tituloPagina}
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
          {subtituloPagina}
        </p>
      </header>

      {/* CARTÃO PRINCIPAL */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        
        {/* BARRA DE PESQUISA */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por PN, Descrição ou Alocação..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.875rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '999px' }}>
            {dadosFiltrados.length} itens disponíveis
          </span>
        </div>

        {/* TABELA DE DADOS */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          {carregando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader2 size={32} className="animate-spin" color="#2563eb" />
              <span>A carregar prateleiras...</span>
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Boxes size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
              <p style={{ margin: 0 }}>Nenhum material com saldo encontrado nesta filial.</p>
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Part Number</th>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Descrição do Material</th>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Alocação</th>
                  <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>Saldo Físico</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px', fontSize: '0.875rem', fontWeight: '600', fontFamily: 'monospace', color: '#1e293b' }}>
                      {item.part_number}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.875rem', color: '#334155' }}>
                      {item.descricao}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.875rem', color: '#2563eb', fontWeight: '500', fontFamily: 'monospace' }}>
                      {item.alocacao || 'Não alocado'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '1rem', fontWeight: '700', color: '#10b981', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                      {item.quantidade_disponivel}
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