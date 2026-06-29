import React, { useState } from 'react';
import './EntradaMaterial.css';
import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle, 
  User, 
  Plus,
  Send,
  Package
} from 'lucide-react';

export default function EntradaMaterial() {
  // Começamos diretamente na opção "Entrada de Material"
  const [tipoAtivo, setTipoAtivo] = useState('entrada');

  // Adicionámos a propriedade "cor: 'verde'" para a Entrada
  const tiposSolicitacao = [
    { id: 'material', titulo: 'Material de Estoque', desc: 'Retirada de itens do almoxarifado', icone: <Boxes size={20} /> },
    { id: 'transferencia', titulo: 'Transferência de WBS', desc: 'Mover material para outro projeto', icone: <ArrowLeftRight size={20} /> },
    { id: 'nf', titulo: 'Solicitar Nota Fiscal', desc: 'Emissão de nota fiscal', icone: <FileText size={20} />, cor: 'roxo' },
    { id: 'entrada', titulo: 'Entrada de Material', desc: 'Solicitar entrada no estoque', icone: <PackagePlus size={20} />, cor: 'verde' },
    { id: 'crossdocking', titulo: 'Crossdocking', desc: 'Saída via nota fiscal', icone: <Truck size={20} /> },
    { id: 'reintegracao', titulo: 'Reintegração de Itens', desc: 'Devolver material ao estoque', icone: <RefreshCcw size={20} /> },
    { id: 'cancelar', titulo: 'Cancelar BS', desc: 'Cancelar boletim emitido', icone: <XCircle size={20} /> }
  ];

  return (
    <div className="entrada-mat-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="entrada-mat-cabecalho">
        <h1>Fazer Solicitação</h1>
        <p>Escolha o tipo de solicitação que deseja realizar</p>
      </header>

      {/* 2. CARTÕES DE TIPOS (Scroll Horizontal) */}
      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => {
          // Lógica para decidir a cor ativa
          let classeCartao = 'tipo-cartao';
          if (tipoAtivo === tipo.id) {
            if (tipo.cor === 'roxo') classeCartao += ' ativo-roxo';
            else if (tipo.cor === 'verde') classeCartao += ' ativo-verde';
            else classeCartao += ' ativo';
          }

          return (
            <div 
              key={tipo.id} 
              className={classeCartao}
              onClick={() => setTipoAtivo(tipo.id)}
            >
              <div className="tipo-icone">{tipo.icone}</div>
              <div className="tipo-titulo">{tipo.titulo}</div>
              <div className="tipo-desc">{tipo.desc}</div>
            </div>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* ECRÃ: ENTRADA DE MATERIAL (Tema Verde)                            */}
      {/* ================================================================= */}
      {tipoAtivo === 'entrada' && (
        <div className="entrada-container">
          
          {/* Banner de Aviso */}
          <div className="banner-aviso-verde">
            <Package size={24} />
            <div>
              <strong>Entrada de Material</strong>
              <p>Preencha os dados dos itens a receber. A <strong>alocação física</strong> no armazém será definida pela equipe de Logística após a aprovação.</p>
            </div>
          </div>

          {/* Cartão 1: Dados do Solicitante */}
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
                <input type="text" className="input-campo" placeholder="Seu nome completo" />
              </div>
              <div className="input-grupo">
                <label>WBS *</label>
                <input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" />
              </div>
              <div className="input-grupo span-2">
                <label>OBSERVAÇÕES</label>
                <textarea className="input-campo" placeholder="Informações adicionais..."></textarea>
              </div>
            </div>
          </div>

          {/* Cartão 2: Itens para Entrada */}
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

            {/* Grelha flexível dos itens (Tabela falsa) */}
            <div className="itens-scroll-wrapper">
              <div className="itens-grid-container">
                {/* Cabeçalho das Colunas */}
                <div className="itens-grid-header">
                  <span>DESENHO SAP</span>
                  <span>PART NUMBER *</span>
                  <span>DESCRIÇÃO *</span>
                  <span>QTD *</span>
                  <span>UNID</span>
                  <span>FORNECEDOR</span>
                  <span>VALOR UNIT.</span>
                </div>

                {/* Linha de Inputs */}
                <div className="itens-grid-row">
                  <input type="text" className="input-campo" placeholder="" />
                  <input type="text" className="input-campo" placeholder="" />
                  <input type="text" className="input-campo" placeholder="" />
                  <input type="number" className="input-campo" placeholder="" />
                  <select className="input-campo">
                    <option>Unid</option>
                    <option>Kg</option>
                    <option>Metro</option>
                  </select>
                  <input type="text" className="input-campo" placeholder="" />
                  <input type="text" className="input-campo" placeholder="" />
                </div>
              </div>
            </div>
          </div>

          {/* Cartão 3: Anexos */}
          <div className="form-cartao">
            <div className="input-grupo">
              <label>ANEXOS (OPCIONAL)</label>
              <button className="btn-anexo-simples" style={{ width: 'fit-content', marginTop: '8px' }}>
                <Plus size={16} /> Adicionar Arquivo
              </button>
            </div>
          </div>

          {/* Botão de Submissão Final */}
          <div className="form-acoes-final">
            <button className="btn-enviar-verde">
              <Send size={16} /> Solicitar Entrada de Material
            </button>
          </div>

        </div>
      )}

    </div>
  );
}