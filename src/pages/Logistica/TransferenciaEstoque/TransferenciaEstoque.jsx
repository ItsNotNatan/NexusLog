// =================================================================
// ARQUIVO: src/pages/Logistica/TransferenciaEstoque/TransferenciaEstoque.jsx
// DESCRIÇÃO: Consolida transferências e exporta no formato exato para a Entrada de Estoque
// =================================================================
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Lock, FileText, Search, CheckSquare, Square, Box, Download, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ✨ IMPORTAÇÃO DO SOCKET.IO PARA TEMPO REAL
import { io } from 'socket.io-client';

import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import './TransferenciaEstoque.css';

// Formatação auxiliar para filiais
const obterNomeFilialCurto = (codigo) => {
  if (!codigo || codigo === '-') return 'N/D';
  const codLimpo = String(codigo).toUpperCase().trim();
  switch (codLimpo) {
    case "BR02": return "Santo André, SP";
    case "BR04": return "Goiana";
    case "BR06": return "Betim";
    case "TODOS": return "Todas as Filiais";
    default: return codigo;
  }
};

export default function TransferenciaEstoque() {
  const { estoqueAtual, carregandoInicial } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [selecionadosIds, setSelecionadosIds] = useState(new Set());

  // ---------------------------------------------------------------------------
  // 1. BUSCA DE DADOS & TEMPO REAL
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (carregandoInicial) return;

    const buscarTransferencias = async (silencioso = false) => {
      try {
        if (!silencioso) setCarregando(true);
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        
        // ✨ CORREÇÃO: Removemos o filtro de tipo da API para apanhar 'Transfer. WBS' e 'Transferencia WBS' e filtramos no frontend
        const resultado = await apiFetch(`/solicitacoes/listar?limit=1000&filial=${filialFiltro}&t=${Date.now()}`);

        if (resultado.sucesso) {
          // ✨ AGORA TRAZ TODAS AS TRANSFERÊNCIAS (INCLUSIVE PENDENTES) PARA O USUÁRIO VER QUE EXISTEM
          const transferencias = resultado.dados.filter(
            s => (s.tipo === 'Transferencia WBS' || s.tipo === 'Transfer. WBS') && 
                 (s.status !== 'Cancelado' && s.status !== 'Recusado')
          );
          setSolicitacoes(transferencias);
        } else {
          showAlert("Erro", resultado.erro || "Falha ao carregar transferências.", "error");
        }
      } catch (error) {
        if (!silencioso) showAlert("Erro de Conexão", "Não foi possível ligar ao servidor.", "error");
      } finally {
        if (!silencioso) setCarregando(false);
      }
    };

    buscarTransferencias();

    // ✨ CONFIGURAÇÃO DO SOCKET.IO (ESCUTA ATIVA)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const SOCKET_URL = API_URL.replace(/\/api\/?$/, ''); 
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('solicitacoes_atualizadas', () => {
      console.log('⚡ Tempo Real: Uma transferência foi atualizada! A atualizar...');
      buscarTransferencias(true); 
    });

    return () => socket.disconnect();
  }, [estoqueAtual, carregandoInicial, showAlert]);

  // ---------------------------------------------------------------------------
  // 2. FILTRAGEM E BUSCA LOCAL
  // ---------------------------------------------------------------------------
  const transferenciasFiltradas = useMemo(() => {
    if (!termoBusca) return solicitacoes;
    const termo = termoBusca.toLowerCase();
    
    return solicitacoes.filter(sol => {
      return (
        (sol.ps && sol.ps.toLowerCase().includes(termo)) ||
        (sol.pl && sol.pl.toLowerCase().includes(termo)) ||
        (sol.solicitante && sol.solicitante.toLowerCase().includes(termo)) ||
        (sol.filial && sol.filial.toLowerCase().includes(termo)) ||
        (sol.wbs && sol.wbs.toLowerCase().includes(termo))
      );
    });
  }, [solicitacoes, termoBusca]);

  // ---------------------------------------------------------------------------
  // 3. SELEÇÃO DE ITENS (CAIXAS DE SELEÇÃO)
  // ---------------------------------------------------------------------------
  const toggleSelecao = (idOriginal, isAprovada) => {
    if (!isAprovada) {
      showAlert("Atenção", "Esta transferência ainda está 'Pendente'. Vá ao Painel de Aprovação para a libertar antes de exportar.", "warning");
      return;
    }

    const novoSet = new Set(selecionadosIds);
    if (novoSet.has(idOriginal)) {
      novoSet.delete(idOriginal);
    } else {
      novoSet.add(idOriginal);
    }
    setSelecionadosIds(novoSet);
  };

  const selecionarTodos = () => {
    // Só seleciona as que já foram aprovadas pela logística
    const idsAprovados = transferenciasFiltradas
      .filter(t => t.status === 'Concluído' || t.status === 'Em Separação')
      .map(t => t.idOriginal || t.id); // ✨ Garante que pega a ID correta!
    
    setSelecionadosIds(new Set(idsAprovados));
  };

  const limparSelecao = () => {
    setSelecionadosIds(new Set());
  };

  // ---------------------------------------------------------------------------
  // 4. CONSOLIDAÇÃO DOS ITENS SELECIONADOS
  // ---------------------------------------------------------------------------
  const itensConsolidados = useMemo(() => {
    const itens = [];
    solicitacoes.forEach(sol => {
      const idReal = sol.idOriginal || sol.id;
      if (selecionadosIds.has(idReal) && sol.itens) {
        sol.itens.forEach(item => {
          // Extraímos a origem e o destino do WBS
          const origemWBS = sol.wbs && sol.wbs.includes('➔') ? sol.wbs.split('➔')[0]?.trim() : '-';
          const destinoWBS = sol.wbs && sol.wbs.includes('➔') ? sol.wbs.split('➔')[1]?.trim() : sol.wbs;
          
          itens.push({
            ...item,
            solicitacao_ps: sol.ps,
            solicitacao_bs: sol.pl,
            wbs_origem: origemWBS,
            wbs_destino: destinoWBS,
            filial_origem: sol.filial
          });
        });
      }
    });
    return itens;
  }, [solicitacoes, selecionadosIds]);

  // ---------------------------------------------------------------------------
  // 5. EXPORTAR PARA EXCEL (Formato EXATO da "Entrada de Estoque")
  // ---------------------------------------------------------------------------
  const exportarExcel = async () => {
    if (itensConsolidados.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Itens Transferidos');

      // ✨ As colunas aqui são IDÊNTICAS ao ExemploExcel.jsx para importação sem falhas
      const colunas = [
        'Desenho SAP',
        'Nº peça fabricante',
        'FORNECEDOR',
        'REFERÊNCIA',
        'Qtd.fornecida',
        'NF DE ENTRADA',
        'Unidade de medida',
        'Vendor Description',
        'WBS Element',
        'EMISSÃO NF',
        'RECEB. NF',
        'Documento de compras',
        'PO Net Price',
        'Centro',
        'Depósito',
        'Alocação'
      ];

      worksheet.columns = colunas.map(col => ({ header: col, key: col, width: 20 }));

      // Estilizar o cabeçalho
      const linhaCabecalho = worksheet.getRow(1);
      linhaCabecalho.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Azul
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      linhaCabecalho.height = 25;

      // Adicionar os dados moldados
      itensConsolidados.forEach(item => {
        worksheet.addRow({
          'Desenho SAP': item.desenho_sap_manual || item.desenho_sap || '-',
          'Nº peça fabricante': item.part_number_manual || item.part_number || '-',
          'FORNECEDOR': item.fornecedor || '',
          'REFERÊNCIA': item.referencia || '',
          'Qtd.fornecida': item.quantidade_solicitada || 1,
          'NF DE ENTRADA': item.nf_entrada || '',
          'Unidade de medida': item.unidade_medida_manual || 'Unid',
          'Vendor Description': item.descricao_manual || item.descricao || '-',
          
          // ✨ MÁGICA WBS: Coloca o WBS de destino que foi solicitado pelo cliente
          'WBS Element': item.wbs_destino || item.wbs_element || '-',
          
          'EMISSÃO NF': item.emissao_nf || '',
          'RECEB. NF': item.receb_nf || '',
          'Documento de compras': item.documento_compras || '',
          'PO Net Price': item.valor_unitario_manual ? `R$ ${item.valor_unitario_manual}` : '',
          'Centro': item.centro || '',
          'Depósito': item.deposito || '',
          
          // ✨ MÁGICA ALOCAÇÃO: Coloca um carimbo na alocação informando a PS original e o WBS Original
          'Alocação': `[TR] De: ${item.wbs_origem} (${item.solicitacao_ps})`
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Transferencias_Expedidas_${new Date().toISOString().slice(0, 10)}.xlsx`);

      showAlert("Sucesso!", "O ficheiro Excel foi gerado. Use-o na página de 'Entrada de Estoque' da filial de destino.", "success");
      limparSelecao(); // Limpa a seleção ao terminar
      
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      showAlert("Erro", "Ocorreu um problema ao gerar o ficheiro Excel.", "error");
    }
  };

  return (
    <div className="transf-estoque-wrapper">
      
      {/* CABEÇALHO */}
      <header className="transf-estoque-cabecalho">
        <div>
          <h1>Transferência de Estoque</h1>
          <p>Selecione múltiplas transferências (PS/BS) e exporte todos os itens em um único Excel</p>
        </div>
        <div className="badge-exclusivo">
          <Lock size={14} /> Exclusivo Logística
        </div>
      </header>

      {/* BANNER INFORMATIVO */}
      <div className="transf-banner-info">
        <FileText size={24} className="transf-banner-icone" />
        <div className="transf-banner-conteudo">
          <h3>Como funciona a exportação?</h3>
          <ol>
            <li>Selecione as transferências na lista à esquerda. <strong>(Pedidos Pendentes precisam ser aprovados primeiro no Painel de Aprovação)</strong></li>
            <li>Os itens de todas as transferências selecionadas são consolidados no painel à direita.</li>
            <li>Ao Exportar, o sistema gera o Excel no formato exato da página de <strong>Entrada de Estoque</strong>.</li>
            <li>Na filial de destino, basta fazer upload do Excel que a WBS e os rastreios são herdados automaticamente.</li>
          </ol>
        </div>
      </div>

      {/* GRID DE COLUNAS */}
      <div className="transf-grid-colunas">
        
        {/* COLUNA ESQUERDA: LISTA DE TRANSFERÊNCIAS */}
        <div className="transf-cartao">
          <div className="transf-cartao-header">
            <h3 className="transf-cartao-titulo">Transferências Registadas</h3>
            <span className="badge-contagem-simples">{transferenciasFiltradas.length} registro(s)</span>
          </div>

          <div className="transf-controles">
            <div className="transf-pesquisa-wrapper">
              <Search size={16} className="icone-busca" />
              <input 
                type="text" 
                placeholder="Buscar PS, PL, solicitante, filial..." 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>
            
            <div className="transf-acoes-selecao">
              <button className="btn-selecao" onClick={selecionarTodos} disabled={transferenciasFiltradas.length === 0}>
                <CheckSquare size={16} /> Selecionar todos
              </button>
              <button 
                className={`btn-selecao ${selecionadosIds.size === 0 ? 'inativo' : ''}`} 
                onClick={limparSelecao}
                disabled={selecionadosIds.size === 0}
              >
                <Square size={16} /> Limpar
              </button>
            </div>
          </div>

          <div className="transf-lista-scroll">
            {carregando ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#94a3b8' }}>
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : transferenciasFiltradas.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Nenhuma transferência encontrada para esta filial.
              </div>
            ) : (
              transferenciasFiltradas.map(sol => {
                const idReal = sol.idOriginal || sol.id;
                const isAprovada = sol.status === 'Concluído' || sol.status === 'Em Separação';
                const isSelected = isAprovada && selecionadosIds.has(idReal);
                
                const filialOrigem = sol.filial || 'N/D';
                const wbsOrig = sol.wbs && sol.wbs.includes('➔') ? sol.wbs.split('➔')[0]?.trim() : '';
                const destinoVisivel = sol.wbs && sol.wbs.includes('➔') ? sol.wbs.split('➔')[1]?.trim() : sol.wbs;

                return (
                  <div 
                    key={idReal} 
                    className={`transf-item ${isSelected ? 'selecionado' : ''}`}
                    style={{ opacity: isAprovada ? 1 : 0.65 }}
                    onClick={() => toggleSelecao(idReal, isAprovada)}
                  >
                    <div className="transf-checkbox-container">
                      <input 
                        type="checkbox" 
                        className="transf-checkbox-custom"
                        checked={isSelected}
                        disabled={!isAprovada}
                        onChange={() => {}} // Tratado no onClick da div pai
                      />
                    </div>
                    <div className="transf-item-info">
                      <div className="transf-linha-id">
                        {sol.ps}
                        {sol.pl && sol.pl !== '-' && (
                          <span className="badge-bs">{sol.pl.replace('PL #', 'BS ')}</span>
                        )}
                      </div>
                      <div className="transf-nome">{sol.solicitante?.toUpperCase()}</div>
                      <div className="transf-rota">
                        {filialOrigem} — {obterNomeFilialCurto(filialOrigem)} <ArrowRight size={12} /> {destinoVisivel}
                      </div>
                      <div className="transf-linha-badges">
                        <span className="badge-item-count">{sol.itens?.length || 0} item(ns)</span>
                        
                        {isAprovada ? (
                          <span className="badge-status-concluido" style={{ backgroundColor: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.70rem', fontWeight: '600' }}>{sol.status}</span>
                        ) : (
                          <span title="Aprove a solicitação no Painel de Aprovação" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.70rem', fontWeight: '600' }}>
                            <AlertCircle size={12} /> Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: ITENS CONSOLIDADOS */}
        <div className="transf-cartao">
          <div className="transf-cartao-header">
            <h3 className="transf-cartao-titulo">
              <FileText size={18} color="#3b82f6" />
              Itens Consolidados
              <span className="badge-contagem-simples" style={{ marginLeft: '8px' }}>{itensConsolidados.length} item(ns)</span>
            </h3>
            
            <button 
              className="btn-exportar" 
              onClick={exportarExcel}
              disabled={itensConsolidados.length === 0}
            >
              <Download size={16} /> Exportar Excel
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {itensConsolidados.length === 0 ? (
              <div className="estado-vazio-consolidado">
                <Box size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
                <p>Selecione transferências à esquerda para ver os itens consolidados</p>
              </div>
            ) : (
              <table className="tabela-consolidada">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Descrição</th>
                    <th style={{ textAlign: 'center' }}>Qtd</th>
                    <th>WBS Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {itensConsolidados.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                        {item.part_number_manual || item.part_number || '-'}
                      </td>
                      <td>{item.descricao_manual || item.descricao || '-'}</td>
                      <td style={{ textAlign: 'center', color: '#2563eb', fontWeight: '600' }}>
                        {item.quantidade_solicitada} <span style={{fontSize: '0.7rem', color: '#64748b'}}>{item.unidade_medida_manual || 'Unid'}</span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.wbs_destino || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}