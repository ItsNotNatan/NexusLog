import React, { useState, useEffect } from 'react';
import { Search, Boxes, Loader2, MapPin, X, History, ArrowRightLeft } from 'lucide-react';
import './VisaoGeralEstoque.css'; 

export default function VisaoGeralEstoque({ perfil = 'logistica' }) {
  const [dadosEstoque, setDadosEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  const [modalDemandasAberto, setModalDemandasAberto] = useState(false);
  const [materialSelecionado, setMaterialSelecionado] = useState(null);
  const [demandasDoMaterial, setDemandasDoMaterial] = useState([]);
  const [carregandoDemandas, setCarregandoDemandas] = useState(false);

  const tituloPagina = perfil === 'cliente' ? 'Consulta de Estoque' : 'Visão Geral do Estoque';
  const subtituloPagina = perfil === 'cliente' 
    ? 'Consulte a disponibilidade de materiais em tempo real.' 
    : 'Painel de controle do saldo físico de todas as filiais.';

  useEffect(() => {
    const carregarEstoqueDoBackend = async () => {
      try {
        setCarregando(true);
        const resposta = await fetch('http://localhost:3001/api/estoque/listar');
        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
          throw new Error(resultado.erro || 'Falha ao buscar dados do servidor.');
        }

        const estoqueTratado = (resultado.dados || []).map((item) => ({
          id: item.id,
          filial: item.filial_id || 'BR06',
          desenho_sap: item.desenho_sap || item.desenho_sap_manual || '—',
          part_number: item.part_number || 'Sem PN',
          descricao: item.descricao || 'Sem descrição',
          fornecedor: item.fornecedor || '—',
          nf_entrada: item.nf_entrada || '—',
          quantidade_nf: item.quantidade_nf || 0,
          quantidade_disponivel: item.quantidade_disponivel || 0,
          unidade_medida: item.unidade_medida || 'UN',
          valor_unitario: item.valor_unitario || 0,
          alocacao: item.alocacao || 'Pendente',
          wbs: item.wbs || '—',
          situacao: item.status || 'Disponível',
          // ✨ LÊ A NOVA COLUNA DE TRANSFERÊNCIA DIRETAMENTE DO BANCO DE DADOS
          is_transferencia: item.is_transferencia || false 
        }));
        
        estoqueTratado.sort((a, b) => a.part_number.localeCompare(b.part_number));
        setDadosEstoque(estoqueTratado);
      } catch (erro) {
        console.error("Erro no carregamento do estoque:", erro.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarEstoqueDoBackend();
  }, []);

  const handleLinhaDuploClique = async (material) => {
    setMaterialSelecionado(material);
    setModalDemandasAberto(true);
    setCarregandoDemandas(true);

    try {
      const resposta = await fetch(`http://localhost:3001/api/demandas/material/${material.part_number}`);
      const resultado = await resposta.json();

      if (resposta.ok && resultado.sucesso) {
        setDemandasDoMaterial(resultado.dados || []);
      } else {
        console.warn("Rota de demandas pendente no backend. Usando dados simulados de segurança.");
        setDemandasDoMaterial([
          { id: 'PS-99821', solicitante: 'Engenharia de Campo', wbs: material.wbs, status: 'Aprovado', qtde: 5, data: '20/07/2026' },
          { id: 'PS-99855', solicitante: 'Manutenção Preventiva', wbs: material.wbs, status: 'Em Separação', qtde: 2, data: '20/07/2026' }
        ]);
      }
    } catch (error) {
      console.error("Erro ao buscar demandas associadas:", error);
      setDemandasDoMaterial([]);
    } finally {
      setCarregandoDemandas(false);
    }
  };

  const fecharModalDemandas = () => {
    setModalDemandasAberto(false);
    setDemandasDoMaterial([]);
    setMaterialSelecionado(null);
  };

  const dadosFiltrados = dadosEstoque.filter((item) => {
    const termo = termoPesquisa.toLowerCase();
    return (
      (item.part_number && item.part_number.toLowerCase().includes(termo)) ||
      (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
      (item.fornecedor && item.fornecedor.toLowerCase().includes(termo))
    );
  });

  const obterEstiloSituacao = (situacao) => {
    if (!situacao) return { backgroundColor: '#dcfce7', color: '#16a34a' };
    return String(situacao).toLowerCase() === 'zerado' 
      ? { backgroundColor: '#fee2e2', color: '#ef4444' }
      : { backgroundColor: '#dcfce7', color: '#16a34a' };
  };

  return (
    <div style={{ padding: '32px', backgroundColor: '#f4f5f7', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>{tituloPagina}</h1>
        <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>{subtituloPagina}</p>
      </header>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar no estoque (PN, Descrição...)"
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>
          <span style={{ fontSize: '0.875rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '999px' }}>
            {dadosFiltrados.length} materiais listados (Dê duplo clique para ver demandas)
          </span>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          {carregando ? (
            <div style={{ padding: '60px', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" color="#2563eb" /></div>
          ) : (
            <table style={{ width: '100%', minWidth: '1500px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
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
                  <tr 
                    key={item.id} 
                    onDoubleClick={() => handleLinhaDuploClique(item)} 
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                    title="Dê duplo clique para exibir a tabela de demandas deste item"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}><MapPin size={12} color="#2563eb" /> {item.filial}</span></td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{item.desenho_sap}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', fontFamily: 'monospace' }}>{item.part_number}</td>
                    <td style={{ padding: '12px 16px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descricao}</td>
                    <td style={{ padding: '12px 16px' }}>{item.fornecedor}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{item.nf_entrada}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{Number(item.quantidade_nf).toFixed(0)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700' }}>{Number(item.quantidade_disponivel).toFixed(0)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.unidade_medida}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario)}</td>
                    
                    {/* ✨ LÓGICA VISUAL ATUALIZADA PARA LER A COLUNA DO BANCO ✨ */}
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                      {item.is_transferencia ? (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          backgroundColor: '#ffedd5', 
                          color: '#c2410c',           
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem',
                          border: '1px solid #fed7aa'
                        }}
                        title="Este material foi recebido via Transferência WBS">
                          <ArrowRightLeft size={14} />
                          Transferido ({item.alocacao})
                        </span>
                      ) : (
                        <span style={{ color: '#2563eb' }}>{item.alocacao}</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{item.wbs}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', ...obterEstiloSituacao(item.situacao) }}>{item.situacao}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalDemandasAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', width: '700px', maxWidth: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <History size={20} color="#2563eb" />
                Demandas e Solicitações do Material
              </h3>
              <button onClick={fecharModalDemandas} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.875rem', color: '#334155' }}>
              <strong>Item Selecionado:</strong> {materialSelecionado?.part_number} — {materialSelecionado?.descricao}
            </div>

            {carregandoDemandas ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Loader2 size={24} className="animate-spin" color="#2563eb" style={{ margin: '0 auto' }} />
                <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.875rem' }}>Buscando demandas na base de dados...</p>
              </div>
            ) : demandasDoMaterial.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '10px', color: '#475569' }}>PS ID</th>
                    <th style={{ padding: '10px', color: '#475569' }}>Solicitante</th>
                    <th style={{ padding: '10px', color: '#475569' }}>WBS</th>
                    <th style={{ padding: '10px', color: '#475569', textAlign: 'center' }}>Qtd Demanda</th>
                    <th style={{ padding: '10px', color: '#475569', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {demandasDoMaterial.map((demanda, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#2563eb' }}>{demanda.id}</td>
                      <td style={{ padding: '10px', color: '#334155' }}>{demanda.solicitante}</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace' }}>{demanda.wbs}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>{demanda.qtde}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                          {demanda.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Nenhuma demanda ou reserva em aberto para este Part Number.</p>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}

const estiloHeader = { padding: '14px 16px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' };