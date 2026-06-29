import React, { useState } from 'react';
import './SolicitarNotaFiscal.css';
import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle, 
  User, 
  Paperclip,
  Send
} from 'lucide-react';

export default function SolicitarNotaFiscal() {
  // Mantemos o estado inicial na Nota Fiscal para exibir o ecrã roxo
  const [tipoAtivo, setTipoAtivo] = useState('nf');

  // Menu de opções (com a tag cor: 'roxo' para o botão da Nota Fiscal)
  const tiposSolicitacao = [
    { id: 'material', titulo: 'Material de Estoque', desc: 'Retirada de itens do almoxarifado', icone: <Boxes size={20} /> },
    { id: 'transferencia', titulo: 'Transferência de WBS', desc: 'Mover material para outro projeto', icone: <ArrowLeftRight size={20} /> },
    { id: 'nf', titulo: 'Solicitar Nota Fiscal', desc: 'Emissão de nota fiscal', icone: <FileText size={20} />, cor: 'roxo' },
    { id: 'entrada', titulo: 'Entrada de Material', desc: 'Solicitar entrada no estoque', icone: <PackagePlus size={20} /> },
    { id: 'crossdocking', titulo: 'Crossdocking', desc: 'Saída via nota fiscal', icone: <Truck size={20} /> },
    { id: 'reintegracao', titulo: 'Reintegração de Itens', desc: 'Devolver material ao estoque', icone: <RefreshCcw size={20} /> },
    { id: 'cancelar', titulo: 'Cancelar BS', desc: 'Cancelar boletim emitido', icone: <XCircle size={20} /> }
  ];

  return (
    <div className="solicitar-nf-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="solicitar-nf-cabecalho">
        <h1>Fazer Solicitação</h1>
        <p>Escolha o tipo de solicitação que deseja realizar</p>
      </header>

      {/* 2. CARTÕES DE TIPOS (Scroll Horizontal) */}
      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => {
          let classeCartao = 'tipo-cartao';
          if (tipoAtivo === tipo.id) {
            classeCartao += tipo.cor === 'roxo' ? ' ativo-roxo' : ' ativo';
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
      {/* ECRÃ PRINCIPAL: SOLICITAR NOTA FISCAL                             */}
      {/* ================================================================= */}
      {tipoAtivo === 'nf' && (
        <div className="nf-container">
          
          {/* Grid com os dois cartões superiores lado a lado */}
          <div className="nf-grid-superior">
            
            {/* Cartão Esquerdo: Dados do Solicitante */}
            <div className="form-cartao" style={{ marginBottom: 0 }}>
              <div className="form-header">
                <div className="form-header-icone roxo-claro"><User size={18} /></div>
                <h2>Dados do Solicitante</h2>
              </div>
              <div className="form-grid coluna-unica">
                <div className="input-grupo">
                  <label>NOME *</label>
                  <input type="text" className="input-campo" placeholder="Seu nome completo" />
                </div>
                <div className="input-grupo">
                  <label>WBS / CENTRO DE CUSTO *</label>
                  <input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" />
                </div>
                <div className="input-grupo">
                  <label>VALOR ESTIMADO (R$)</label>
                  <input type="number" className="input-campo" placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* Cartão Direito: Detalhes da Nota Fiscal */}
            <div className="form-cartao flex-coluna" style={{ marginBottom: 0 }}>
              <div className="form-header">
                <div className="form-header-icone roxo-claro"><FileText size={18} /></div>
                <h2>Detalhes da Nota Fiscal</h2>
              </div>
              
              <div className="form-grid coluna-unica flex-1">
                {/* Textarea que estica para preencher o espaço vertical */}
                <div className="input-grupo flex-1">
                  <label>DESCRIÇÃO / MOTIVO *</label>
                  <textarea 
                    className="input-campo flex-1" 
                    placeholder="Descreva o motivo..." 
                    style={{ minHeight: '120px' }}
                  ></textarea>
                </div>
                <div className="input-grupo mt-4">
                  <label>OBSERVAÇÕES</label>
                  <input type="text" className="input-campo" placeholder="Info adicional..." />
                </div>
              </div>
            </div>

          </div>

          {/* Cartão Inferior: Anexos */}
          <div className="form-cartao">
            <div className="form-header" style={{ marginBottom: '16px' }}>
              <div className="form-header-icone cinza"><Paperclip size={18} /></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '2px' }}>Anexos</h2>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>NFs, documentos ou arquivos de suporte</span>
              </div>
            </div>
            
            {/* Zona de Drop para ficheiros */}
            <div className="dropzone-anexos">
              + Clique para adicionar arquivo
            </div>
          </div>

          {/* Botão de Submissão */}
          <div className="form-acoes-final">
            <button className="btn-enviar-roxo">
              <Send size={16} /> Enviar Solicitação de NF
            </button>
          </div>

        </div>
      )}

    </div>
  );
}