// =================================================================
// ARQUIVO: src/pages/Cliente/GeneralStock/GeneralStock.jsx
// DESCRIÇÃO: Estrutura base para o módulo de General Stock
// =================================================================
import React from 'react';
import { Archive } from 'lucide-react';

export default function GeneralStock() {
  return (
    <div className="form-cartao" style={{ textAlign: 'center', padding: '40px' }}>
      <Archive size={48} color="#64748b" style={{ marginBottom: '16px', opacity: 0.5 }} />
      <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '8px' }}>General Stock</h2>
      <p style={{ color: '#64748b' }}>
        Este módulo está em construção. Em breve poderá realizar solicitações de Estoque Geral aqui.
      </p>
    </div>
  );
}
