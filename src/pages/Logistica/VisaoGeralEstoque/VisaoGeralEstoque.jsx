import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, PackageOpen, X, History, Download, DollarSign } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import TabelaDemandas from '../../../components/TabelaDemandas/TabelaDemandas';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { io } from 'socket.io-client';
import './VisaoGeralEstoque.css';

export default function VisaoGeralEstoque({ perfil }) {
  const { estoqueAtual, filiaisGlobais, usuario } = useContext(AuthContext);
  const { showAlert, showLoading, closeAlert } = useAlert();

  const [estoque, setEstoque] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // ✨ VERIFICAÇÃO DE PERMISSÃO DE EDIÇÃO
  const podeEditar = usuario?.cargo === 'ADM' || usuario?.cargo === 'LIDER';

  // ==========================================
  // ESTADOS DO HISTÓRICO E EDIÇÃO INLINE
  // ==========================================
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historicoDemandas, setHistoricoDemandas] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
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
        if (resposta.sucesso) setEstoque(resposta.dados || []);
      } catch (error) {
        showAlert("Erro", "Não foi possível carregar os dados.", "error");
      } finally {
        setCarregando(false);
      }
    };
    
    buscarEstoque();

    // ✨ SOCKET.IO: Atualiza o saldo instantaneamente se alguém der entrada/saída
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const SOCKET_URL = API_URL.replace(/\/api\/?$/, ''); 
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('estoque_atualizado', () => {
      console.log('⚡ Saldo de estoque alterado! Atualizando números...');
      buscarEstoque();
    });

    return () => socket.disconnect();
  }, [estoqueAtual, showAlert]);

  const handleDuploCliqueItem = async (item) => {
    setItemSelecionado(item);
    setModalAberto(true);
    setCarregandoHistorico(true);
    setHistoricoDemandas([]);

    try {
      const resposta = await apiFetch(`/solicitacoes/demandas/estoque/${item.id}`);

      if (resposta.sucesso && resposta.dados) {
        setHistoricoDemandas(resposta.dados);
      } else {
        showAlert("Erro", resposta.erro || "Falha ao buscar o histórico.", "error");
      }
    } catch (error) {
      console.error(error);
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

  const startEditing = (id, field, value, type) => {
    if (!podeEditar) return; // Bloqueio de segurança
    
    setEditCell({ id, field });
    let valFormatado = value || "";
    if (type === 'date' && valFormatado && valFormatado.includes('T')) {
      valFormatado = valFormatado.split('T')[0];
    }
    setEditValue(valFormatado);
  };

  const saveEditing = async (id, field, originalValue) => {
    if (String(editValue) !== String(originalValue || '')) {
      let valorFinal = editValue;
      if (field === 'quantidade_disponivel' || field === 'valor_unitario') {
        if (field === 'valor_unitario' && typeof editValue === 'string') {
           let v = editValue.replace(/[^\d.,-]/g, '');
           if (v.includes('.') && v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
           else if (v.includes(',')) v = v.replace(',', '.');
           valorFinal = parseFloat(v) || 0;
        } else {
           valorFinal = editValue ? Number(editValue) : 0;
        }
      }

      setEstoque(prev => prev.map(i => i.id === id ? { ...i, [field]: valorFinal } : i));

      try {
        const resposta = await apiFetch(`/estoque/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            [field]: valorFinal,
            usuario_editor: usuario?.nome_completo || usuario?.nome || 'Logística'
          })
        });

        if (resposta.sucesso) {
          showAlert("Sucesso!", "A informação foi atualizada no sistema.", "success");
        } else {
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

  const CelulaEditavel = ({ item, field, type = 'text', renderFn, style = {}, placeholder = "" }) => {
    const isEditing = editCell.id === item.id && editCell.field === field;
    const val = item[field];
    const displayVal = renderFn ? renderFn(val) : (val || '-');

    if (!podeEditar) {
      return <span style={{ display: 'inline-block', width: '100%', minHeight: '18px', ...style }}>{displayVal}</span>;
    }

    if (isEditing) {
      return (
        <input
          autoFocus
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEditing(item.id, field, val)}
          onKeyDown={(e) => handleKeyDown(e, item.id, field, val)}
          onClick={(e) => {
            // ✨ FORÇA A ABERTURA DO CALENDÁRIO QUANDO CLICADO
            if (type === 'date' && e.target.showPicker) {
              e.target.showPicker();
            }
          }}
          placeholder={placeholder}
          style={{ 
            width: '100%', 
            padding: '6px 8px', 
            boxSizing: 'border-box', 
            border: '2px solid #3b82f6', 
            borderRadius: '6px', 
            outline: 'none', 
            fontSize: '0.80rem', 
            fontFamily: 'inherit',
            cursor: type === 'date' ? 'pointer' : 'text'
          }}
        />
      );
    }

    return (
      <div
        onClick={(e) => { e.stopPropagation(); startEditing(item.id, field, val, type); }}
        style={{ 
          cursor: type === 'date' ? 'pointer' : 'text', 
          border: '1px solid #e2e8f0', 
          backgroundColor: '#f8fafc',
          borderRadius: '6px', 
          padding: '4px 8px', 
          display: 'inline-block', 
          width: '100%', 
          minHeight: '26px', 
          boxSizing: 'border-box',
          transition: 'all 0.2s ease', 
          ...style 
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = '#93c5fd';
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.backgroundColor = '#f8fafc';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title="Clique para editar este valor manualmente"
      >
        {displayVal}
      </div>
    );
  };

  // ==========================================
  // FILTRAGEM E CÁLCULO DE KPIS
  // ==========================================
  const estoqueFiltrado = estoque.filter(item =>
    (item.desenho_sap && item.desenho_sap.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.part_number && item.part_number.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.descricao && item.descricao.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.wbs && item.wbs.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.fornecedor && item.fornecedor.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.nf_entrada && item.nf_entrada.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.nome_projeto && item.nome_projeto.toLowerCase().includes(termoPesquisa.toLowerCase()))
  );

  const kpiTotalItens = estoqueFiltrado.length;
  const kpiDisponiveis = estoqueFiltrado.filter(i => Number(i.quantidade_disponivel) > 0).length;
  const kpiReservados = estoqueFiltrado.filter(i => i.alocacao && i.alocacao !== '-' && i.alocacao.toUpperCase() !== 'PENDENTE').length;
  
  const kpiValorTotal = estoqueFiltrado.reduce((acc, item) => {
    const qtd = Number(item.quantidade_disponivel) || 0;
    const valor = Number(item.valor_unitario) || 0;
    return acc + (qtd * valor);
  }, 0);

  // ==========================================
  // EXPORTAR EXCEL NA NOVA ORDEM E SEM DATA DE NECESSIDADE
  // ==========================================
  const handleExportarExcel = async () => {
    showLoading("A Gerar Excel", "Por favor, aguarde enquanto compilamos os dados do estoque...");
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Visão Geral do Estoque');

      // ✨ EXCEL: MAPEAMENTO CIRÚRGICO SEM DATA NECESSIDADE
      worksheet.columns = [
        { header: 'NUM SAP | DESENHO', key: 'sap', width: 20 },
        { header: 'REFERÊNCIA', key: 'ref', width: 20 },
        { header: 'DESCRIÇÃO', key: 'desc', width: 40 },
        { header: 'FABRICANTE', key: 'pn', width: 25 },
        { header: 'QTDE ENTRADA', key: 'qtd', width: 15 },
        { header: 'UNID. MEDIDA', key: 'unid', width: 15 },
        { header: 'NUM DA NOTA FISCAL', key: 'nf', width: 15 },
        { header: 'FORNECEDOR / REGISTRO', key: 'fornecedor', width: 25 },
        { header: 'CENTRO DE CUSTO - WBS', key: 'wbs', width: 25 },
        { header: 'NOME CENTRO DE CUSTO / PROJETO', key: 'projeto', width: 30 },
        { header: 'EMISSÃO NF', key: 'emi', width: 18 },
        { header: 'RECEB. NF', key: 'rec', width: 18 },
        { header: 'Nº PEDIDO DE COMPRA / CPV', key: 'doc', width: 25 },
        { header: 'VLR. UNITÁRIO NOTA FISCAL', key: 'val', width: 20 },
        { header: 'FILIAL', key: 'filial', width: 15 },
        { header: 'DEPÓSITO', key: 'dep', width: 15 },
        { header: 'ALOCAÇÃO', key: 'aloc', width: 20 }
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      estoqueFiltrado.forEach(item => {
        worksheet.addRow({
          sap: item.desenho_sap || '-',
          ref: item.referencia || '-',
          desc: item.descricao || '-',
          pn: item.part_number || '-',
          qtd: Number(item.quantidade_disponivel) || 0,
          unid: item.unidade_medida || '-',
          nf: item.nf_entrada || '-',
          fornecedor: item.fornecedor || '-',
          wbs: item.wbs || '-',
          projeto: item.nome_projeto || '-',
          emi: formatarData(item.emissao_nf),
          rec: formatarData(item.receb_nf),
          doc: item.documento_compras || '-',
          val: item.valor_unitario ? `R$ ${Number(item.valor_unitario).toFixed(2)}` : '-',
          filial: obterNomeFilialDinamico(item.filial_id || item.filial),
          dep: item.deposito || '-',
          aloc: item.alocacao || '-'
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Visao_Geral_Estoque_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (err) {
      console.error(err);
      showAlert("Erro na Exportação", "Houve um problema ao gerar o arquivo Excel.", "error");
    } finally {
      closeAlert();
    }
  };

  return (
    <div className="visao-geral-container">

      <header className="vg-header">
        <div className="vg-header-titulos">
          <h1>Visão Geral do Estoque</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            {podeEditar ? (
              <>Dê um clique nas <strong style={{color: '#2563eb'}}>caixinhas</strong> para <strong>editar um campo manualmente</strong> ou duplo clique na linha para ver o <strong>histórico de fluxos</strong>.</>
            ) : (
              <>Dê um duplo clique na linha para ver o <strong>histórico de fluxos</strong> detalhado do material.</>
            )}
          </p>
        </div>
        <button className="btn-exportar-excel" onClick={handleExportarExcel}>
          <Download size={18} /> Exportar Excel
        </button>
      </header>

      <div className="vg-dashboard-cartao">
        <div className="vg-dash-esquerda">
          <div className="icone-cifrao">
            <DollarSign size={28} />
          </div>
          <div className="vg-dash-textos">
            <span>VALOR TOTAL DO ESTOQUE</span>
            <strong>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpiValorTotal)}
            </strong>
          </div>
        </div>
        
        <div className="vg-dash-direita">
          <div className="kpi-mini-card">
            <span>Total de Itens</span>
            <strong className="kpi-black">{kpiTotalItens}</strong>
          </div>
          <div className="kpi-mini-card">
            <span>Disponíveis</span>
            <strong className="kpi-green">{kpiDisponiveis}</strong>
          </div>
          <div className="kpi-mini-card">
            <span>Reservados</span>
            <strong className="kpi-orange">{kpiReservados}</strong>
          </div>
        </div>
      </div>

      <div className="tabela-wrapper">
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
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2400px' }}>
            <thead>
              {/* ✨ NOVA ORDEM DE CABEÇALHOS (SEM DATA DE NECESSIDADE) */}
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', width: '40px', textAlign: 'center' }}></th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>NUM SAP | DESENHO</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>REFERÊNCIA</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', minWidth: '200px' }}>DESCRIÇÃO</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>FABRICANTE</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>QTDE ENTRADA (SALDO)</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>UNID. MEDIDA</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>NUM DA NOTA FISCAL</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>FORNECEDOR / REGISTRO</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>CENTRO DE CUSTO - WBS</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>NOME CENTRO DE CUSTO / PROJETO</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>EMISSÃO NF</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>RECEB. NF</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Nº PEDIDO DE COMPRA / CPV</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>VLR. UNITÁRIO NOTA FISCAL</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>FILIAL</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>DEPÓSITO</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>ALOCAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="18" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><Loader2 className="animate-spin" size={28} style={{ margin: '0 auto' }} /></td></tr>
              ) : estoqueFiltrado.length === 0 ? (
                <tr><td colSpan="18" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><PackageOpen size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px auto' }} /> Nenhum material encontrado.</td></tr>
              ) : (
                estoqueFiltrado.map(item => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => handleDuploCliqueItem(item)}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', cursor: 'default' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'center' }} title="Duplo clique na linha para ver demandas">
                      <History size={16} color="#94a3b8" />
                    </td>

                    {/* ✨ COLUNAS REORGANIZADAS PARA A NOVA ORDEM */}
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="desenho_sap" style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: '600' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="referencia" style={{ color: '#475569' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="descricao" style={{ color: '#475569' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="part_number" style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' }} />
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem' }}>
                      {podeEditar ? (
                         <CelulaEditavel item={item} field="quantidade_disponivel" type="number" style={{ color: '#10b981', fontWeight: '700' }} />
                      ) : (
                        <span style={{ backgroundColor: '#ecfdf5', padding: '4px 12px', borderRadius: '999px', border: '1px solid #a7f3d0', display: 'inline-block', color: '#10b981', fontWeight: '700' }}>
                          {item.quantidade_disponivel || 0}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.80rem', textAlign: 'center' }}>
                      <CelulaEditavel item={item} field="unidade_medida" style={{ color: '#64748b' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="nf_entrada" style={{ color: '#475569', fontFamily: 'monospace' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="fornecedor" style={{ color: '#475569', textTransform: 'uppercase' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="wbs" style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: '500' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <CelulaEditavel item={item} field="nome_projeto" style={{ color: '#475569' }} placeholder="Nome do Projeto..." />
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
                      <CelulaEditavel item={item} field="valor_unitario" type="text" renderFn={(val) => val ? `R$ ${Number(val).toFixed(2)}` : '-'} style={{ color: '#1e293b', fontWeight: '500' }} />
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.80rem' }}>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                        <CelulaEditavel item={item} field="filial_id" renderFn={obterNomeFilialDinamico} />
                      </span>
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

      {/* MODAL DE HISTÓRICO DE DEMANDAS */}
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