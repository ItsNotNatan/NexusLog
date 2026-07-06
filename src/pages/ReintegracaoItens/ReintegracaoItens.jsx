import React from 'react';
import { User, RefreshCcw, Search, Send } from 'lucide-react';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

const listaDeBs = [
  { id: '10976', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', itens: 4, status: 'Em Separação' },
  { id: '10975', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', itens: 2, status: 'Em Separação' },
  { id: '10974', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', itens: 1, status: 'Em Separação' },
  { id: '10972', solicitante: 'JEFERSON', wbs: 'WBS-PRJ-2024-001', itens: 3, status: 'Em Separação' }
];

export default function ReintegracaoItens() {

  // Função provisória para o clique do botão (pronta para plugar no Node.js depois)
  const handleEnviar = () => {
    alert('Enviando Solicitação de Reintegração...');
  };

  return (
    <div className="limitador-largura">
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone laranja"><User size={18} /></div>
            <h2>Solicitante</h2>
          </div>
        </div>
        <div className="input-grupo" style={{ maxWidth: '400px' }}>
          <label>NOME *</label>
          <input type="text" className="input-campo foco-laranja" placeholder="Seu nome completo" />
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone laranja"><RefreshCcw size={18} /></div>
            <h2>Selecionar BS de Origem</h2>
          </div>
        </div>
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input type="text" className="input-campo foco-laranja" placeholder="Buscar por nº BS, ID de solicitação ou solicitante..." style={{ paddingLeft: '40px' }} />
        </div>
        <div className="lista-bs-container">
          {listaDeBs.map((bs) => (
            <div key={bs.id} className="item-bs">
              <div className="item-bs-info">
                <span className="item-bs-titulo">BS #{bs.id}</span>
                <span className="item-bs-detalhes">{bs.solicitante} &middot; WBS: {bs.wbs} &middot; {bs.itens} itens</span>
              </div>
              <span className="badge-separacao">{bs.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- BOTÃO GLOBAL AQUI --- */}
      <BotaoAcaoGlobal 
        texto="Solicitar Reintegração" 
        icone={<Send size={16} />} 
        cor="laranja" 
        onClick={handleEnviar} 
      />
      
    </div>
  );
}