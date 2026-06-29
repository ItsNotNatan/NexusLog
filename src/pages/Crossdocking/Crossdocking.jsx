import React, { useState } from 'react';
import './Crossdocking.css';
import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle, 
  User, 
  Package,
  Upload,
  Send
} from 'lucide-react';

export default function Crossdocking() {
  // O componente arranca na opção "Crossdocking"
  const [tipoAtivo, setTipoAtivo] = useState('crossdocking');
  // Estado para controlar o botão de Tipo de Saída
  const [tipoSaida, setTipoSaida] = useState(null); // Pode ser 'parcial' ou 'total'

  // Menu de opções (adicionada a propriedade cor: 'ciano' ao Crossdocking)
  const tiposSolicitacao = [
    { id: 'material', titulo: 'Material de Estoque', desc: 'Retirada de itens do almoxarifado', icone: <Boxes size={20} /> },
    { id: 'transferencia', titulo: 'Transferência de WBS', desc: 'Mover material para outro projeto', icone: <ArrowLeftRight size={20} /> },
    { id: 'nf', titulo: 'Solicitar Nota Fiscal', desc: 'Emissão de nota fiscal', icone: <FileText size={20} /> },
    { id: 'entrada', titulo: 'Entrada de Material', desc: 'Solicitar entrada no estoque', icone: <PackagePlus size={20} /> },
    { id: 'crossdocking', titulo: 'Crossdocking', desc: 'Saída via nota fiscal', icone: <Truck size={20} />, cor: 'ciano' },
    { id: 'reintegracao', titulo: 'Reintegração de Itens', desc: 'Devolver material ao estoque', icone: <RefreshCcw size={20} /> },
    { id: 'cancelar', titulo: 'Cancelar BS', desc: 'Cancelar boletim emitido', icone: <XCircle size={20} /> }
  ];

  return (
    <div className="crossdocking-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="crossdocking-cabecalho">
        <h1>Fazer Solicitação</h1>
        <p>Escolha o tipo de solicitação que deseja realizar</p>
      </header>

      {/* 2. CARTÕES DE TIPOS */}
      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => {
          let classeCartao = 'tipo-cartao';
          if (tipoAtivo === tipo.id) {
            classeCartao += tipo.cor === 'ciano' ? ' ativo-ciano' : ' ativo';
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
      {/* ECRÃ: CROSSDOCKING (Largura restrita e Cores Ciano)               */}
      {/* ================================================================= */}
      {tipoAtivo === 'crossdocking' && (
        <div className="crossdocking-conteudo">
          
          {/* Banner Ciano */}
          <div className="banner-aviso-ciano">
            <Package size={24} />
            <div>
              <strong>Crossdocking</strong>
              <p>Saída Total processa toda a NF. Saída Parcial permite informar múltiplos itens por Desenho SAP + quantidade.</p>
            </div>
          </div>

          {/* Cartão 1: Dados do Solicitante */}
          <div className="form-cartao">
            <div className="form-header">
              <div className="form-header-icone redondo"><User size={18} /></div>
              <h2>Dados do Solicitante</h2>
            </div>
            <div className="form-grid">
              <div className="input-grupo">
                <label>NOME *</label>
                <input type="text" className="input-campo" placeholder="" />
              </div>
              <div className="input-grupo">
                <label>WBS *</label>
                <input type="text" className="input-campo" placeholder="WBS do projeto" />
              </div>
            </div>
          </div>

          {/* Cartão 2: Dados da Operação */}
          <div className="form-cartao">
            <div className="form-header">
              <div className="form-header-icone"><Package size={18} /></div>
              <h2>Dados da Operação</h2>
            </div>
            
            <div className="form-grid coluna-unica">
              
              {/* Input: Nota Fiscal (Dropzone) */}
              <div className="input-grupo">
                <label>NOTA FISCAL <span className="texto-vermelho">*</span></label>
                <div className="dropzone-nf">
                  <Upload size={16} />
                  Clique para anexar a Nota Fiscal (obrigatório)
                </div>
              </div>

              {/* Input: Tipo de Saída (Botões Toggle) */}
              <div className="input-grupo">
                <label>TIPO DE SAÍDA *</label>
                <div className="botoes-toggle-container">
                  <button 
                    className={`btn-toggle ${tipoSaida === 'parcial' ? 'selecionado' : ''}`}
                    onClick={() => setTipoSaida('parcial')}
                  >
                    Saída Parcial
                  </button>
                  <button 
                    className={`btn-toggle ${tipoSaida === 'total' ? 'selecionado' : ''}`}
                    onClick={() => setTipoSaida('total')}
                  >
                    Saída Total
                  </button>
                </div>
              </div>

              {/* Input: Observações */}
              <div className="input-grupo">
                <label>OBSERVAÇÕES</label>
                <textarea className="input-campo" placeholder="Informações adicionais..."></textarea>
              </div>

            </div>
          </div>

          {/* Botão de Envio (Alinhado à direita do contentor restrito) */}
          <div className="form-acoes-final">
            <button className="btn-enviar-ciano">
              <Send size={16} /> Enviar Crossdocking
            </button>
          </div>

        </div>
      )}

    </div>
  );
}