// =================================================================
// ARQUIVO: src/components/PaginacaoTabela/PaginacaoTabela.jsx
// DESCRIÇÃO: Componente reutilizável para a paginação de tabelas
// =================================================================
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginacaoTabela({
  paginaAtual,
  totalPaginas,
  totalRegistrosFiltrados,
  indexPrimeiroItem,
  indexUltimoItem,
  dadosPaginadosLength,
  itensPorPagina,
  setItensPorPagina,
  setPaginaAtual,
  carregando
}) {
  return (
    <div className="paginacao-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
      
      {/* Informação e Seletor de Itens */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className="paginacao-info" style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> &middot; Exibindo {dadosPaginadosLength === 0 ? 0 : indexPrimeiroItem + 1} a <strong>{Math.min(indexUltimoItem, totalRegistrosFiltrados)}</strong> de <strong>{totalRegistrosFiltrados}</strong> resultados
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Itens por página:</span>
          <select 
            value={itensPorPagina} 
            onChange={(e) => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1); 
            }}
            disabled={carregando}
            style={{
              padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', 
              fontSize: '0.875rem', color: '#334155', backgroundColor: '#ffffff', 
              cursor: carregando ? 'not-allowed' : 'pointer', outline: 'none'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Botões de Paginação Elíptica */}
      <div className="paginacao-botoes" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        
        <button className="btn-paginacao" onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))} disabled={paginaAtual === 1 || carregando} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: (paginaAtual === 1 || carregando) ? 'not-allowed' : 'pointer', opacity: (paginaAtual === 1 || carregando) ? 0.6 : 1 }}>
          <ChevronLeft size={16} /> Anterior
        </button>
        
        {(() => {
          const maxPaginasVisiveis = 5;
          let paginas = [];

          if (totalPaginas <= maxPaginasVisiveis) {
            for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
          } else {
            if (paginaAtual <= 3) {
              paginas = [1, 2, 3, 4, '...', totalPaginas];
            } else if (paginaAtual >= totalPaginas - 2) {
              paginas = [1, '...', totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];
            } else {
              paginas = [1, '...', paginaAtual - 1, paginaAtual, paginaAtual + 1, '...', totalPaginas];
            }
          }

          return paginas.map((pagina, index) => {
            if (pagina === '...') {
              return <span key={`ellipsis-${index}`} style={{ color: '#94a3b8', padding: '0 4px', fontWeight: 'bold' }}>...</span>;
            }
            const ehAtiva = paginaAtual === pagina;
            return (
              <button 
                key={`page-${pagina}`} 
                onClick={() => setPaginaAtual(pagina)} 
                disabled={carregando} 
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: ehAtiva ? '#ea580c' : '#ffffff', 
                  color: ehAtiva ? '#ffffff' : '#334155', 
                  border: `1px solid ${ehAtiva ? '#ea580c' : '#e2e8f0'}`, 
                  borderRadius: '6px', 
                  fontSize: '0.875rem', 
                  fontWeight: ehAtiva ? '600' : '500', 
                  cursor: carregando ? 'not-allowed' : 'pointer', 
                  transition: 'all 0.15s ease' 
                }}
              >
                {pagina}
              </button>
            );
          });
        })()}

        <button className="btn-paginacao" onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas || carregando || totalRegistrosFiltrados === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: (paginaAtual === totalPaginas || carregando || totalRegistrosFiltrados === 0) ? 'not-allowed' : 'pointer', opacity: (paginaAtual === totalPaginas || carregando || totalRegistrosFiltrados === 0) ? 0.6 : 1 }}>
          Próxima <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
