// =================================================================
// ARQUIVO: src/components/TabelaInsercaoItens/TabelaInsercaoItens.jsx
// =================================================================
import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, Info } from 'lucide-react';

import CarregarArquivo from '../CarregarArquivo/CarregarArquivo';
import ExemploExcel from '../ExemploExcel/ExemploExcel';
import ScrollDuplo from '../ScrollDuplo/ScrollDuplo';
import { apiFetch } from '../../services/api';
import { formatarDinheiroTempoReal } from '../../utils/formatadores';
import './TabelaInsercaoItens.css';

export default function TabelaInsercaoItens({
  itens = [],
  limiteLinhas = 100, 
  wbsGlobal, 
  bloquearWBS = false, 
  linhasDestacadas = new Set(),
  onAtualizarCampo,
  onRemoverItem,
  onAdicionarLinha,
  onImportarExcel
}) {
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [crossdockingsPendentes, setCrossdockingsPendentes] = useState([]);
  
  const itensPorPagina = 10;
  const alturaLinhaPx = 62;
  const totalPaginas = Math.max(1, Math.ceil(itens.length / itensPorPagina));

  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [itens.length, totalPaginas, paginaAtual]);

  useEffect(() => {
    const buscarCrossdockings = async () => {
      try {
        const res = await apiFetch(`/solicitacoes/listar?tipo=Crossdocking&status=Pendente&limit=100`);
        if (res.sucesso && res.dados) {
          setCrossdockingsPendentes(res.dados);
        }
      } catch (e) {
        console.error("Erro ao buscar crossdockings pendentes:", e);
      }
    };
    buscarCrossdockings();
  }, []);

  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  const itensDaPagina = itens.slice(indexPrimeiroItem, indexUltimoItem);

  const linhasFantasmas = Math.max(0, itensPorPagina - itensDaPagina.length);
  const limiteAtingido = itens.length >= limiteLinhas;
  const larguraMinimaTabela = '2750px';
  const isWbsBloqueada = wbsGlobal !== undefined || bloquearWBS;

  // ✨ COMPARAÇÃO ESTRITA DE FORNECEDOR (Sem falso positivo)
  const verificarMatchCrossdocking = (itemLinha) => {
    const nf = itemLinha.nfEntrada || itemLinha.nf_entrada || itemLinha.nf;
    if (!nf || !itemLinha.fornecedor) return false;

    const nfLinha = String(nf).trim().toUpperCase();
    const fornLinha = String(itemLinha.fornecedor).trim().toUpperCase();
    const sapLinha = String(itemLinha.desenhoSAP || itemLinha.desenho_sap || '').trim().toUpperCase();

    return crossdockingsPendentes.some(cross => {
      const nfCross = String(cross.nfCrossdocking || '').trim().toUpperCase();
      const fornCrossBruto = cross.itens?.[0]?.fornecedor || '';
      const fornCrossEsperado = String(fornCrossBruto).trim().toUpperCase().split(/\s+/)[0];
      
      if (!fornCrossEsperado || nfLinha !== nfCross) return false;

      // Validação: ou são idênticos, ou o digitado bate exatamente com o primeiro termo esperado
      const bateuFornecedor = (fornLinha === fornCrossEsperado) || (fornLinha.split(/\s+/)[0] === fornCrossEsperado && fornCrossBruto.trim().toUpperCase() === fornLinha);
      if (!bateuFornecedor) return false;

      const isParcial = cross.itens?.some(i => i.desenho_sap_manual && i.desenho_sap_manual !== '-');
      if (!isParcial) return true; // Total

      return cross.itens?.some(i => String(i.desenho_sap_manual || '').trim().toUpperCase() === sapLinha);
    });
  };

  const estaDestacada = (id) => {
    if (!linhasDestacadas) return false;
    if (linhasDestacadas instanceof Set) return linhasDestacadas.has(id);
    if (Array.isArray(linhasDestacadas)) return linhasDestacadas.includes(id);
    return false;
  };

  const temMatchTempoReal = itens.some(item => verificarMatchCrossdocking(item));
  const totalDestacadas = linhasDestacadas instanceof Set ? linhasDestacadas.size : (Array.isArray(linhasDestacadas) ? linhasDestacadas.length : 0);
  const mostrarBannerCross = totalDestacadas > 0 || temMatchTempoReal;

  return (
    <div className="form-cartao" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="form-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="icone-destaque azul"><Package size={24} /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Itens da Solicitação</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Insira os materiais manualmente ou importe via Excel.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ExemploExcel />
          <CarregarArquivo variante="botao" accept=".xlsx, .xls" label="Importar Excel" icone={<FileSpreadsheet size={16} />} onFileSelect={onImportarExcel} />
        </div>
      </div>

      {mostrarBannerCross && (
        <div style={{
          backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '0.825rem', color: '#1e40af', borderBottom: '1px solid #dbeafe'
        }}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Atenção Crossdocking:</strong> Apenas as linhas marcadas em <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>azul</span> com a etiqueta <strong>CROSS</strong> serão deduzidas na saída de Crossdocking. As demais linhas entrarão normalmente no saldo disponível de estoque.
          </span>
        </div>
      )}

      <ScrollDuplo>
        <table className="tabela-insercao" style={{ width: '100%', minWidth: larguraMinimaTabela, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>AÇÕES</th>
              <th style={{ width: '220px' }}>NUM SAP | DESENHO</th>
              <th style={{ width: '380px' }}>DESCRIÇÃO</th>
              <th style={{ width: '220px' }}>FABRICANTE</th>
              <th style={{ width: '110px', textAlign: 'center' }}>QTDE ENTRADA</th>
              <th style={{ width: '180px' }}>REFERÊNCIA</th>
              <th style={{ width: '120px' }}>UNID. MEDIDA</th>
              <th style={{ width: '180px' }}>NUM DA NOTA FISCAL</th>
              <th style={{ width: '220px' }}>FORNECEDOR / REGISTRO</th>
              <th style={{ width: '220px' }}>CENTRO DE CUSTO - WBS</th>
              <th style={{ width: '250px' }}>NOME CENTRO DE CUSTO / PROJETO</th>
              <th style={{ width: '150px' }}>EMISSÃO NF</th>
              <th style={{ width: '150px' }}>RECEB. NF</th>
              <th style={{ width: '200px' }}>Nº PEDIDO DE COMPRA / CPV</th>
              <th style={{ width: '160px' }}>VLR. UNITÁRIO NOTA FISCAL</th>
              <th style={{ width: '140px' }}>FILIAL</th>
              <th style={{ width: '140px' }}>DEPÓSITO</th>
              <th style={{ width: '180px' }}>ALOCAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {itensDaPagina.length === 0 ? (
              <tr>
                <td colSpan="18" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Nenhum item adicionado. Clique no botão abaixo ou importe um arquivo Excel.
                </td>
              </tr>
            ) : (
              itensDaPagina.map((item, indexOriginal) => {
                const idx = indexPrimeiroItem + indexOriginal;
                const isCrossMatch = estaDestacada(item.id) || verificarMatchCrossdocking(item);

                return (
                  <tr 
                    key={item.id || idx} 
                    style={{ 
                      height: `${alturaLinhaPx}px`, 
                      backgroundColor: isCrossMatch ? '#eff6ff' : 'transparent',
                      borderLeft: isCrossMatch ? '4px solid #2563eb' : 'none'
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <button onClick={() => onRemoverItem(item.id)} className="btn-acao-tabela lixeira" title="Excluir Linha" type="button">
                          <Trash2 size={16} />
                        </button>
                        {isCrossMatch && (
                          <span style={{ backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.65rem', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            CROSS
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.desenhoSAP || item.desenho_sap || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'desenhoSAP', e.target.value)}
                        placeholder="Desenho SAP"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.vendorDescription || item.descricao || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'vendorDescription', e.target.value)}
                        placeholder="Descrição"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.fabricante || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'fabricante', e.target.value)}
                        placeholder="Nome do Fabricante"
                      />
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        value={item.qtdFornecida !== undefined ? item.qtdFornecida : ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'qtdFornecida', e.target.value)}
                        style={{ textAlign: 'center' }}
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.referencia || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'referencia', e.target.value)}
                        placeholder="Referência"
                      />
                    </td>

                    <td>
                      <select
                        value={item.unidadeMedida || item.unidade_medida || 'Unid'}
                        onChange={(e) => onAtualizarCampo(item.id, 'unidadeMedida', e.target.value)}
                      >
                        <option value="Unid">Unid</option>
                        <option value="M">M</option>
                        <option value="PÇ">PÇ</option>
                        <option value="KG">KG</option>
                        <option value="CJ">CJ</option>
                      </select>
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.nfEntrada || item.nf_entrada || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'nfEntrada', e.target.value)}
                        placeholder="Nº da Nota"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.fornecedor || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'fornecedor', e.target.value)}
                        placeholder="Fornecedor"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={isWbsBloqueada ? wbsGlobal : (item.wbsElement || item.wbs || '')}
                        onChange={(e) => !isWbsBloqueada && onAtualizarCampo(item.id, 'wbsElement', e.target.value)}
                        disabled={isWbsBloqueada}
                        placeholder="WBS"
                        style={{
                          backgroundColor: isWbsBloqueada ? '#f1f5f9' : '#ffffff',
                          color: isWbsBloqueada ? '#64748b' : '#334155'
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.nomeProjeto || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'nomeProjeto', e.target.value)}
                        placeholder="Nome Projeto"
                      />
                    </td>

                    <td>
                      <input
                        type="date"
                        value={item.emissaoNF || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'emissaoNF', e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        type="date"
                        value={item.recebNF || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'recebNF', e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.docCompras || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'docCompras', e.target.value)}
                        placeholder="Doc Compras"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.poNetPrice || item.valor_unitario || ''}
                        onChange={(e) => {
                          const val = formatarDinheiroTempoReal ? formatarDinheiroTempoReal(e.target.value) : e.target.value;
                          onAtualizarCampo(item.id, 'poNetPrice', val);
                        }}
                        placeholder="R$ 0,00"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.centro || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'centro', e.target.value)}
                        placeholder="Filial"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.deposito || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'deposito', e.target.value)}
                        placeholder="Depósito"
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.alocacao || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'alocacao', e.target.value)}
                        placeholder="Alocação"
                      />
                    </td>
                  </tr>
                );
              })
            )}

            {Array.from({ length: linhasFantasmas }).map((_, index) => (
              <tr key={`fantasma-${index}`} style={{ height: `${alturaLinhaPx}px` }}>
                {Array.from({ length: 18 }).map((_, colIndex) => (
                  <td key={colIndex}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollDuplo>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={onAdicionarLinha}
          disabled={limiteAtingido}
          className="btn-adicionar-linha"
          style={{ opacity: limiteAtingido ? 0.5 : 1, cursor: limiteAtingido ? 'not-allowed' : 'pointer' }}
        >
          <Plus size={16} /> Adicionar Linha Manualmente
        </button>

        {itens.length > itensPorPagina && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Página <strong>{paginaAtual}</strong> de {totalPaginas}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))} disabled={paginaAtual === 1} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer' }} type="button"><ChevronLeft size={16} /></button>
              <button onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer' }} type="button"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
