import React, { useState } from 'react';
import './ReintegracaoItens.css';
import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle, 
  User,
  Search,
  Send
} from 'lucide-react';

// DADOS MOCKADOS (Simulados) para a lista de BS de Origem
const bsOrigemDisponiveis = [
  { id: '10976', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', itens: 4, status: 'Em Separação' },
  { id: '10975', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', itens: 2, status: 'Em Separação' },
  { id: '10974', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', itens: 1, status: 'Em Separação' }
];

export default function ReintegracaoItens() {
  // Inicia diretamente na aba de Reintegração de Itens
  const [tipoAtivo, setTipoAtivo] = useState('reintegracao');

  // Menu de opções (adicionada a propriedade cor: 'laranja' à Reintegração)
  const tiposSolicitacao = [
    { id: 'material', titulo: 'Material de Estoque', desc: 'Retirada de itens do almoxarifado', icone: <Boxes size={20} /> },
    { id: 'transferencia', titulo: 'Transferência de WBS', desc: 'Mover material para outro projeto', icone: <ArrowLeftRight size={20} /> },
    { id: 'nf', titulo: 'Solicitar Nota Fiscal', desc: 'Emissão de nota fiscal', icone: <FileText size={20} /> },
    { id: 'entrada', titulo: 'Entrada de Material', desc: 'Solicitar entrada no estoque', icone: <PackagePlus size={20} /> },
    { id: 'crossdocking', titulo: 'Crossdocking', desc: 'Saída via nota fiscal', icone: <Truck size={20} /> },
    { id: 'reintegracao', titulo: 'Reintegração de Itens', desc: 'Devolver material ao estoque', icone: <RefreshCcw size={20} />, cor: 'laranja' },
    { id: 'cancelar', titulo: 'Cancelar BS', desc: 'Cancelar boletim emitido', icone: <XCircle size={20} /> }
  ];

  return (
    <div className="reintegracao-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="reintegracao-cabecalho">
        <h1>Fazer Solicitação</h1>
        <p>Escolha o tipo de solicitação que deseja realizar</p>
      </header>

      {/* 2. CARTÕES DE TIPOS */}
      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => {
          let classeCartao = 'tipo-cartao';
          if (tipoAtivo === tipo.id) {
            classeCartao += tipo.cor === 'laranja' ? ' ativo-laranja' : ' ativo';
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
      {/* ECRÃ: REINTEGRAÇÃO DE ITENS (Cores Laranja/Pêssego)               */}
      {/* ================================================================= */}
      {tipoAtivo === 'reintegracao' && (
        <div className="reintegracao-conteudo">
          
          {/* Cartão 1: Dados do Solicitante */}
          <div className="form-cartao">
            <div className="form-header">
              <div className="form-header-icone"><User size={18} /></div>
              <h2>Solicitante</h2>
            </div>
            {/* Limitamos a largura do input para imitar o design da imagem */}
            <div className="input-grupo" style={{ maxWidth: '400px' }}>
              <label>NOME *</label>
              <input type="text" className="input-campo" placeholder="Seu nome completo" />
            </div>
          </div>

          {/* Cartão 2: Selecionar BS de Origem */}
          <div className="form-cartao">
            <div className="form-header">
              <div className="form-header-icone"><RefreshCcw size={18} /></div>
              <h2>Selecionar BS de Origem</h2>
            </div>
            
            <div className="pesquisa-wrapper">
              <Search size={18} className="icone-pesquisa" />
              <input type="text" placeholder="Buscar por nº BS, ID de solicitação ou solicitante..." />
            </div>

            <div className="lista-bs-container">
              {bsOrigemDisponiveis.map((bs) => (
                <div key={bs.id} className="item-bs">
                  <div className="item-bs-info">
                    <span className="item-bs-titulo">BS #{bs.id}</span>
                    <span className="item-bs-detalhes">
                      {bs.solicitante} &middot; WBS: {bs.wbs} &middot; {bs.itens} itens
                    </span>
                  </div>
                  <div>
                    <span className="badge-separacao">{bs.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="form-acoes-final">
            <button className="btn-enviar-laranja">
              <Send size={16} /> Solicitar Reintegração
            </button>
          </div>

        </div>
      )}

    </div>
  );
}