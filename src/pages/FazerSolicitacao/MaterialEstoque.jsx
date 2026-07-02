import React from 'react';
import { User, MapPin, Calendar, Zap, Search, Package, Send } from 'lucide-react';

// DADOS SIMULADOS BASEADOS NA IMAGEM
const estoqueDisponivel = [
  { pn: 'PN-PAR-4450', desc: 'Parafuso Estojo 3/4" x 4" B7', saldo: '199 Unid', alocacao: '200-E-005' },
  { pn: 'PN-TUB-7890', desc: 'Tubo Aço Inox 316L 6" Sch40', saldo: '4 Metro', alocacao: '400-A-003' },
  { pn: 'PN-FLG-1580', desc: 'Flange Cego 4" ANSI 150', saldo: '17 Unid', alocacao: '300-C-012' },
  { pn: 'PN-ELB-9012', desc: 'Cotovelo 90º 3" Aço Carbono', saldo: '1 Unid', alocacao: '300-A-009' },
  { pn: 'PN-INS-3345', desc: 'Isolamento Térmico Lã de Rocha 2"', saldo: '120 Metro', alocacao: '500-A-001' },
  { pn: 'PN-JTA-2210', desc: 'Junta Spiral Wound 4" CS', saldo: '78 Unid', alocacao: '200-D-018' },
  { pn: 'PN-MAN-1125', desc: 'Manômetro 0-10 kgf/cm² Inox', saldo: '12 Unid', alocacao: '200-F-020' },
  { pn: 'PN-VLV-3420', desc: 'Válvula Esfera 2" ANSI 300', saldo: '3 Unid', alocacao: '300-B-006' },
  { pn: 'PN-CHP-7780', desc: 'Chapa Aço Inox 304 #12 4x8', saldo: '5 Unid', alocacao: '600-A-002' },
];

export default function MaterialEstoque() {
  return (
    <>
      {/* 1. FORMULÁRIO DO SOLICITANTE (O que já tínhamos) */}
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

      {/* ======================================================= */}
      {/* 2. NOVA SECÇÃO: SELEÇÃO DE ITENS                          */}
      {/* ======================================================= */}
      <div className="selecao-itens-grid">
        
        {/* COLUNA ESQUERDA: Estoque Disponível */}
        <div className="painel-lista">
          <div className="painel-lista-header">
            <h3>Estoque Disponível</h3>
            <span className="badge-contagem">{estoqueDisponivel.length} itens</span>
          </div>
          <div className="pesquisa-estoque">
            <Search size={18} className="icone-pesquisa-estoque" />
            <input type="text" placeholder="Buscar por SAP, PN, Descrição..." />
          </div>
          <div className="lista-rolavel">
            {estoqueDisponivel.map((item, index) => (
              <div key={index} className="item-estoque-card">
                <strong className="item-pn">{item.pn}</strong>
                <p className="item-desc">{item.desc}</p>
                <div className="item-rodape">
                  <span className="item-saldo">Saldo: <strong>{item.saldo}</strong></span>
                  <span className="item-alocacao">{item.alocacao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: Itens Selecionados */}
        <div className="painel-lista">
          <div className="painel-lista-header">
            <div className="titulo-com-icone">
              <Package size={18} /> Itens Selecionados
            </div>
            <span className="badge-contagem bg-branco">0/25</span>
          </div>
          <div className="estado-vazio-selecao">
            <Package size={48} strokeWidth={1} />
            <p>Clique nos itens à esquerda para adicioná-los</p>
          </div>
        </div>

      </div>

      {/* BOTÃO FINAL DE ENVIO */}
      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul">
          <Send size={16} /> Enviar Solicitação
        </button>
      </div>
    </>
  );
}