// =================================================================
// ARQUIVO: src/components/TabelaInsercaoItens/TabelaInsercaoItens.jsx
// DESCRIÇÃO: Tabela componentizada com paginação para entrada de itens
// =================================================================
import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

import CarregarArquivo from '../CarregarArquivo/CarregarArquivo';
import ExemploExcel from '../ExemploExcel/ExemploExcel';

export default function TabelaInsercaoItens({
  itens,
  dataMinima = '',
  mostrarDataNecessidade = false,
  mostrarExemploExcel = false,
  limiteLinhas = 20, // Prop que recebe o limite dinamicamente
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

  const linhasFantasmas = Math.max(0, itensPorPagina - itensDaPagina.length);

  // Lógica de limite
  const limiteAtingido = itens.length >= limiteLinhas;

  return (
    <div className="form-cartao" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="form-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        <div className="form-header-esquerda" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="form-header-icone verde-quadrado" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '6px' }}>
            <Package size={16} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1rem', margin: 0, color: '#1e293b' }}>Itens para Entrada</h2>
            
            {/* ✨ AQUI ESTÁ A NOVIDADE: A etiqueta (badge) dinâmica ao lado do título */}
            <span style={{ 
              fontSize: '0.7rem', 
              fontWeight: '600', 
              backgroundColor: '#e0f2fe', 
              color: '#0284c7', 
              padding: '2px 8px', 
              borderRadius: '999px',
              border: '1px solid #bae6fd',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              Máx: {limiteLinhas}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onAdicionarLinha}
            disabled={limiteAtingido}
            title={limiteAtingido ? `Limite máximo de ${limiteLinhas} itens atingido.` : 'Adicionar linha em branco'}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
              backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', 
              fontSize: '0.75rem', fontWeight: '600', color: '#475569', 
              cursor: limiteAtingido ? 'not-allowed' : 'pointer',
              opacity: limiteAtingido ? 0.5 : 1
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

          {mostrarExemploExcel && <ExemploExcel />}

          <span style={{ 
            fontSize: '0.75rem', fontWeight: '500', 
            color: limiteAtingido ? '#b91c1c' : '#64748b', 
            backgroundColor: limiteAtingido ? '#fef2f2' : '#f8fafc', 
            border: `1px solid ${limiteAtingido ? '#fecaca' : '#e2e8f0'}`, 
            padding: '4px 10px', borderRadius: '999px' 
          }}>
            {itens.length} / {limiteLinhas} itens
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {itens.length === 0 && (
          <div style={{ 
            position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
            backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderLeft: '4px solid #f59e0b', 
            padding: '12px 20px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px', 
            color: '#b45309', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              Atenção: A sua lista está vazia. Clique em "Nova Linha" ou importe uma planilha para começar.
            </span>
          </div>
        )}

        <div className="scroll-tabela-solicitacao" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="tabela-solicitacao-dados" style={{ minWidth: mostrarDataNecessidade ? '2400px' : '2200px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center', padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>AÇÕES</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>Nº PEÇA FABRICANTE</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>FORNECEDOR</th>
                <th style={{ width: '120px', padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>QTD. FORNECIDA</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>NF DE ENTRADA</th>
                <th style={{ width: '140px', padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>UNIDADE DE MEDIDA</th>
                <th style={{ minWidth: '200px', padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>VENDOR DESCRIPTION</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>WBS ELEMENT</th>
                {mostrarDataNecessidade && <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>DATA DE NECESSIDADE</th>}
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>EMISSÃO NF</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>RECEB. NF</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>DOCUMENTO DE COMPRAS</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>PO NET PRICE</th>
                <th style={{ width: '100px', padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>CENTRO</th>
                <th style={{ width: '100px', padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>DEPÓSITO</th>
                <th style={{ padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>ALOCAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {itensDaPagina.map((item) => (
                <tr key={item.id} style={{ height: `${alturaLinhaPx}px`, borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => onRemoverItem(item.id)} className="btn-deletar-linha" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela badge-partnumber" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontWeight: '600' }} value={item.numPecaFabricante} onChange={(e) => onAtualizarCampo(item.id, 'numPecaFabricante', e.target.value)} placeholder="PN" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela texto-cinza-escuro" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569' }} value={item.fornecedor} onChange={(e) => onAtualizarCampo(item.id, 'fornecedor', e.target.value)} placeholder="Fornecedor" />
                  </td>
                  <td className="qtd-solicitada-destaque" style={{ padding: '8px', textAlign: 'center' }}>
                    <input type="number" className="input-inline-tabela" style={{ width: '60px', padding: '4px 8px', border: '1px solid transparent', borderRadius: '4px', color: '#2563eb', fontWeight: '700', textAlign: 'center', backgroundColor: '#eff6ff', outline: 'none' }} value={item.qtdFornecida} onChange={(e) => onAtualizarCampo(item.id, 'qtdFornecida', e.target.value)} placeholder="0" min="1" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela texto-preto" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#1e293b' }} value={item.nfEntrada} onChange={(e) => onAtualizarCampo(item.id, 'nfEntrada', e.target.value)} placeholder="NF Entrada" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569', appearance: 'auto', padding: '4px' }} value={item.unidadeMedida} onChange={(e) => onAtualizarCampo(item.id, 'unidadeMedida', e.target.value)}>
                      <option value="Unid">Unid</option>
                      <option value="Kg">Kg</option>
                      <option value="Metro">Metro</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Litro">Litro</option>
                      <option value="NR">NR</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569' }} value={item.vendorDescription} onChange={(e) => onAtualizarCampo(item.id, 'vendorDescription', e.target.value)} placeholder="Descrição do fornecedor" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela link-azul-fake" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#2563eb', fontFamily: 'monospace' }} value={item.wbsElement} onChange={(e) => onAtualizarCampo(item.id, 'wbsElement', e.target.value)} placeholder="WBS" />
                  </td>
                  
                  {mostrarDataNecessidade && (
                    <td style={{ padding: '8px' }}>
                      <input type="date" className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569', cursor: 'pointer' }} value={item.dataNecessidade} min={dataMinima} onChange={(e) => onAtualizarCampo(item.id, 'dataNecessidade', e.target.value)} onKeyDown={(e) => e.preventDefault()} onClick={(e) => e.target.showPicker && e.target.showPicker()} />
                    </td>
                  )}

                  <td style={{ padding: '8px' }}>
                    <input type={mostrarDataNecessidade ? 'date' : 'text'} className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569', cursor: mostrarDataNecessidade ? 'pointer' : 'text' }} value={item.emissaoNF} min={dataMinima} onChange={(e) => onAtualizarCampo(item.id, 'emissaoNF', e.target.value)} onKeyDown={(e) => mostrarDataNecessidade && e.preventDefault()} onClick={(e) => mostrarDataNecessidade && e.target.showPicker && e.target.showPicker()} placeholder="DD/MM/AAAA" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input type={mostrarDataNecessidade ? 'date' : 'text'} className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569', cursor: mostrarDataNecessidade ? 'pointer' : 'text' }} value={item.recebNF} min={dataMinima} onChange={(e) => onAtualizarCampo(item.id, 'recebNF', e.target.value)} onKeyDown={(e) => mostrarDataNecessidade && e.preventDefault()} onClick={(e) => mostrarDataNecessidade && e.target.showPicker && e.target.showPicker()} placeholder="DD/MM/AAAA" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569' }} value={item.docCompras} onChange={(e) => onAtualizarCampo(item.id, 'docCompras', e.target.value)} placeholder="Doc Compras" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela texto-preto" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#1e293b' }} value={item.poNetPrice} onChange={(e) => onAtualizarCampo(item.id, 'poNetPrice', e.target.value)} placeholder="R$ 0,00" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569' }} value={item.centro} onChange={(e) => onAtualizarCampo(item.id, 'centro', e.target.value)} placeholder="Centro" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela texto-cinza" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#475569' }} value={item.deposito} onChange={(e) => onAtualizarCampo(item.id, 'deposito', e.target.value)} placeholder="Depósito" />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input className="input-editavel-tabela link-azul-fake" style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#2563eb', fontFamily: 'monospace' }} value={item.alocacao} onChange={(e) => onAtualizarCampo(item.id, 'alocacao', e.target.value)} placeholder="Alocação" />
                  </td>
                </tr>
              ))}
              
              {linhasFantasmas > 0 && Array.from({ length: linhasFantasmas }).map((_, index) => (
                <tr key={`fantasma-${index}`} style={{ height: `${alturaLinhaPx}px` }}>
                  <td colSpan={mostrarDataNecessidade ? 16 : 15} style={{ backgroundColor: 'transparent', borderBottom: '1px solid #f1f5f9' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="paginacao-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
        <div className="paginacao-info" style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> &middot; Exibindo {itens.length === 0 ? 0 : indexPrimeiroItem + 1} a <strong>{Math.min(indexUltimoItem, itens.length)}</strong> de <strong>{itens.length}</strong> itens
        </div>
        <div className="paginacao-botoes" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))} disabled={paginaAtual === 1 || itens.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: (paginaAtual === 1 || itens.length === 0) ? 'not-allowed' : 'pointer', opacity: (paginaAtual === 1 || itens.length === 0) ? 0.6 : 1 }}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <button onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas || itens.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: (paginaAtual === totalPaginas || itens.length === 0) ? 'not-allowed' : 'pointer', opacity: (paginaAtual === totalPaginas || itens.length === 0) ? 0.6 : 1 }}>
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}