import React, { useState } from 'react';
import './CancelarBS.css';
import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle, 
  Search,
  AlertTriangle
} from 'lucide-react';

// DADOS MOCKADOS (Simulados) para a lista de BS disponíveis para cancelar
const bsParaCancelar = [
  { id: '10976', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', itens: 4, status: 'Em Separação' },
  { id: '10975', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', itens: 2, status: 'Em Separação' },
  { id: '10974', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', itens: 1, status: 'Em Separação' },
  { id: '10972', solicitante: 'JEFERSON', wbs: 'WBS-PRJ-2024-001', itens: 3, status: 'Em Separação' }
];

export default function CancelarBS() {
  // O componente arranca na opção "Cancelar BS"
  const [tipoAtivo, setTipoAtivo] = useState('cancelar');

  // Menu de opções (adicionada a propriedade cor: 'vermelho' ao Cancelar)
  const tiposSolicitacao = [
    { id: 'material', titulo: 'Material de Estoque', desc: 'Retirada de itens do almoxarifado', icone: <Boxes size={20} /> },
    { id: 'transferencia', titulo: 'Transferência de WBS', desc: 'Mover material para outro projeto', icone: <ArrowLeftRight size={20} /> },
    { id: 'nf', titulo: 'Solicitar Nota Fiscal', desc: 'Emissão de nota fiscal', icone: <FileText size={20} /> },
    { id: 'entrada', titulo: 'Entrada de Material', desc: 'Solicitar entrada no estoque', icone: <PackagePlus size={20} /> },
    { id: 'crossdocking', titulo: 'Crossdocking', desc: 'Saída via nota fiscal', icone: <Truck size={20} /> },
    { id: 'reintegracao', titulo: 'Reintegração de Itens', desc: 'Devolver material ao estoque', icone: <RefreshCcw size={20} /> },
    { id: 'cancelar', titulo: 'Cancelar BS', desc: 'Cancelar boletim emitido', icone: <XCircle size={20} />, cor: 'vermelho' }
  ];

  return (
    <div className="cancelar-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="cancelar-cabecalho">
        <h1>Fazer Solicitação</h1>
        <p>Escolha o tipo de solicitação que deseja realizar</p>
      </header>

      {/* 2. CARTÕES DE TIPOS */}
      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => {
          let classeCartao = 'tipo-cartao';
          if (tipoAtivo === tipo.id) {
            classeCartao += tipo.cor === 'vermelho' ? ' ativo-vermelho' : ' ativo';
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
      {/* ECRÃ: CANCELAR BS (Tema Vermelho, largura contida)                */}
      {/* ================================================================= */}
      {tipoAtivo === 'cancelar' && (
        <div className="cancelar-conteudo">
          
          {/* Banner de Aviso Vermelho */}
          <div className="banner-aviso-vermelho">
            <AlertTriangle size={24} />
            <div>
              <strong>Cancelamento de BS</strong>
              <p>Selecione os itens e quantidades que retornarão ao estoque. Esta ação não pode ser desfeita.</p>
            </div>
          </div>

          {/* Cartão de Seleção */}
          <div className="form-cartao">
            <div className="form-header">
              <div className="form-header-icone"><XCircle size={18} /></div>
              <h2>Selecionar BS para Cancelar</h2>
            </div>
            
            {/* Barra de Pesquisa */}
            <div className="pesquisa-wrapper">
              <Search size={18} className="icone-pesquisa" />
              <input type="text" placeholder="Buscar por nº BS, ID ou solicitante..." />
            </div>

            {/* Lista Rolável de BS */}
            <div className="lista-bs-container">
              {bsParaCancelar.map((bs) => (
                <div key={bs.id} className="item-bs">
                  <div className="item-bs-info">
                    <span className="item-bs-titulo">BS #{bs.id}</span>
                    <span className="item-bs-detalhes">
                      {bs.solicitante} &middot; {bs.itens} itens &middot; WBS: {bs.wbs}
                    </span>
                  </div>
                  <div>
                    <span className="badge-separacao">{bs.status}</span>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
          
        </div>
      )}

    </div>
  );
}