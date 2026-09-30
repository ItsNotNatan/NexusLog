// =================================================================
// ARQUIVO: src/pages/Logistica/TransferenciaEstoque/TransferenciaEstoque.jsx
// =================================================================
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Lock, FileText, Search, CheckSquare, Square, Box, Download, ArrowRight, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { io } from 'socket.io-client';

import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch, urlDoServidor } from '../../../services/api';
import './TransferenciaEstoque.css';

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

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  useEffect(() => {
    if (carregandoInicial) return;

    const buscarTransferencias = async (silencioso = false) => {
      try {
        if (!silencioso) setCarregando(true);
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        
        const resultado = await apiFetch(`/solicitacoes/listar?limit=1000&filial=${filialFiltro}&t=${Date.now()}`);

        if (resultado.sucesso) {
          const transferencias = resultado.dados.filter(
            s => (
              s.tipo === 'Material' || 
              s.tipo === 'Transferencia WBS' || 
              s.tipo === 'Transfer. WBS' || 
              s.tipo === 'Crossdocking'
            ) && 
            (s.status === 'Em Separação' || s.status === 'Concluído') && 
            (s.pl && s.pl !== '-' && s.pl !== '—')
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

    const SOCKET_URL = urlDoServidor();
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('solicitacoes_atualizadas', () => {
      buscarTransferencias(true); 
    });

    return () => socket.disconnect();
  }, [estoqueAtual, carregandoInicial, showAlert]);

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

  useEffect(() => {
    setPaginaAtual(1);
  }, [termoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(transferenciasFiltradas.length / itensPorPagina));
  
  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [transferenciasFiltradas.length, totalPaginas, paginaAtual]);

  const indexInicio = (paginaAtual - 1) * itensPorPagina;
  const transferenciasPaginadas = transferenciasFiltradas.slice(indexInicio, indexInicio + itensPorPagina);

  const toggleSelecao = (idOriginal) => {
    const novoSet = new Set(selecionadosIds);
    if (novoSet.has(idOriginal)) {
      novoSet.delete(idOriginal);
    } else {
      novoSet.add(idOriginal);
    }
    setSelecionadosIds(novoSet);
  };

  const selecionarTodos = () => {
    const ids = transferenciasFiltradas.map(t => t.idOriginal || t.id); 
    setSelecionadosIds(new Set(ids));
  };

  const limparSelecao = () => {
    setSelecionadosIds(new Set());
  };

  const itensConsolidados = useMemo(() => {
    const itens = [];
    solicitacoes.forEach(sol => {
      const idReal = sol.idOriginal || sol.id;
      if (selecionadosIds.has(idReal) && sol.itens) {
        sol.itens.forEach(item => {
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

  // =======================================================================
  // ✨ EXPORTAÇÃO EXCEL: FORMATO EXATO PARA A TABELA DE INSERÇÃO/IMPORTAÇÃO
  // =======================================================================
  const exportarExcel = async () => {
    if (itensConsolidados.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Exportação de Estoque');

      // Colunas EXATAMENTE IGUAIS ao ExemploExcel para permitir importação na aba "Configurações > Importar"
      worksheet.columns = [
        { header: 'NUM SAP | DESENHO', key: 'sap', width: 20 },
        { header: 'DESCRIÇÃO', key: 'desc', width: 40 },
        { header: 'FABRICANTE', key: 'pn', width: 25 },
        { header: 'QTDE ENTRADA', key: 'qtd', width: 15 },
        { header: 'REFERÊNCIA', key: 'ref', width: 20 },
        { header: 'UNID. MEDIDA', key: 'unid', width: 15 },
        { header: 'NUM DA NOTA FISCAL', key: 'nf', width: 20 },
        { header: 'FORNECEDOR / REGISTRO', key: 'fornecedor', width: 25 },
        { header: 'CENTRO DE CUSTO - WBS', key: 'wbs', width: 25 },
        { header: 'NOME CENTRO DE CUSTO / PROJETO', key: 'projeto', width: 35 },
        { header: 'EMISSÃO NF', key: 'emi', width: 15 },
        { header: 'RECEB. NF', key: 'rec', width: 15 },
        { header: 'Nº PEDIDO DE COMPRA / CPV', key: 'doc', width: 25 },
        { header: 'VLR. UNITÁRIO NOTA FISCAL', key: 'val', width: 25 },
        { header: 'FILIAL', key: 'filial', width: 15 },
        { header: 'DEPÓSITO', key: 'dep', width: 15 },
        { header: 'ALOCAÇÃO', key: 'aloc', width: 20 }
      ];

      // Formatação visual do Cabeçalho
      const linhaCabecalho = worksheet.getRow(1);
      linhaCabecalho.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      linhaCabecalho.height = 25;

      // Inserção das linhas mapeadas da consolidação
      itensConsolidados.forEach(item => {
        // A WBS leva o destino se for transferência, senão a WBS do item original.
        const wbsFinal = item.wbs_destino && item.wbs_destino !== '-' ? item.wbs_destino : (item.wbs_element || '-');

        worksheet.addRow({
          sap: item.desenho_sap_manual || item.desenho_sap || '-',
          desc: item.descricao_manual || item.descricao || '-',
          pn: item.part_number_manual || item.part_number || '-',
          qtd: item.quantidade_solicitada || 1,
          ref: item.referencia || '-',
          unid: item.unidade_medida_manual || 'Unid',
          nf: item.nf_entrada || '-',
          fornecedor: item.fornecedor || '-',
          wbs: wbsFinal,
          projeto: item.nome_projeto || '-',
          emi: item.emissao_nf || '-',
          rec: item.receb_nf || '-',
          doc: item.documento_compras || '-',
          val: item.valor_unitario_manual || 0,
          filial: item.centro || '-', // Na listagem usa-se centro ou filial
          dep: item.deposito || '20', // Depósito padrão
          // Tag visual na alocação a indicar de onde veio a transferência
          aloc: `[TR] De: ${item.wbs_origem} (${item.solicitacao_ps})`
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Transferencias_Exportadas_${new Date().toISOString().slice(0, 10)}.xlsx`);

      showAlert("Sucesso!", "O ficheiro Excel foi gerado. Use-o na página de 'Importar Base' ou 'Entrada de Estoque' da filial de destino.", "success");
      limparSelecao();
      
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      showAlert("Erro", "Ocorreu um problema ao gerar o ficheiro Excel.", "error");
    }
  };

  return (
    <div className="transf-estoque-wrapper">
      
      <header className="transf-estoque-cabecalho">
        <div>
          <h1>Transferência de Estoque</h1>
          <p>Selecione múltiplas transferências (PS/PL) e exporte no formato compatível para a Importação de Estoque.</p>
        </div>
        <div className="badge-exclusivo">
          <Lock size={14} /> Exclusivo Logística
        </div>
      </header>

      <div className="transf-banner-info">
        <FileText size={24} className="transf-banner-icone" />
        <div className="transf-banner-conteudo">
          <h3>Como funciona a exportação?</h3>
          <ol>
            <li>Selecione as operações na lista à esquerda.</li>
            <li>Os itens selecionados são consolidados no painel à direita.</li>
            <li>Ao Exportar, o sistema gera o Excel no formato exato da página de <strong>Entrada de Estoque e Importação Inicial</strong>.</li>
            <li>Na filial de destino, basta fazer upload do Excel para inserir os materiais no banco de dados.</li>
          </ol>
        </div>
      </div>

      <div className="transf-grid-colunas">
        
        <div className="transf-cartao" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="transf-cartao-header">
            <h3 className="transf-cartao-titulo">Operações de Saída Aprovadas</h3>
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

          <div className="transf-lista-scroll" style={{ flex: 1 }}>
            {carregando ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#94a3b8' }}>
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : transferenciasFiltradas.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Nenhuma operação de saída encontrada para esta filial.
              </div>
            ) : (
              transferenciasPaginadas.map(sol => {
                const idReal = sol.idOriginal || sol.id;
                const isSelected = selecionadosIds.has(idReal);
                
                const filialOrigem = sol.filial || 'N/D';
                const destinoVisivel = sol.wbs && sol.wbs.includes('➔') ? sol.wbs.split('➔')[1]?.trim() : sol.wbs;

                return (
                  <div 
                    key={idReal} 
                    className={`transf-item ${isSelected ? 'selecionado' : ''}`}
                    onClick={() => toggleSelecao(idReal)}
                  >
                    <div className="transf-checkbox-container">
                      <input 
                        type="checkbox" 
                        className="transf-checkbox-custom"
                        checked={isSelected}
                        onChange={() => {}} 
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
                        <span className="badge-status-concluido" style={{ backgroundColor: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.70rem', fontWeight: '600' }}>{sol.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.80rem', color: '#64748b' }}>
                Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                  disabled={paginaAtual === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: paginaAtual === 1 ? '#f8fafc' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.80rem', fontWeight: '500', color: paginaAtual === 1 ? '#94a3b8' : '#334155', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
                <button 
                  onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaAtual === totalPaginas}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: paginaAtual === totalPaginas ? '#f8fafc' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.80rem', fontWeight: '500', color: paginaAtual === totalPaginas ? '#94a3b8' : '#334155', cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                >
                  Próxima <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

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
                <p>Selecione envios à esquerda para ver os itens consolidados</p>
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
