import React, { useState } from 'react';
import { Target } from 'lucide-react';

export default function TargetEficiencia() {
  const [prazo, setPrazo] = useState(3);

  return (
    <div className="config-cartao">
      <div className="cartao-topo">
        <div className="icone-destaque">
          <Target size={24} className="icone-azul" />
        </div>
        <div className="textos-topo">
          <h2>Target de Eficiência</h2>
          <p>Usado no KPI "Dentro do Target" do Dashboard</p>
        </div>
      </div>
      <hr className="divisor" />
      <div className="form-grupo">
        <label htmlFor="prazo-input">PRAZO TARGET (EM DIAS)</label>
        <input 
          id="prazo-input" type="number" className="input-padrao" 
          value={prazo} onChange={(e) => setPrazo(e.target.value)}
        />
      </div>
    </div>
  );
}