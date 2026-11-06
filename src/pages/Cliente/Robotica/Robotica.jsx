// =================================================================
// ARQUIVO: src/pages/Cliente/Robotica/Robotica.jsx
// DESCRIÇÃO: Estrutura base para o módulo de Robótica
// =================================================================
import React from 'react';
import { Cpu } from 'lucide-react';

export default function Robotica() {
  return (
    <div className="form-cartao" style={{ textAlign: 'center', padding: '40px' }}>
      <Cpu size={48} color="#ec4899" style={{ marginBottom: '16px', opacity: 0.5 }} />
      <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '8px' }}>Módulo de Robótica</h2>
      <p style={{ color: '#64748b' }}>
        Este módulo está em construção. Em breve poderá realizar solicitações de Robótica aqui.
      </p>
    </div>
  );
}
