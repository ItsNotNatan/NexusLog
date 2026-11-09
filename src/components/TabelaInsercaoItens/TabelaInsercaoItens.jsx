// =================================================================
// ARQUIVO: src/components/TabelaInsercaoItens/TabelaInsercaoItens.jsx
// =================================================================
import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, AlertCircle, Info } from 'lucide-react';

import CarregarArquivo from '../CarregarArquivo/CarregarArquivo';
import ExemploExcel from '../ExemploExcel/ExemploExcel';
import ScrollDuplo from '../ScrollDuplo/ScrollDuplo';

import { formatarDinheiroTempoReal } from '../../utils/formatadores';

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
  const alturaLinhaPx = 62;

  const totalPaginas = Math.max(1, Math.ceil(itens.length / itensPorPagina));

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [itens.length, totalPaginas, paginaAtual]);

  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  const itensDaPagina = itens.slice(indexPrimeiroItem, indexUltimoItem);

  const limiteAtingido = itens.length >= limiteLinhas;
  const larguraMinimaTabela = '2750px';

  const isWbsBloqueada = wbsGlobal !== undefined || bloquearWBS;

  const estaDestacada = (id) => {
    if (!linhasDestacadas) return false;
    if (linhasDestacadas instanceof Set) return linhasDestacadas.has(id);
    if (Array.isArray(linhasDestacadas)) return linhasDestacadas.includes(id);
    return false;
  };

  const totalDestacadas = linhasDestacadas instanceof Set 
    ? linhasDestacadas.size 
    : (Array.isArray(linhasDestacadas) ? linhasDestacadas.length : 0);

  return (
    <div className="form-cartao" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
      
      {/* CABEÇALHO DO CARD COM BOTÕES */}
      <div style={{ padding: '16px 24px', margin: 0, borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '8px' }}>
            <Package size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: '#1e293b' }}>Itens da Solicitação</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Insira os materiais manualmente ou importe via Excel.</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* ✨ BOTÃO DE ADICIONAR LINHA BEM VISÍVEL */}
          <button
            type="button"
            onClick={onAdicionarLinha}
            disabled={limiteAtingido}
            title={limiteAtingido ? `Limite máximo de ${limiteLinhas} itens atingido.` : 'Adicionar nova linha'}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', 
              backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', 
              fontSize: '0.80rem', fontWeight: '600', color: '#ffffff', 
              cursor: limiteAtingido ? 'not-allowed' : 'pointer',
              opacity: limiteAtingido ? 0.6 : 1,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Plus size={16} /> Nova Linha
          </button>

          <CarregarArquivo
            variante="botao"
            accept=".xlsx, .xls"
            label="Importar Excel"
            icone={<FileSpreadsheet size={16} color="#10b981" />}
            onFileSelect={onImportarExcel}
          />

          <ExemploExcel />

          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: limiteAtingido ? '#b91c1c' : '#475569', backgroundColor: limiteAtingido ? '#fef2f2' : '#f8fafc', border: `1px solid ${limiteAtingido ? '#fecaca' : '#cbd5e1'}`, padding: '6px 12px', borderRadius: '999px' }}>
            {itens.length} / {limiteLinhas} itens
          </span>
        </div>
      </div>

      {/* DISCLAIMER DE CROSSDOCKING */}
      {totalDestacadas > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 24px',
          backgroundColor: '#eff6ff',
          borderBottom: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '0.825rem'
        }}>
          <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
          <span>
            <strong>Atenção Crossdocking:</strong> Apenas as linhas em <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>azul</span> com a etiqueta <strong>CROSS</strong> serão deduzidas na saída de Crossdocking. As demais linhas entrarão no saldo do estoque.
          </span>
        </div>
      )}

      {/* ÁREA DA TABELA */}
      <div style={{ position: 'relative' }}>
        <ScrollDuplo larguraConteudo={larguraMinimaTabela}>
          <table className="tabela-solicitacao-dados" style={{ minWidth: larguraMinimaTabela, width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center', padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>AÇÕES</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>NUM SAP | DESENHO</th>
                <th style={{ minWidth: '220px', padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>DESCRIÇÃO</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>FABRICANTE</th>
                <th style={{ width: '120px', padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>QTDE ENTRADA</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>REFERÊNCIA</th>
                <th style={{ width: '140px', padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>UNID. MEDIDA</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>NUM DA NOTA FISCAL</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>FORNECEDOR / REGISTRO</th>
                <th style={{ 
                  padding: '12px', 
                  backgroundColor: isWbsBloqueada ? '#f1f5f9' : '#f8fafc', 
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}>
                  CENTRO DE CUSTO - WBS
                </th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>NOME CENTRO DE CUSTO / PROJETO</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>EMISSÃO NF</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>RECEB. NF</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>Nº PEDIDO DE COMPRA / CPV</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>VLR. UNITÁRIO NOTA FISCAL</th>
                <th style={{ width: '110px', padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>FILIAL</th>
                <th style={{ width: '110px', padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>DEPÓSITO</th>
                <th style={{ padding: '12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>ALOCAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {itensDaPagina.length === 0 ? (
                <tr>
                  <td colSpan={18} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Nenhum item adicionado. Clique no botão "+ Nova Linha" acima ou importe um arquivo Excel.
                  </td>
                </tr>
              ) : (
                itensDaPagina.map((item, index) => {
                  const isCrossdockingMatch = estaDestacada(item.id);

                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        height: `${alturaLinhaPx}px`, 
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isCrossdockingMatch ? '#f0f7ff' : 'transparent',
                        borderLeft: isCrossdockingMatch ? '4px solid #2563eb' : '4px solid transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <td style={{ textAlign: 'center', padding: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                          <button 
                            type="button"
                            onClick={() => onRemoverItem(item.id)} 
                            className="btn-deletar-linha" 
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            title="Remover linha"
                          >
                            <Trash2 size={16} />
                          </button>

                          {isCrossdockingMatch && (
                            <span 
                              title="Item reconhecido: será deduzido pelo Crossdocking" 
                              style={{ 
                                fontSize: '0.625rem', 
                                fontWeight: '700', 
                                color: '#1d4ed8', 
                                backgroundColor: '#dbeafe', 
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px', 
                                padding: '1px 5px',
                                lineHeight: '1.2'
                              }}
                            >
                              CROSS
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b' }} value={item.desenhoSAP || ''} onChange={(e) => onAtualizarCampo(item.id, 'desenhoSAP', e.target.value)} placeholder="SAP / Desenho" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b' }} value={item.vendorDescription || ''} onChange={(e) => onAtualizarCampo(item.id, 'vendorDescription', e.target.value)} placeholder="Descrição" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b' }} value={item.fabricante || ''} onChange={(e) => onAtualizarCampo(item.id, 'fabricante', e.target.value)} placeholder="Fabricante" />
                      </td>

                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input 
                          type="number" 
                          min="1" 
                          step="1"
                          style={{ 
                            width: '80px', padding: '6px 8px', border: '1px solid #bfdbfe', 
                            borderRadius: '6px', color: '#2563eb', fontWeight: '700', 
                            textAlign: 'center', backgroundColor: isCrossdockingMatch ? '#ffffff' : '#eff6ff', outline: 'none',
                            cursor: 'text'
                          }} 
                          value={item.qtdFornecida} 
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                          }}
                          onBlur={(e) => {
                            if (!e.target.value || parseInt(e.target.value, 10) < 1) onAtualizarCampo(item.id, 'qtdFornecida', 1);
                          }}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val === '0') val = '1';
                            onAtualizarCampo(item.id, 'qtdFornecida', val);
                          }} 
                          placeholder="1" 
                        />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569' }} value={item.referencia || ''} onChange={(e) => onAtualizarCampo(item.id, 'referencia', e.target.value)} placeholder="Referência" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <select className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569' }} value={item.unidadeMedida || 'Unid'} onChange={(e) => onAtualizarCampo(item.id, 'unidadeMedida', e.target.value)}>
                          <option value="Unid">Unid</option>
                          <option value="Kg">Kg</option>
                          <option value="Metro">Metro</option>
                          <option value="Caixa">Caixa</option>
                          <option value="Litro">Litro</option>
                          <option value="NR">NR</option>
                        </select>
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-preto" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b' }} value={item.nfEntrada || ''} onChange={(e) => onAtualizarCampo(item.id, 'nfEntrada', e.target.value)} placeholder="NF" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza-escuro" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569' }} value={item.fornecedor || ''} onChange={(e) => onAtualizarCampo(item.id, 'fornecedor', e.target.value)} placeholder="Fornecedor" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input 
                          style={{ 
                            width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', 
                            backgroundColor: isWbsBloqueada ? '#f1f5f9' : '#ffffff', 
                            color: isWbsBloqueada ? '#94a3b8' : '#2563eb', 
                            fontFamily: 'monospace'
                          }} 
                          disabled={isWbsBloqueada}
                          value={isWbsBloqueada ? (wbsGlobal || '-') : (item.wbsElement || '')} 
                          onChange={(e) => !isWbsBloqueada && onAtualizarCampo(item.id, 'wbsElement', e.target.value)} 
                          placeholder="-" 
                        />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569' }} value={item.nomeProjeto || ''} onChange={(e) => onAtualizarCampo(item.id, 'nomeProjeto', e.target.value)} placeholder="Nome Projeto" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input 
                          type="date" 
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }} 
                          value={item.emissaoNF === '-' ? '' : (item.emissaoNF || '')} 
                          onChange={(e) => onAtualizarCampo(item.id, 'emissaoNF', e.target.value)} 
                        />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input 
                          type="date" 
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }} 
                          value={item.recebNF === '-' ? '' : (item.recebNF || '')} 
                          onChange={(e) => onAtualizarCampo(item.id, 'recebNF', e.target.value)} 
                        />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569' }} value={item.docCompras || ''} onChange={(e) => onAtualizarCampo(item.id, 'docCompras', e.target.value)} placeholder="Doc Compras" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input 
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b' }} 
                          value={item.poNetPrice || ''} 
                          onChange={(e) => {
                            const valorFormatado = formatarDinheiroTempoReal(e.target.value);
                            onAtualizarCampo(item.id, 'poNetPrice', valorFormatado);
                          }} 
                          placeholder="R$ 0,00" 
                        />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569' }} value={item.centro || ''} onChange={(e) => onAtualizarCampo(item.id, 'centro', e.target.value)} placeholder="Filial" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#475569' }} value={item.deposito || ''} onChange={(e) => onAtualizarCampo(item.id, 'deposito', e.target.value)} placeholder="Depósito" />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input className="input-editavel-tabela link-azul-fake" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', outline: 'none', backgroundColor: '#ffffff', color: '#2563eb', fontFamily: 'monospace' }} value={item.alocacao || ''} onChange={(e) => onAtualizarCampo(item.id, 'alocacao', e.target.value)} placeholder="Alocação" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ScrollDuplo>
      </div>

      {/* RODAPÉ COM PAGINAÇÃO E BOTÃO EXTRA DE ADICIONAR LINHA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={onAdicionarLinha}
          disabled={limiteAtingido}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px',
            fontSize: '0.80rem', fontWeight: '600', color: '#334155', cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Adicionar outra linha
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> &middot; Total: <strong>{itens.length}</strong> itens
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))} disabled={paginaAtual === 1} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', opacity: paginaAtual === 1 ? 0.6 : 1 }}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <button type="button" onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer', opacity: paginaAtual === totalPaginas ? 0.6 : 1 }}>
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
