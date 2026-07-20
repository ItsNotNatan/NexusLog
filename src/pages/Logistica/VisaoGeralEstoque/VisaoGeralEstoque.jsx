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

        const resposta = await fetch('http://localhost:3001/api/estoque/listar');
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
          throw new Error(resultado.erro || 'Falha ao buscar dados do servidor.');
        }

        // Mapeamos e blindamos as 12 colunas com valores padrão (fallbacks)
        const estoqueTratado = (resultado.dados || []).map((item) => ({
          id: item.id,
          filial: item.filial_id || 'BR06',
          desenho_sap: item.desenho_sap || item.desenho_sap_manual || '—',
          part_number: item.part_number || 'Sem PN',
          descricao: item.descricao || 'Sem descrição',
          fornecedor: item.fornecedor || '—',
          nf_entrada: item.nf_entrada || '—',
          quantidade_nf: item.quantidade_nf || item.quantidade_solicitada || 0,
          quantidade_disponivel: item.quantidade_disponivel || 0,
          unidade_medida: item.unidade_medida || item.unidade_medida_manual || 'UN',
          valor_unitario: item.valor_unitario || item.valor_unitario_manual || 0,
          alocacao: item.alocacao || 'Pendente',
          wbs: item.wbs || item.wbs_element || '—',
          situacao: item.status || 'Disponível'
        }));
        
        estoqueTratado.sort((a, b) => a.part_number.localeCompare(b.part_number));
        setDadosEstoque(estoqueTratado);

      } catch (erro) {
        console.error("Erro no carregamento do estoque:", erro.message);
        alert("❌ [ERRO] Não foi possível carregar as colunas do estoque: " + erro.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarEstoqueDoBackend();
  }, []);

  // --- 3. BARRA DE PESQUISA ULTRA FILTRADA ---
  const dadosFiltrados = dadosEstoque.filter((item) => {
    const termo = termoPesquisa.toLowerCase();
    return (
      (item.part_number && item.part_number.toLowerCase().includes(termo)) ||
      (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
      (item.fornecedor && item.fornecedor.toLowerCase().includes(termo)) ||
      (item.nf_entrada && item.nf_entrada.toLowerCase().includes(termo)) ||
      (item.alocacao && item.alocacao.toLowerCase().includes(termo)) ||
      (item.wbs && item.wbs.toLowerCase().includes(termo)) ||
      (item.filial && item.filial.toLowerCase().includes(termo))
    );
  });

  // 🛡️ CORREÇÃO AQUI: Função alterada para ser 100% segura contra valores nulos/undefined
  const obterEstiloSituacao = (situacao) => {
    if (!situacao) {
      return { backgroundColor: '#dcfce7', color: '#16a34a' }; // Fallback seguro
    }
    
    if (String(situacao).toLowerCase() === 'zerado') {
      return { backgroundColor: '#fee2e2', color: '#ef4444' };
    }
    
    return { backgroundColor: '#dcfce7', color: '#16a34a' };
  };

  // --- 4. RENDERIZAÇÃO DA INTERFACE (JSX) ---
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

      {/* CARD CENTRAL DA TABELA */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        
        {/* Barra Superior */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', width: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por PN, Descrição, NF, Fornecedor, WBS..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.875rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '999px' }}>
            {dadosFiltrados.length} registos encontrados
          </span>
        </div>

        {/* Contentor de Rolagem Horizontal Segura */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          {carregando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader2 size={32} className="animate-spin" color="#2563eb" />
              <span>Carregando colunas do NexusLog...</span>
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Boxes size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
              <p style={{ margin: 0 }}>Nenhum material localizado com os critérios informados.</p>
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '1500px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={estiloHeader}>Filial</th>
                  <th style={estiloHeader}>Desenho SAP</th>
                  <th style={estiloHeader}>Part Number</th>
                  <th style={estiloHeader}>Descrição</th>
                  <th style={estiloHeader}>Fornecedor</th>
                  <th style={estiloHeader}>NF Entrada</th>
                  <th style={{ ...estiloHeader, textAlign: 'center' }}>Qtd. NF</th>
                  <th style={{ ...estiloHeader, textAlign: 'center' }}>Saldo</th>
                  <th style={{ ...estiloHeader, textAlign: 'center' }}>Un</th>
                  <th style={{ ...estiloHeader, textAlign: 'right' }}>Valor Unit.</th>
                  <th style={estiloHeader}>Alocação</th>
                  <th style={estiloHeader}>WBS</th>
                  <th style={{ ...estiloHeader, textAlign: 'center' }}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    
                    {/* 1. Filial */}
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569' }}>
                        <MapPin size={12} color="#2563eb" /> {item.filial}
                      </span>
                    </td>

                    {/* 2. Desenho SAP */}
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>{item.desenho_sap}</td>
                    
                    {/* 3. Part Number */}
                    <td style={{ padding: '12px 16px', fontWeight: '600', fontFamily: 'monospace', color: '#1e293b' }}>{item.part_number}</td>
                    
                    {/* 4. Descrição */}
                    <td style={{ padding: '12px 16px', color: '#334155', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.descricao}>
                      {item.descricao}
                    </td>
                    
                    {/* 5. Fornecedor */}
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.fornecedor}</td>
                    
                    {/* 6. NF Entrada */}
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>{item.nf_entrada}</td>
                    
                    {/* 7. Qtd. NF */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: '500' }}>
                      {Number(item.quantidade_nf).toFixed(0)}
                    </td>
                    
                    {/* 8. Saldo */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: item.quantidade_disponivel <= 0 ? '#ef4444' : '#1e293b' }}>
                      {Number(item.quantidade_disponivel).toFixed(0)}
                    </td>
                    
                    {/* 9. Un */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>{item.unidade_medida}</td>
                    
                    {/* 10. Valor Unit. */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#475569', fontWeight: '500' }}>
                      {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario)}
                    </td>
                    
                    {/* 11. Alocação */}
                    <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: '600', fontFamily: 'monospace' }}>{item.alocacao}</td>
                    
                    {/* 12. WBS */}
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>{item.wbs}</td>
                    
                    {/* 13. Situação */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        display: 'inline-block',
                        ...obterEstiloSituacao(item.situacao)
                      }}>
                        {item.situacao}
                      </span>
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

const estiloHeader = {
  padding: '14px 16px',
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  whiteSpace: 'nowrap'
};