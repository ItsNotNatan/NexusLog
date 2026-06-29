import React, { useState } from 'react';
import './TransferenciaWBS.css';
import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle, 
  Search,
  Plus
} from 'lucide-react';

// DADOS MOCKADOS (Simulados) para a lista de itens da transferência
const itensDisponiveis = [
  { id: 1, pn: '1534534', desc: 'SENSOR DE INDUÇÃO', wbs: 'BRBCBBB20', qtd: '0 Unid' },
  { id: 2, pn: 'PN-TUB-7890', desc: 'Tubo Aço Inox 316L 6" Sch40', wbs: 'WBS-PRJ-2024-001', qtd: '4 Metro' },
  { id: 3, pn: 'PN-FLG-1580', desc: 'Flange Cego 4" ANSI 150', wbs: 'WBS-PRJ-2024-001', qtd: '17 Unid' },
];

export default function TransferenciaWBS() {
  // A aba começa selecionada na Transferência de WBS
  const [tipoAtivo, setTipoAtivo] = useState('transferencia');

  // Menu de opções (Cartões Superiores)
  const tiposSolicitacao = [
    { id: 'material', titulo: 'Material de Estoque', desc: 'Retirada de itens do almoxarifado', icone: <Boxes size={20} /> },
    { id: 'transferencia', titulo: 'Transferência de WBS', desc: 'Mover material para outro projeto', icone: <ArrowLeftRight size={20} /> },
    { id: 'nf', titulo: 'Solicitar Nota Fiscal', desc: 'Emissão de nota fiscal', icone: <FileText size={20} /> },
    { id: 'entrada', titulo: 'Entrada de Material', desc: 'Solicitar entrada no estoque', icone: <PackagePlus size={20} /> },
    { id: 'crossdocking', titulo: 'Crossdocking', desc: 'Saída via nota fiscal', icone: <Truck size={20} /> },
    { id: 'reintegracao', titulo: 'Reintegração de Itens', desc: 'Devolver material ao estoque', icone: <RefreshCcw size={20} /> },
    { id: 'cancelar', titulo: 'Cancelar BS', desc: 'Cancelar boletim emitido', icone: <XCircle size={20} /> }
  ];

  return (
    <div className="transferencia-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="transferencia-cabecalho">
        <h1>Transferência de WBS</h1>
        <p>Escolha o tipo de solicitação que deseja realizar</p>
      </header>

      {/* 2. CARTÕES DE TIPOS (Scroll Horizontal) */}
      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => (
          <div 
            key={tipo.id} 
            className={`tipo-cartao ${tipoAtivo === tipo.id ? 'ativo' : ''}`}
            onClick={() => setTipoAtivo(tipo.id)}
          >
            <div className="tipo-icone">{tipo.icone}</div>
            <div className="tipo-titulo">{tipo.titulo}</div>
            <div className="tipo-desc">{tipo.desc}</div>
          </div>
        ))}
      </div>

      {/* ================================================================= */}
      {/* TELA DE TRANSFERÊNCIA DE WBS (Formulário e Seleção de Itens)      */}
      {/* ================================================================= */}
      {tipoAtivo === 'transferencia' && (
        <>
          {/* Formulário Superior */}
          <div className="form-cartao">
            <div className="form-header">
              <div className="form-header-icone">
                <ArrowLeftRight size={18} />
              </div>
              <h2>Dados da Transferência</h2>
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

          {/* Duas Colunas Inferiores */}
          <div className="transferencia-grid-inferior">
            
            {/* Coluna Esquerda (Pesquisa de Itens) */}
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

            {/* Coluna Direita (Estado Vazio) */}
            <div className="coluna-cartao">
              <div className="coluna-direita-header">
                <ArrowLeftRight size={20} className="icone-header-direita" />
                Itens para Transferência
              </div>
              
              <div className="estado-vazio-itens">
                Selecione os itens à esquerda para transferir de WBS
              </div>
            </div>
            
          </div>
        </>
      )}

    </div>
  );
}