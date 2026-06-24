import React, { useState } from 'react';
import './FormatacaoSAP.css';
import { FileSpreadsheet, Search } from 'lucide-react';

// 1. DADOS SIMULADOS (MOCK DATA)
const dadosLista = [
  {
    id: '10976',
    solicitante: 'TESTE',
    itens: 4,
    data: '23/06/26',
    destino: 'STELLANTIS GOIANA'
  },
  {
    id: '10975',
    solicitante: 'RASDAS',
    itens: 2,
    data: '11/06/26',
    destino: 'DSADSAD'
  },
  {
    id: '10974',
    solicitante: 'DOUGLAS',
    itens: 1,
    data: '11/06/26',
    destino: 'COMAU BETIM'
  },
  {
    id: '10973',
    solicitante: 'MARCIO',
    itens: 1,
    data: '10/06/26',
    destino: 'TESTE'
  },
  {
    id: '10972',
    solicitante: 'JEFERSON GARANDY',
    itens: 3,
    data: '10/06/26',
    destino: '' // Este item simula um sem destino visível
  }
];

// 2. COMPONENTE PRINCIPAL
export default function FormatacaoSAP() {
  // Estado para controlar qual aba está selecionada ('bs' ou 'ps')
  // Por padrão, começa com 'bs' (Boletins de Saída)
  const [abaAtiva, setAbaAtiva] = useState('bs');

  return (
    <div className="formatacao-wrapper">
      
      {/* --- CABEÇALHO --- */}
      <header className="formatacao-cabecalho">
        <FileSpreadsheet className="icone-titulo" size={32} />
        <div>
          <h1>Formatação para SAP</h1>
          <p>Selecione um BS ou PS, preencha a Categoria e copie as linhas formatadas para colar no SAP.</p>
        </div>
      </header>

      {/* --- CARTÃO PRINCIPAL --- */}
      <div className="formatacao-cartao">
        
        {/* Alternador de Abas (Toggle) */}
        <div className="toggle-container">
          <button 
            className={`toggle-btn ${abaAtiva === 'bs' ? 'ativo' : ''}`}
            onClick={() => setAbaAtiva('bs')}
          >
            Boletins de Saída (BS)
          </button>
          <button 
            className={`toggle-btn ${abaAtiva === 'ps' ? 'ativo' : ''}`}
            onClick={() => setAbaAtiva('ps')}
          >
            Solicitações (PS)
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="pesquisa-container">
          <div className="pesquisa-input-wrapper">
            <Search className="pesquisa-icone" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nº BS, WBS..." 
              className="pesquisa-input"
            />
          </div>
        </div>

        {/* --- LISTA COM SCROLL --- */}
        <div className="lista-scroll-container">
          {/* Mapeamento dos dados para gerar as linhas */}
          {dadosLista.map((item, index) => (
            <div key={item.id} className="lista-item">
              
              {/* Título do Item */}
              <div className="item-titulo">
                <strong>BS</strong> #{item.id}
              </div>
              
              {/* Informações Secundárias (Metadados) */}
              <div className="item-meta">
                {item.solicitante} &middot; {item.itens} {item.itens === 1 ? 'item' : 'itens'} &middot; {item.data}
              </div>
              
              {/* Link de Destino (Renderiza apenas se existir) */}
              {item.destino && (
                <div className="item-destino">
                  &rarr; {item.destino}
                </div>
              )}
              
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}