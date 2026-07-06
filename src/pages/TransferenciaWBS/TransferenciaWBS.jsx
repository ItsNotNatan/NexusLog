import React from 'react';
import './TransferenciaWBS.css'; // <-- 1. IMPORTAÇÃO DO CSS ADICIONADA AQUI!
import { ArrowLeftRight, Search, Plus, Send } from 'lucide-react'; // Adicionei o ícone Send

const itensDisponiveis = [
  { id: 1, pn: '1534534', desc: 'SENSOR DE INDUÇÃO', wbs: 'BRBCBBB20', qtd: '0 Unid' },
  { id: 2, pn: 'PN-TUB-7890', desc: 'Tubo Aço Inox 316L 6" Sch40', wbs: 'WBS-PRJ-2024-001', qtd: '4 Metro' },
  { id: 3, pn: 'PN-FLG-1580', desc: 'Flange Cego 4" ANSI 150', wbs: 'WBS-PRJ-2024-001', qtd: '17 Unid' },
];

export default function TransferenciaWBS() {
  return (
    <>
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone"><ArrowLeftRight size={18} /></div>
            <h2>Dados da Transferência</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo">
            <label>SOLICITANTE *</label>
            <input type="text" className="input-campo" placeholder="Seu nome" />
          </div>
          <div className="input-grupo">
            <label>WBS DE DESTINO *</label>
            <input type="text" className="input-campo" placeholder="WBS do projeto destino" />
          </div>
          <div className="input-grupo span-2">
            <label>JUSTIFICATIVA</label>
            <textarea className="input-campo" placeholder="Motivo da transferência..." rows="2"></textarea>
          </div>
        </div>
        <div className="anexos-grupo">
          <span>ANEXOS (OPCIONAL)</span>
          <button className="btn-anexo">
            <Plus size={16} /> Adicionar Arquivo
          </button>
        </div>
      </div>

      <div className="transferencia-grid-inferior">
        <div className="coluna-cartao">
          <div className="coluna-esquerda-header">
            <h3>Selecionar Itens para Transferência</h3>
            <div className="pesquisa-itens-wrapper">
              <Search size={16} className="icone-busca-itens" />
              <input type="text" placeholder="Buscar por SAP, PN, Descrição..." />
            </div>
          </div>
          <div className="lista-itens-scroll">
            {itensDisponiveis.map(item => (
              <div key={item.id} className="item-lista">
                <div className="item-lista-pn">{item.pn}</div>
                <div className="item-lista-desc">{item.desc}</div>
                <div>
                  <span className="item-lista-wbs">{item.wbs}</span>
                  <span className="item-lista-qtd">{item.qtd}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="coluna-cartao">
          <div className="coluna-direita-header">
            <ArrowLeftRight size={20} className="icone-header-direita" /> Itens para Transferência
          </div>
          <div className="estado-vazio-itens">
            Selecione os itens à esquerda para transferir de WBS
          </div>
        </div>
      </div>

      {/* 2. BOTÃO DE ENVIO ADICIONADO AQUI! */}
      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul">
          <Send size={16} /> Confirmar Transferência
        </button>
      </div>
    </>
  );
}