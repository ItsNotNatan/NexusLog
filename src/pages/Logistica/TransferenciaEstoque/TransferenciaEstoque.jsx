import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Lock, FileText, Search, CheckSquare, Square, Box, Download, ArrowRight, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [selecionadosIds, setSelecionadosIds] = useState(new Set());

  // ---------------------------------------------------------------------------
  // 1. BUSCA DE DADOS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const buscarTransferencias = async () => {
      try {
        setCarregando(true);
        // Busca apenas as solicitações do tipo "Transferencia WBS"
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        const resultado = await apiFetch(`/solicitacoes/listar?tipo=Transferencia WBS&limit=1000&filial=${filialFiltro}`);

        if (resultado.sucesso) {
          // Mantém apenas as que estão concluídas ou em separação
          const transferencias = resultado.dados.filter(
            s => s.status === 'Concluído' || s.status === 'Em Separação'
          );
          setSolicitacoes(transferencias);
        } else {
          showAlert("Erro", resultado.erro || "Falha ao carregar transferências.", "error");
        }
      } catch (error) {
        showAlert("Erro de Conexão", "Não foi possível ligar ao servidor.", "error");
      } finally {
        setCarregando(false);
      }
    };

    buscarTransferencias();
  }, [estoqueAtual, showAlert]);

  // ---------------------------------------------------------------------------
  // 2. FILTRAGEM
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
  // 3. SELEÇÃO DE ITENS
  // ---------------------------------------------------------------------------
  const toggleSelecao = (id) => {
    const novoSet = new Set(selecionadosIds);
    if (novoSet.has(id)) {
      novoSet.delete(id);
    } else {
      novoSet.add(id);
    }
    setSelecionadosIds(novoSet);
  };

  const selecionarTodos = () => {
    const idsFiltrados = transferenciasFiltradas.map(t => t.id);
    setSelecionadosIds(new Set(idsFiltrados));
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
      if (selecionadosIds.has(sol.id) && sol.itens) {
        sol.itens.forEach(item => {
          // Extraímos a origem e o destino do WBS para preencher o Excel
          const origemWBS = sol.wbs ? sol.wbs.split('➔')[0]?.trim() : '-';
          const destinoWBS = sol.wbs ? sol.wbs.split('➔')[1]?.trim() : '-';
          
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
  // 5. EXPORTAR PARA EXCEL (Formato Visão Geral do Estoque)
  // ---------------------------------------------------------------------------
  const exportarExcel = async () => {
    if (itensConsolidados.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Itens Transferidos');

      // Colunas idênticas às da entrada/visão geral para facilitar o upload posterior
      worksheet.columns = [
        { header: 'Desenho SAP', key: 'desenhoSAP', width: 20 },
        { header: 'Nº peça fabricante', key: 'partNumber', width: 25 },
        { header: 'Descrição', key: 'descricao', width: 40 },
        { header: 'Qtd. fornecida', key: 'qtd', width: 15 },
        { header: 'Unidade de medida', key: 'unidade', width: 20 },
        { header: 'WBS Element', key: 'wbs', width: 25 },
        { header: 'Origem (PS/BS)', key: 'origem', width: 25 },
      ];

      // Estilizar o cabeçalho
      const linhaCabecalho = worksheet.getRow(1);
      linhaCabecalho.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Azul
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Adicionar os dados
      itensConsolidados.forEach(item => {
        worksheet.addRow({
          desenhoSAP: item.desenho_sap_manual || '-',
          partNumber: item.part_number_manual || '-',
          descricao: item.descricao_manual || '-',
          qtd: item.quantidade_solicitada || 1,
          unidade: item.unidade_medida_manual || 'Unid',
          wbs: item.wbs_destino || '-', // A nova alocação será o destino da transferência
          origem: `${item.solicitacao_ps} / ${item.solicitacao_bs || '-'}`
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Transferencias_Consolidadas_${new Date().toISOString().slice(0, 10)}.xlsx`);

      showAlert("Sucesso!", "O ficheiro Excel foi gerado e o download foi iniciado.", "success");
      
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
          <h3>Como funciona</h3>
          <ol>
            <li>Selecione uma ou mais transferências na lista à esquerda (use a busca para filtrar)</li>
            <li>Os itens de todas as transferências selecionadas são consolidados à direita</li>
            <li>Exporte um único Excel — o layout é idêntico ao da "Visão Geral do Estoque"</li>
            <li>Faça upload do arquivo na tela "Entrada de Estoque" para dar entrada automática</li>
          </ol>
        </div>
      </div>

      {/* GRID DE COLUNAS */}
      <div className="transf-grid-colunas">
        
        {/* COLUNA ESQUERDA: LISTA DE TRANSFERÊNCIAS */}
        <div className="transf-cartao">
          <div className="transf-cartao-header">
            <h3 className="transf-cartao-titulo">Transferências Disponíveis</h3>
            <span className="badge-contagem-simples">{transferenciasFiltradas.length} registro(s)</span>
          </div>

          <div className="transf-controles">
            <div className="transf-pesquisa-wrapper">
              <Search size={16} className="icone-busca" />
              <input 
                type="text" 
                placeholder="Buscar PS, BS, solicitante, filial..." 
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
                Nenhuma transferência encontrada.
              </div>
            ) : (
              transferenciasFiltradas.map(sol => {
                const isSelected = selecionadosIds.has(sol.id);
                // Calcula as filiais para mostrar a rota
                const filialOrigem = sol.filial || 'N/D';
                const wbsOrig = sol.wbs ? sol.wbs.split('➔')[0]?.trim() : '';
                // Tentamos descobrir a filial de destino baseada no WBS (ex: "Goiana" se o WBS contiver algo indicativo, senao mostramos o WBS)
                const destinoVisivel = sol.wbs ? sol.wbs.split('➔')[1]?.trim() : 'Destino';

                return (
                  <div 
                    key={sol.id} 
                    className={`transf-item ${isSelected ? 'selecionado' : ''}`}
                    onClick={() => toggleSelecao(sol.id)}
                  >
                    <div className="transf-checkbox-container">
                      <input 
                        type="checkbox" 
                        className="transf-checkbox-custom"
                        checked={isSelected}
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
                      <div className="transf-nome">{sol.solicitante.toUpperCase()}</div>
                      <div className="transf-rota">
                        {filialOrigem} — {obterNomeFilialCurto(filialOrigem)} <ArrowRight size={12} /> {destinoVisivel}
                      </div>
                      <div className="transf-linha-badges">
                        <span className="badge-item-count">{sol.itens?.length || 0} item(ns)</span>
                        <span className="badge-status-concluido">{sol.status}</span>
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
                        {item.part_number_manual || '-'}
                      </td>
                      <td>{item.descricao_manual || '-'}</td>
                      <td style={{ textAlign: 'center', color: '#2563eb', fontWeight: '600' }}>
                        {item.quantidade_solicitada} <span style={{fontSize: '0.7rem', color: '#64748b'}}>{item.unidade_medida_manual}</span>
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