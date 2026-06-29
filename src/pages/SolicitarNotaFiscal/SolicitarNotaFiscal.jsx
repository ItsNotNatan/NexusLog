import React from 'react';
import { User, FileText, Paperclip, Send } from 'lucide-react';

export default function SolicitarNotaFiscal() {
  return (
    <div className="nf-container">
      <div className="nf-grid-superior">
        <div className="form-cartao" style={{ marginBottom: 0 }}>
          <div className="form-header">
            <div className="form-header-esquerda">
              <div className="form-header-icone roxo-claro"><User size={18} /></div>
              <h2>Dados do Solicitante</h2>
            </div>
          </div>
          <div className="form-grid coluna-unica">
            <div className="input-grupo">
              <label>NOME *</label>
              <input type="text" className="input-campo foco-roxo" placeholder="Seu nome completo" />
            </div>
            <div className="input-grupo">
              <label>WBS / CENTRO DE CUSTO *</label>
              <input type="text" className="input-campo foco-roxo" placeholder="Ex: WBS-PRJ-2024-001" />
            </div>
            <div className="input-grupo">
              <label>VALOR ESTIMADO (R$)</label>
              <input type="number" className="input-campo foco-roxo" placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="form-cartao flex-coluna" style={{ marginBottom: 0 }}>
          <div className="form-header">
            <div className="form-header-esquerda">
              <div className="form-header-icone roxo-claro"><FileText size={18} /></div>
              <h2>Detalhes da Nota Fiscal</h2>
            </div>
          </div>
          <div className="form-grid coluna-unica flex-1">
            <div className="input-grupo flex-1">
              <label>DESCRIÇÃO / MOTIVO *</label>
              <textarea className="input-campo foco-roxo flex-1" placeholder="Descreva o motivo..." style={{ minHeight: '120px' }}></textarea>
            </div>
            <div className="input-grupo mt-4">
              <label>OBSERVAÇÕES</label>
              <input type="text" className="input-campo foco-roxo" placeholder="Info adicional..." />
            </div>
          </div>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header" style={{ marginBottom: '16px' }}>
          <div className="form-header-esquerda">
            <div className="form-header-icone cinza redondo"><Paperclip size={18} /></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '2px' }}>Anexos</h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>NFs, documentos ou arquivos de suporte</span>
            </div>
          </div>
        </div>
        <div className="dropzone branca">
          + Clique para adicionar arquivo
        </div>
      </div>

      <div className="form-acoes-final">
        <button className="btn-enviar roxo">
          <Send size={16} /> Enviar Solicitação de NF
        </button>
      </div>
    </div>
  );
}