import React from 'react';
import { AlertTriangle, XCircle, Search } from 'lucide-react';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

const listaDeBs = [
  { id: '10976', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', itens: 4, status: 'Em Separação' },
  { id: '10975', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', itens: 2, status: 'Em Separação' },
  { id: '10974', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', itens: 1, status: 'Em Separação' },
  { id: '10972', solicitante: 'JEFERSON', wbs: 'WBS-PRJ-2024-001', itens: 3, status: 'Em Separação' }
];

export default function CancelarBS() {

  // Função para testar o envio
  const handleEnviar = () => {
    alert('Enviando solicitação de Cancelamento...');
  };

  return (
    <div className="limitador-largura">
      
      {/* AVISO SUPERIOR */}
      <div className="banner-aviso banner-vermelho">
        <AlertTriangle size={24} />
        <div>
          <strong>Cancelamento de BS</strong>
          <p>Selecione os itens e quantidades que retornarão ao estoque. Esta ação não pode ser desfeita.</p>
        </div>
      </div>

      {/* CARTÃO DE PESQUISA */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone vermelho"><XCircle size={18} /></div>
            <h2>Selecionar BS para Cancelar</h2>
          </div>
        </div>
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input type="text" className="input-campo foco-vermelho" placeholder="Buscar por nº BS, ID ou solicitante..." style={{ paddingLeft: '40px' }} />
        </div>
        
        {/* LISTA */}
        <div className="lista-bs-container">
          {listaDeBs.map((bs) => (
            <div key={bs.id} className="item-bs">
              <div className="item-bs-info">
                <span className="item-bs-titulo">BS #{bs.id}</span>
                <span className="item-bs-detalhes">{bs.solicitante} &middot; {bs.itens} itens &middot; WBS: {bs.wbs}</span>
              </div>
              <span className="badge-separacao">{bs.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- BOTÃO GLOBAL AQUI --- */}
      <BotaoAcaoGlobal 
        texto="Confirmar Cancelamento" 
        icone={<AlertTriangle size={16} />} 
        cor="vermelho" 
        onClick={handleEnviar} 
      />

    </div>
  );
}