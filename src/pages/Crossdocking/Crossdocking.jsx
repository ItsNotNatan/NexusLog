import React, { useState } from 'react';
import { Package, User, Upload, Send } from 'lucide-react';

export default function Crossdocking() {
  const [tipoSaida, setTipoSaida] = useState(null);

  return (
    <div className="limitador-largura">
      <div className="banner-aviso banner-ciano">
        <Package size={24} />
        <div>
          <strong>Crossdocking</strong>
          <p>Saída Total processa toda a NF. Saída Parcial permite informar múltiplos itens por Desenho SAP + quantidade.</p>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone ciano redondo"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME *</label>
            <input type="text" className="input-campo foco-ciano" placeholder="" />
          </div>
          <div className="input-grupo">
            <label>WBS *</label>
            <input type="text" className="input-campo foco-ciano" placeholder="WBS do projeto" />
          </div>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone ciano"><Package size={18} /></div>
            <h2>Dados da Operação</h2>
          </div>
        </div>
        <div className="form-grid coluna-unica">
          <div className="input-grupo">
            <label>NOTA FISCAL <span className="texto-vermelho">*</span></label>
            <div className="dropzone cinza">
              <Upload size={16} /> Clique para anexar a Nota Fiscal (obrigatório)
            </div>
          </div>
          <div className="input-grupo">
            <label>TIPO DE SAÍDA *</label>
            <div className="botoes-toggle-container">
              <button className={`btn-toggle ${tipoSaida === 'parcial' ? 'selecionado' : ''}`} onClick={() => setTipoSaida('parcial')}>Saída Parcial</button>
              <button className={`btn-toggle ${tipoSaida === 'total' ? 'selecionado' : ''}`} onClick={() => setTipoSaida('total')}>Saída Total</button>
            </div>
          </div>
          <div className="input-grupo">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo foco-ciano" placeholder="Informações adicionais..."></textarea>
          </div>
        </div>
      </div>

      <div className="form-acoes-final">
        <button className="btn-enviar ciano">
          <Send size={16} /> Enviar Crossdocking
        </button>
      </div>
    </div>
  );
}