import React from 'react';
import { User, MapPin, Calendar, Zap } from 'lucide-react';

export default function MaterialEstoque() {
  return (
    <>
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME DO SOLICITANTE *</label>
            <input type="text" className="input-campo" placeholder="Seu nome completo" />
          </div>
          <div className="input-grupo">
            <label>WBS / CENTRO DE CUSTO *</label>
            <input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" />
          </div>
          
          <div className="input-grupo">
            <label><MapPin size={14} /> FILIAL DE ORIGEM</label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" />
              <input type="text" className="input-campo" value="BR04 — Goiana, PE" readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>

          <div className="input-grupo row-span-2">
            <label><MapPin size={14} /> DESTINO *</label>
            <textarea className="input-campo" placeholder="Local de destino do material"></textarea>
          </div>

          <div className="input-grupo">
            <label><Calendar size={14} /> DATA DE NECESSIDADE *</label>
            <input type="date" className="input-campo" />
            <span className="texto-ajuda">Informe até quando o material é necessário</span>
          </div>

          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo" placeholder="Informações adicionais para a equipe de logística" rows="2"></textarea>
          </div>
        </div>

        <div className="caixa-urgente">
          <input type="checkbox" className="checkbox-custom" id="urgente-check" />
          <div className="urgente-info">
            <label htmlFor="urgente-check" className="urgente-titulo" style={{cursor: 'pointer'}}>
              <Zap size={16} color="#fbbf24" fill="#fbbf24" /> Entrega Urgente
            </label>
            <span className="urgente-desc">
              Marque apenas se a solicitação for crítica e necessitar de aprovação imediata do Administrador.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}