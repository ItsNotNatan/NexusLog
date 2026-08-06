import React, { useState, useEffect, useContext } from 'react';
import './RotaColeta.css';
import { 
  Waypoints, Box, Search, Circle, CheckCircle2, ArrowRight, ListTree, 
  MapPin, Layers, CheckSquare, Printer, FileText, Loader2 
} from 'lucide-react';

import { AuthContext } from '../../../contexts/AuthContext';

// 1. IMPORTAÇÃO DA FUNÇÃO CENTRALIZADA DE API
// O apiFetch inclui o token JWT e chaveia a URL entre Localhost e Vercel automaticamente
import { apiFetch } from '../../../services/api';

export default function RotaColeta() {
  const { estoqueAtual } = useContext(AuthContext);

  // ESTADOS DO COMPONENTE
  const [listaBs, setListaBs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [selecionados, setSelecionados] = useState([]);
  
  // Controla se a visualização da rota já foi gerada
  const [rotaGerada, setRotaGerada] = useState(false);

  // ==========================================
  // 🔄 CARREGAMENTO DOS BS ATIVOS DA API
  // ==========================================
  useEffect(() => {
    const carregarBsAtivos = async () => {
      try {
        setCarregando(true);
        setSelecionados([]);
        setRotaGerada(false);

        // Busca solicitações que estejam 'Em Separação' para a filial ativa
        const resultado = await apiFetch(`/solicitacoes/listar?status=Em%20Separa%C3%A7%C3%A3o&filial=${estoqueAtual || ''}`);

        if (resultado.sucesso && resultado.dados) {
          const bsFormatados = resultado.dados.map(item => ({
            id: item.id.replace(/\D/g, '') || item.id,
            idOriginal: item.id,
            solicitante: item.solicitante || 'Não identificado',
            wbs: item.wbs || 'WBS-PADRAO',
            itens: item.itens ? item.itens.length : 1,
            destino: item.destino || item.filial || 'BR06 - BETIM',
            itensDetalhados: item.itens || []
          }));

          setListaBs(bsFormatados);
        }
      } catch (error) {
        console.error("Erro ao carregar BS para rota de coleta:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarBsAtivos();
  }, [estoqueAtual]);

  // Filtragem local baseada no campo de pesquisa
  const listaFiltrada = listaBs.filter(bs => 
    bs.id.includes(pesquisa) || 
    bs.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    bs.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

  // Lógica de Seleção
  const toggleSelecao = (id) => {
    setRotaGerada(false);
    if (selecionados.includes(id)) {
      setSelecionados(selecionados.filter(item => item !== id));
    } else {
      setSelecionados([...selecionados, id]);
    }
  };

  const toggleSelecionarTodos = () => {
    setRotaGerada(false);
    if (selecionados.length === listaFiltrada.length && listaFiltrada.length > 0) {
      setSelecionados([]);
    } else {
      setSelecionados(listaFiltrada.map(bs => bs.id));
    }
  };

  const handleGerarRota = () => {
    setRotaGerada(true);
  };

  // Cálculos dinâmicos da rota gerada
  const bsSelecionadosObjetos = listaBs.filter(bs => selecionados.includes(bs.id));
  const totalQtdItens = bsSelecionadosObjetos.reduce((acc, bs) => {
    const somaQtd = bs.itensDetalhados.reduce((subAcc, item) => 
      subAcc + Number(item.quantidade_solicitada || item.qtdFornecida || item.quantidade || 1), 0);
    return acc + (somaQtd || bs.itens);
  }, 0);

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
        
        {/* COLUNA ESQUERDA: LISTA DE BS */}
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
            {carregando ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block' }} />
                <span style={{ fontSize: '0.875rem' }}>Buscando solicitações ativas...</span>
              </div>
            ) : listaFiltrada.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Nenhum BS ativo em separação para esta filial.
              </div>
            ) : (
              listaFiltrada.map((bs) => {
                const isChecked = selecionados.includes(bs.id);
                return (
                  <div key={bs.id} className={`item-bs-coleta ${isChecked ? 'selecionado' : ''}`} onClick={() => toggleSelecao(bs.id)}>
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
              })
            )}
          </div>

          <div className="painel-selecao-footer">
            <button 
              className={`btn-gerar-rota ${existemSelecionados ? 'ativo' : ''}`}
              disabled={!existemSelecionados}
              onClick={handleGerarRota}
            >
              <ListTree size={18} /> Gerar Rota de Coleta
            </button>
          </div>
          
        </div>

        {/* COLUNA DIREITA: RENDER CONDICIONAL (PREVIEW VS GERADO) */}
        {!rotaGerada ? (
          <div className="painel-preview">
            <Waypoints size={64} className="icone-preview-rota" strokeWidth={1.5} />
            <h3>Selecione um ou mais BS e clique em "Gerar Rota de Coleta"</h3>
            <p>A rota será ordenada pela posição física no estoque</p>
          </div>
        ) : (
          <div className="painel-rota-gerada">
            
            {/* 1. KPIs Superiores */}
            <div className="rota-kpis-grid">
              <div className="rota-kpi-item">
                <div className="kpi-icone-bg azul"><MapPin size={18} /></div>
                <div className="kpi-textos"><strong>1</strong><span>Paradas</span></div>
              </div>
              <div className="rota-kpi-item">
                <div className="kpi-icone-bg azul"><Layers size={18} /></div>
                <div className="kpi-textos"><strong>{selecionados.length}</strong><span>BS</span></div>
              </div>
              <div className="rota-kpi-item">
                <div className="kpi-icone-bg azul"><Box size={18} /></div>
                <div className="kpi-textos"><strong>{totalQtdItens}</strong><span>Qtd Total</span></div>
              </div>
              <div className="rota-kpi-item">
                <div className="kpi-icone-bg verde"><CheckSquare size={18} /></div>
                <div className="kpi-textos"><strong>1</strong><span>NFs</span></div>
              </div>
            </div>

            {/* 2. Cabeçalho Impressão */}
            <div className="rota-header-imprimir">
              <div>
                <h2>Rota Otimizada de Separação</h2>
                <p>Ordenada por posição no estoque &middot; BS #{selecionados.join(', ')}</p>
              </div>
              <button className="btn-imprimir" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / PDF
              </button>
            </div>

            {/* 3. Lista de Paradas */}
            <div className="rota-paradas-scroll">
              <div className="parada-cartao">
                
                <div className="parada-header">
                  <div className="parada-header-esq">
                    <span className="badge-parada-num">PARADA 01</span>
                    <span className="badge-parada-loc"><MapPin size={14}/> 200-E-006-0044</span>
                  </div>
                  <div className="parada-total-geral">
                    Total Geral: <strong>{totalQtdItens}</strong>
                  </div>
                </div>

                <div className="parada-body">
                  <div className="nf-linha-header">
                    <div className="badge-nf-tit">
                      <FileText size={16}/> NÚMERO DA NF: <span className="badge-nf-num">396340</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>Qtd NF: <strong>{totalQtdItens}</strong></span>
                  </div>

                  {bsSelecionadosObjetos.map((bs) => (
                    (bs.itensDetalhados.length > 0 ? bs.itensDetalhados : [{} ]).map((item, idx) => (
                      <div key={`${bs.id}-${idx}`} className="item-linha-detalhe">
                        <Circle size={20} color="#cbd5e1" style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>WBS</span>
                        <span className="badge-wbs-item">{bs.wbs}</span>
                        
                        <div className="item-desc-textos">
                          <strong>{item.desenho_sap_manual || item.desenhoSAP || 'TLXXX-0000021870'}</strong>
                          <span>{item.descricao_manual || item.materialDescription || 'MODULO DE RELE PLC RSC 24UC 21 21'}</span>
                          <span>PN: {item.part_number_manual || item.numPecaFabricante || '2967073'}</span>
                        </div>
                        
                        <div className="item-qtd-destaque">
                          <strong>{item.quantidade_solicitada || item.qtdFornecida || 15}</strong>
                          <span>{item.unidade_medida_manual || 'NR'}</span>
                        </div>
                      </div>
                    ))
                  ))}

                  <div className="linha-subtotal">
                    Subtotal NF 396340: <strong>{totalQtdItens}</strong>
                  </div>

                </div>

                <div className="linha-total-final">
                  TOTAL GERAL DA PARADA: <strong>{totalQtdItens}</strong>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}