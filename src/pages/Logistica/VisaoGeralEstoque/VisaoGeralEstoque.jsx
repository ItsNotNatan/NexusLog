import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, PackageOpen, X, History } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import TabelaDemandas from '../../../components/TabelaDemandas/TabelaDemandas';
import './VisaoGeralEstoque.css';

export default function VisaoGeralEstoque({ perfil }) {
  const { estoqueAtual, filiaisGlobais } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [estoque, setEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // ==========================================
  // ESTADOS DO HISTÓRICO (TabelaDemandas)
  // ==========================================
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historicoDemandas, setHistoricoDemandas] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // ==========================================
  // ESTADOS DE EDIÇÃO INLINE
  // ==========================================
  const [editCell, setEditCell] = useState({ id: null, field: null });
  const [editValue, setEditValue] = useState("");

  const obterNomeFilialDinamico = (codigo) => {
    if (!codigo || codigo === '-') return 'N/D';
    const codLimpo = String(codigo).toUpperCase().trim();
    if (codLimpo === "TODOS") return "Todas as Filiais";
    const filialEncontrada = filiaisGlobais.find(f => f.id === codLimpo);
    return filialEncontrada ? filialEncontrada.nome : codigo;
  };

  const formatarData = (dataStr) => {
    if (!dataStr || dataStr === '-') return '-';
    if (dataStr.includes('/')) return dataStr;
    try {
      return new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
      return dataStr;
    }
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

  // ==========================================
  // AÇÃO: DUPLO CLIQUE (Abre Histórico)
  // ==========================================
  const handleDuploCliqueItem = async (item) => {
    setItemSelecionado(item);
    setModalAberto(true);
    setCarregandoHistorico(true);
    setHistoricoDemandas([]);

    try {
      const resposta = await apiFetch(`/solicitacoes/listar?limit=1000`);
      
      if (resposta.sucesso && resposta.dados) {
        const movimentacoes = [];

        resposta.dados.forEach(solicitacao => {
          if (solicitacao.itens && solicitacao.itens.length > 0) {
            const temOItem = solicitacao.itens.some(it => 
              it.estoque_id === item.id || 
              (it.part_number_manual === item.part_number && it.nf_entrada === item.nf_entrada)
            );

            if (temOItem) {
              movimentacoes.push({
                idOriginal: solicitacao.idOriginal || solicitacao.id,
                id: solicitacao.ps || `PS-${solicitacao.id}`,
                solicitante: solicitacao.solicitante || 'N/A',
                wbs: solicitacao.wbs || '-',
                status: solicitacao.status || '-',
                pl: solicitacao.pl || '-',
                bs: solicitacao.bs || '-',
                criacaoPl: solicitacao.dataSolicitacao || formatarData(solicitacao.created_at),
                dataEntrega: solicitacao.dataEntrega || 'não definido',
                contagem: `${solicitacao.itens.length} itens`,
                contagemStatus: solicitacao.status === 'Concluído' ? 'verde' : (solicitacao.status === 'Cancelado' || solicitacao.status === 'Recusado' ? 'vermelho' : 'amarelo')
              });
            }
          }
        });

        setHistoricoDemandas(movimentacoes);
      }
    } catch (error) {
      showAlert("Erro", "Falha ao buscar o histórico de demandas.", "error");
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setItemSelecionado(null);
    setHistoricoDemandas([]);
  };

  // ==========================================
  // AÇÕES: EDIÇÃO INLINE (Clique Único)
  // ==========================================
  const startEditing = (id, field, value, type) => {
    setEditCell({ id, field });
    let valFormatado = value || "";
    // Ajusta o formato da data para o input type="date"
    if (type === 'date' && valFormatado && valFormatado.includes('T')) {
      valFormatado = valFormatado.split('T')[0];
    }
    setEditValue(valFormatado);
  };

  const saveEditing = async (id, field, originalValue) => {
    if (String(editValue) !== String(originalValue || '')) {
      // Formata números se o campo exigir
      let valorFinal = editValue;
      if (field === 'quantidade_disponivel' || field === 'valor_unitario') {
        valorFinal = editValue ? Number(editValue) : 0;
      }

      // Atualização otimista na interface
      setEstoque(prev => prev.map(i => i.id === id ? { ...i, [field]: valorFinal } : i));
      
      try {
        const resposta = await apiFetch(`/estoque/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ [field]: valorFinal })
        });
        if (!resposta.sucesso) {
          showAlert("Erro", "Falha ao atualizar o campo no servidor.", "error");
        }
      } catch (error) {
        showAlert("Erro de Conexão", "Não foi possível ligar ao servidor.", "error");
      }
    }
    setEditCell({ id: null, field: null });
  };

  const handleKeyDown = (e, id, field, originalValue) => {
    if (e.key === 'Enter') saveEditing(id, field, originalValue);
    if (e.key === 'Escape') setEditCell({ id: null, field: null });
  };

  // Componente interno para as células editáveis
  const CelulaEditavel = ({ item, field, type = 'text', renderFn, style = {} }) => {
    const isEditing = editCell.id === item.id && editCell.field === field;
    const val = item[field];
    const displayVal = renderFn ? renderFn(val) : (val || '-');

    if (isEditing) {
      return (
        <input
          autoFocus
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEditing(item.id, field, val)}
          onKeyDown={(e) => handleKeyDown(e, item.id, field, val)}
          style={{ width: '100%', padding: '4px 6px', boxSizing: 'border-box', border: '2px solid #3b82f6', borderRadius: '4px', outline: 'none', fontSize: '0.80rem', fontFamily: 'inherit' }}
        />
      );
    }

    return (
      <span
        onClick={(e) => { e.stopPropagation(); startEditing(item.id, field, val, type); }}
        style={{ cursor: 'text', borderBottom: '1px dashed transparent', display: 'inline-block', width: '100%', minHeight: '18px', ...style }}
        onMouseOver={(e) => e.currentTarget.style.borderBottom = '1px dashed #cbd5e1'}
        onMouseOut={(e) => e.currentTarget.style.borderBottom = '1px dashed transparent'}
        title="Clique para editar"
      >
        {displayVal}
      </span>
    );
  };

  const estoqueFiltrado = estoque.filter(item => 
    (item.desenho_sap && item.desenho_sap.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.part_number && item.part_number.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.descricao && item.descricao.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.wbs && item.wbs.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.fornecedor && item.fornecedor.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.nf_entrada && item.nf_entrada.toLowerCase().includes(termoPesquisa.toLowerCase()))
  );

  return (
    <div style={{ padding: '32px', backgroundColor: '#f4f5f7', minHeight: '100vh', boxSizing: 'border-box', position: 'relative' }}>
      
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Consulta de Estoque</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Dê um clique para <strong>editar um campo</strong> ou duplo clique na linha para ver o <strong>histórico de demandas</strong>.</p>
        </div>
      </header>

      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por SAP, PN, Descrição, NF, WBS..." 
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total: {estoqueFiltrado.length} registos</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2200px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', width: '40px', textAlign: 'center' }}></th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Filial</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Desenho SAP</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Nº Peça Fabricante</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Fornecedor</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Referência</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Qtd. Fornecida (Saldo)</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>NF de Entrada</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Un. Medida</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Vendor Description</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>WBS Element</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Data de Necessidade</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Emissão NF</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Receb. NF</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Documento Compras</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>PO Net Price</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Centro</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Depósito</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Alocação</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="19" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><Loader2 className="animate-spin" size={28} style={{ margin: '0 auto' }} /></td></tr>
              ) : estoqueFiltrado.length === 0 ? (
                <tr><td colSpan="19" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><PackageOpen size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px auto' }} /> Nenhum material encontrado.</td></tr>
              ) : (
                estoqueFiltrado.map(item => (
                  <tr 
                    key={item.id} 
                    onDoubleClick={() => handleDuploCliqueItem(item)}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', cursor: 'default' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <History size={16} color="#94a3b8" />
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                        <CelulaEditavel item={item} field="filial_id" renderFn={obterNomeFilialDinamico} />
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="desenho_sap" style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: '600' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="part_number" style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="fornecedor" style={{ color: '#475569', textTransform: 'uppercase' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="referencia" style={{ color: '#475569' }} />
                    </td>
                    
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem' }}>
                      <span style={{ backgroundColor: '#ecfdf5', padding: '4px 12px', borderRadius: '999px', border: '1px solid #a7f3d0', display: 'inline-block' }}>
                        <CelulaEditavel item={item} field="quantidade_disponivel" type="number" style={{ color: '#10b981', fontWeight: '700' }} />
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="nf_entrada" style={{ color: '#475569', fontFamily: 'monospace' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem', textAlign: 'center' }}>
                      <CelulaEditavel item={item} field="unidade_medida" style={{ color: '#64748b' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem', minWidth: '200px' }}>
                      <CelulaEditavel item={item} field="descricao" style={{ color: '#475569' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="wbs" style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: '500' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="data_necessidade" type="date" renderFn={formatarData} style={{ color: '#64748b' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="emissao_nf" type="date" renderFn={formatarData} style={{ color: '#64748b' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="receb_nf" type="date" renderFn={formatarData} style={{ color: '#64748b' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="documento_compras" style={{ color: '#475569' }} />
                    </td>
                    
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="valor_unitario" type="number" renderFn={(val) => val ? `R$ ${Number(val).toFixed(2)}` : '-'} style={{ color: '#1e293b', fontWeight: '500' }} />
                    </td>
                    
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="centro" style={{ color: '#475569' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="deposito" style={{ color: '#475569' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                      <CelulaEditavel item={item} field="alocacao" style={{ color: '#3b82f6', fontFamily: 'monospace', fontWeight: '600' }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✨ MODAL DE HISTÓRICO DE DEMANDAS */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '95%', maxWidth: '1400px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageOpen size={20} color="#2563eb" /> Demandas Relacionadas
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  Histórico de solicitações que contêm o item: <strong style={{ color: '#1e293b' }}>{itemSelecionado?.part_number}</strong> (NF: <strong style={{ color: '#1e293b' }}>{itemSelecionado?.nf_entrada}</strong>)
                </p>
              </div>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#f4f5f7' }}>
              {carregandoHistorico ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', color: '#3b82f6' }} />
                  <p>Buscando histórico na base de dados...</p>
                </div>
              ) : historicoDemandas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  Nenhuma demanda registada para este item específico.
                </div>
              ) : (
                <TabelaDemandas dados={historicoDemandas} />
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}