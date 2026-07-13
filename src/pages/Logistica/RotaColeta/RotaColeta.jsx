import React, { useState } from 'react';
import './RotaColeta.css';
import { 
  Waypoints, 
  Box, 
  Search, 
  Circle, 
  CheckCircle2, 
  ArrowRight,
  ListTree
} from 'lucide-react';

// DADOS MOCKADOS BASEADOS NA IMAGEM
const bsMocks = [
  { id: '10991', solicitante: 'DOUGLAS', wbs: 'WBS BRBRRCY21-SPST003-BET-00', itens: 1, destino: 'BR06 - BETIM' },
  { id: '10990', solicitante: 'JEAN CESÁRIO', wbs: 'WBS BRBRRCY21-SPST003-BET-00', itens: 2, destino: 'TESTE' },
  { id: '10989', solicitante: 'DASDASD', wbs: 'WBS BRBRRCY21-SPST003-BET-00', itens: 1, destino: 'DASDASD' },
  { id: '10988', solicitante: 'MARCIO MAGELA', wbs: 'WBS BRBRRCY21-SPST003-BET-00', itens: 1, destino: 'TESTE' },
  { id: '10987', solicitante: 'JEFERSON', wbs: 'WBS BRBRRCY21-SPST003-BET-00', itens: 4, destino: 'BR02 - SANTO ANDRÉ' },
];

export default function RotaColeta() {
  const [pesquisa, setPesquisa] = useState('');
  const [selecionados, setSelecionados] = useState([]);

  // Filtragem da lista pela pesquisa
  const listaFiltrada = bsMocks.filter(bs => 
    bs.id.includes(pesquisa) || 
    bs.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    bs.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

  // Lógica de Selecionar/Deselecionar um item
  const toggleSelecao = (id) => {
    if (selecionados.includes(id)) {
      setSelecionados(selecionados.filter(item => item !== id));
    } else {
      setSelecionados([...selecionados, id]);
    }
  };

  // Lógica de Selecionar Todos os itens filtrados
  const toggleSelecionarTodos = () => {
    if (selecionados.length === listaFiltrada.length && listaFiltrada.length > 0) {
      setSelecionados([]); // Desmarca todos
    } else {
      setSelecionados(listaFiltrada.map(bs => bs.id)); // Marca todos
    }
  };

  const isTodosSelecionados = selecionados.length === listaFiltrada.length && listaFiltrada.length > 0;
  const existemSelecionados = selecionados.length > 0;

  return (
    <div className="rota-coleta-wrapper">
      
      <header className="rota-cabecalho">
        <Waypoints className="icone-titulo" size={36} strokeWidth={2.5} />
        <div>
          <h1>Rota de Coleta (Picking)</h1>
          <p>Selecione múltiplos BS para consolidar os materiais e gerar uma rota de separação ordenada pela posição no estoque.</p>
        </div>
      </header>

      <div className="rota-grid">
        
        {/* --- COLUNA ESQUERDA: LISTA DE BS --- */}
        <div className="painel-selecao">
          
          <div className="banner-info-azul">
            <Box size={16} /> Exibindo apenas BS ativos (Em Separação)
          </div>

          <div className="pesquisa-bs-wrapper">
            <Search className="pesquisa-icone" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nº BS, WBS, solicitante..." 
              className="pesquisa-input"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </div>

          <div className="selecionar-todos-bar">
            <div className="checkbox-personalizado" onClick={toggleSelecionarTodos}>
              {isTodosSelecionados ? (
                <CheckCircle2 size={20} color="#2563eb" fill="#eff6ff" />
              ) : (
                <Circle size={20} color="#94a3b8" />
              )}
              <span>Selecionar todos</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
              {selecionados.length} selecionado(s)
            </span>
          </div>

          <div className="lista-bs-scroll">
            {listaFiltrada.map((bs) => {
              const isChecked = selecionados.includes(bs.id);
              return (
                <div key={bs.id} className="item-bs-coleta" onClick={() => toggleSelecao(bs.id)}>
                  <div style={{ marginTop: '2px' }}>
                    {isChecked ? (
                      <CheckCircle2 size={20} color="#2563eb" fill="#eff6ff" />
                    ) : (
                      <Circle size={20} color="#cbd5e1" />
                    )}
                  </div>
                  <div className="item-bs-info">
                    <div className="item-bs-titulo">
                      <strong>BS</strong> #{bs.id}
                    </div>
                    <div className="item-bs-detalhes">
                      {bs.solicitante} &middot; {bs.wbs} &middot; {bs.itens} {bs.itens === 1 ? 'item' : 'itens'}
                    </div>
                    <div className="item-bs-destino">
                      <ArrowRight size={12} /> {bs.destino}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="painel-selecao-footer">
            <button 
              className={`btn-gerar-rota ${existemSelecionados ? 'ativo' : ''}`}
              disabled={!existemSelecionados}
            >
              <ListTree size={18} /> Gerar Rota de Coleta
            </button>
          </div>
          
        </div>

        {/* --- COLUNA DIREITA: ESTADO VAZIO (PREVIEW) --- */}
        <div className="painel-preview">
          <Waypoints size={64} className="icone-preview-rota" strokeWidth={1.5} />
          <h3>Selecione um ou mais BS e clique em "Gerar Rota de Coleta"</h3>
          <p>A rota será ordenada pela posição física no estoque</p>
        </div>

      </div>
    </div>
  );
}