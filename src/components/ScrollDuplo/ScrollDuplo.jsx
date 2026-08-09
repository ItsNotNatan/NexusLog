// =================================================================
// ARQUIVO: src/components/ScrollDuplo/ScrollDuplo.jsx
// DESCRIÇÃO: Componente que adiciona uma barra de scroll em cima e em baixo sincronizadas.
// =================================================================

import React, { useRef } from 'react';

export default function ScrollDuplo({ children, larguraConteudo = '2000px' }) {
  // 1. Criamos "referências" para podermos controlar os dois scrolls diretamente
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);

  // 2. Quando o utilizador mexe na barra de CIMA, copiamos a posição para a barra de BAIXO
  const handleTopScroll = () => {
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  // 3. Quando o utilizador mexe na barra de BAIXO, copiamos a posição para a barra de CIMA
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
        {/* Esta div é invisível (1px de altura) mas tem a largura exata da tabela real */}
        {/* Isto obriga o navegador a desenhar a barra de scroll horizontal aqui em cima */}
        <div style={{ width: larguraConteudo, height: '1px' }}></div>
      </div>

      {/* --- BARRA INFERIOR (Onde vai ficar a tua tabela real) --- */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        style={{ width: '100%', overflowX: 'auto' }}
      >
        {/* O 'children' é o conteúdo (a tabela) que tu colocares dentro deste componente */}
        {children}
      </div>

    </div>
  );
}