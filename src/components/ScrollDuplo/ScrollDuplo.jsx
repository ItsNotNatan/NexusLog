// =================================================================
// ARQUIVO: src/components/ScrollDuplo/ScrollDuplo.jsx
// DESCRIÇÃO: Componente que adiciona uma barra de scroll em cima e em baixo sincronizadas.
// =================================================================

import React, { useRef, useEffect, useState } from 'react';

export default function ScrollDuplo({ children }) {
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  
  const [larguraReal, setLarguraReal] = useState('100%');

  useEffect(() => {
    const atualizarLargura = () => {
      if (bottomScrollRef.current) {
        setLarguraReal(`${bottomScrollRef.current.scrollWidth}px`);
      }
    };

    atualizarLargura();

    // O ResizeObserver monitoriza as mudanças de tamanho da tabela em tempo real
    const observer = new ResizeObserver(() => {
      atualizarLargura();
    });

    if (bottomScrollRef.current) {
      observer.observe(bottomScrollRef.current);
      if (bottomScrollRef.current.firstElementChild) {
        observer.observe(bottomScrollRef.current.firstElementChild);
      }
    }

    return () => observer.disconnect();
  }, [children]);

  const handleTopScroll = () => {
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  return (
    <div style={{ width: '100%' }}>
      
      {/* --- BARRA SUPERIOR (A "Falsa") --- */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        style={{ width: '100%', overflowX: 'auto', marginBottom: '8px' }}
      >
        <div style={{ width: larguraReal, height: '1px' }}></div>
      </div>

      {/* --- BARRA INFERIOR (Onde vai ficar a tua tabela real) --- */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        style={{ width: '100%', overflowX: 'auto' }}
      >
        {children}
      </div>

    </div>
  );
}
