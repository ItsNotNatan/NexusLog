// =================================================================
// ARQUIVO: src/components/TabelaInsercaoItens/TabelaInsercaoItens.jsx
// =================================================================
import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';

import CarregarArquivo from '../CarregarArquivo/CarregarArquivo';
import ExemploExcel from '../ExemploExcel/ExemploExcel';
import ScrollDuplo from '../ScrollDuplo/ScrollDuplo';
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
  const itensPorPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(itens.length / itensPorPagina));

  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [itens.length, totalPaginas, paginaAtual]);

  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  const itensDaPagina = itens.slice(indexPrimeiroItem, indexUltimoItem);

  const isWbsBloqueada = wbsGlobal !== undefined || bloquearWBS;

  const estaDestacada = (id) => {
    if (!linhasDestacadas) return false;
    if (linhasDestacadas instanceof Set) return linhasDestacadas.has(id);
    if (Array.isArray(linhasDestacadas)) return linhasDestacadas.includes(id);
    return false;
  };

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

      <ScrollDuplo>
        <table className="tabela-insercao" style={{ width: '100%', minWidth: '2400px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '220px' }}>DESENHO SAP</th>
              <th style={{ width: '380px' }}>DESCRIÇÃO DO MATERIAL</th>
              <th style={{ width: '200px' }}>PART NUMBER (PN)</th>
              <th style={{ width: '110px' }}>QTD</th>
              <th style={{ width: '120px' }}>UNID</th>
              <th style={{ width: '180px' }}>NF ENTRADA</th>
              <th style={{ width: '220px' }}>FORNECEDOR</th>
              <th style={{ width: '180px' }}>REFERÊNCIA</th>
              <th style={{ width: '160px' }}>VALOR UNITÁRIO</th>
              <th style={{ width: '220px' }}>WBS / CENTRO CUSTO</th>
              <th style={{ width: '180px' }}>ALOCAÇÃO</th>
              <th style={{ width: '60px', textAlign: 'center' }}>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {itensDaPagina.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  Nenhum item adicionado. Clique no botão abaixo ou importe um arquivo Excel.
                </td>
              </tr>
            ) : (
              itensDaPagina.map((item, indexOriginal) => {
                const idx = indexPrimeiroItem + indexOriginal;
                const isCrossMatch = estaDestacada(item.id);

                return (
                  <tr key={item.id || idx} className={isCrossMatch ? 'linha-crossdocking' : ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          value={item.desenhoSAP || item.desenho_sap || ''}
                          onChange={(e) => onAtualizarCampo(item.id, 'desenhoSAP', e.target.value)}
                          placeholder="Ex: 10293847"
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                        />
                        {isCrossMatch && <span className="badge-cross" title="Material vinculado a um Crossdocking">CROSS</span>}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.vendorDescription || item.descricao || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'vendorDescription', e.target.value)}
                        placeholder="Descrição do material..."
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.numPecaFabricante || item.part_number || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'numPecaFabricante', e.target.value)}
                        placeholder="PN..."
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.qtdFornecida !== undefined ? item.qtdFornecida : ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'qtdFornecida', e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', textAlign: 'center' }}
                      />
                    </td>
                    <td>
                      <select
                        value={item.unidadeMedida || item.unidade_medida || 'Unid'}
                        onChange={(e) => onAtualizarCampo(item.id, 'unidadeMedida', e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      >
                        <option value="Unid">Unid</option>
                        <option value="Kg">Kg</option>
                        <option value="Metros">Metros</option>
                        <option value="Litros">Litros</option>
                        <option value="Caixa">Caixa</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.nfEntrada || item.nf_entrada || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'nfEntrada', e.target.value)}
                        placeholder="Nº NF"
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.fornecedor || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'fornecedor', e.target.value)}
                        placeholder="Ex: SIEMENS"
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.referencia || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'referencia', e.target.value)}
                        placeholder="Referência..."
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.poNetPrice || item.valor_unitario || ''}
                        onChange={(e) => {
                          const valFormatado = formatarDinheiroTempoReal ? formatarDinheiroTempoReal(e.target.value) : e.target.value;
                          onAtualizarCampo(item.id, 'poNetPrice', valFormatado);
                        }}
                        placeholder="R$ 0,00"
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={isWbsBloqueada ? wbsGlobal : (item.wbsElement || item.wbs || '')}
                        onChange={(e) => !isWbsBloqueada && onAtualizarCampo(item.id, 'wbsElement', e.target.value)}
                        disabled={isWbsBloqueada}
                        placeholder="WBS..."
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: isWbsBloqueada ? '#f1f5f9' : '#ffffff', color: isWbsBloqueada ? '#64748b' : '#334155' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.alocacao || ''}
                        onChange={(e) => onAtualizarCampo(item.id, 'alocacao', e.target.value)}
                        placeholder="Ex: Prateleira A1"
                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onRemoverItem(item.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                        title="Remover linha"
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ScrollDuplo>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={onAdicionarLinha}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#3b82f6', fontWeight: '600', cursor: 'pointer' }}
        >
          <Plus size={18} /> Adicionar Linha Manualmente
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
