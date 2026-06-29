import React from 'react';
import { Package, User, Plus, Send } from 'lucide-react';

export default function EntradaMaterial() {
  return (
    <div className="entrada-container">
      <div className="banner-aviso banner-verde">
        <Package size={24} />
        <div>
          <strong>Entrada de Material</strong>
          <p>Preencha os dados dos itens a receber. A <strong>alocação física</strong> no armazém será definida pela equipe de Logística após a aprovação.</p>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone verde-claro"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME *</label>
            <input type="text" className="input-campo foco-verde" placeholder="Seu nome completo" />
          </div>
          <div className="input-grupo">
            <label>WBS *</label>
            <input type="text" className="input-campo foco-verde" placeholder="Ex: WBS-PRJ-2024-001" />
          </div>
          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo foco-verde" placeholder="Informações adicionais..."></textarea>
          </div>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone verde-quadrado"><Package size={18} /></div>
            <h2>Itens para Entrada</h2>
          </div>
          <button className="btn-adicionar-item">
            <Plus size={16} /> Adicionar Item
          </button>
        </div>
        <div className="itens-scroll-wrapper">
          <div className="itens-grid-container">
            <div className="itens-grid-header">
              <span>DESENHO SAP</span>
              <span>PART NUMBER *</span>
              <span>DESCRIÇÃO *</span>
              <span>QTD *</span>
              <span>UNID</span>
              <span>FORNECEDOR</span>
              <span>VALOR UNIT.</span>
            </div>
            <div className="itens-grid-row">
              <input type="text" className="input-campo foco-verde" />
              <input type="text" className="input-campo foco-verde" />
              <input type="text" className="input-campo foco-verde" />
              <input type="number" className="input-campo foco-verde" />
              <select className="input-campo foco-verde">
                <option>Unid</option>
                <option>Kg</option>
                <option>Metro</option>
              </select>
              <input type="text" className="input-campo foco-verde" />
              <input type="text" className="input-campo foco-verde" />
            </div>
          </div>
        </div>
      </div>

      <div className="form-cartao">
        <div className="input-grupo">
          <label>ANEXOS (OPCIONAL)</label>
          <button className="btn-anexo-simples" style={{ width: 'fit-content', marginTop: '8px' }}>
            <Plus size={16} /> Adicionar Arquivo
          </button>
        </div>
      </div>

      <div className="form-acoes-final">
        <button className="btn-enviar verde">
          <Send size={16} /> Solicitar Entrada de Material
        </button>
      </div>
    </div>
  );
}