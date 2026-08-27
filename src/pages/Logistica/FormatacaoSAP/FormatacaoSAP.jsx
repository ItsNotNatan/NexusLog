// =================================================================
// ARQUIVO: src/pages/Logistica/FormatacaoSAP/FormatacaoSAP.jsx
// DESCRIÇÃO: Interface interativa para preparar e copiar dados para o SAP
//            (Exclusivo para PL - Packing Lists Concluídas)
// =================================================================
import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Search, X, CheckCircle2, Circle, 
  Layers, Copy, Lightbulb, AlertTriangle 
} from 'lucide-react';
import './FormatacaoSAP.css';
import { apiFetch } from '../../../services/api';

export default function FormatacaoSAP() {
  const [carregando, setCarregando] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState([]);
  
  // ---------------------------------------------------------------------------
  // ESTADOS DA INTERFACE
  // ---------------------------------------------------------------------------
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState([]); // IDs das solicitações selecionadas
  const [categoriaGeral, setCategoriaGeral] = useState('');
  const [categoriasIndividuais, setCategoriasIndividuais] = useState({});

  // Opções de Categoria para o SAP
  const opcoesCategoria = ['Preencher .', 'Consumo', 'Imobilizado', 'Transferência', 'Venda'];

  // ---------------------------------------------------------------------------
  // 1. BUSCA DE DADOS NA API
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const buscarDados = async () => {
      try {
        setCarregando(true);
        // Busca solicitações concluídas (onde foi gerada PL)
        const resultado = await apiFetch('/solicitacoes/listar?status=Conclu%C3%ADdo&limit=100');
        
        if (resultado.sucesso && resultado.dados) {
          setSolicitacoes(resultado.dados);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error.message);
      } finally {
        setCarregando(false);
      }
    };
    buscarDados();
  }, []);

  // ---------------------------------------------------------------------------
  // 2. LÓGICA DE SELEÇÃO E FILTRAGEM
  // ---------------------------------------------------------------------------
  const toggleSelecao = (id) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const limparSelecao = () => {
    setSelecionados([]);
    setCategoriaGeral('');
    setCategoriasIndividuais({});
  };

  // Filtra as solicitações para a lista da esquerda (Apenas PLs válidas)
  const listaFiltrada = solicitacoes.filter(sol => {
    const isPL = sol.pl && sol.pl !== '-'; // Verifica se tem Packing List gerada
    if (!isPL) return false;

    const termo = busca.toLowerCase();
    return sol.pl.toLowerCase().includes(termo) || 
           sol.solicitante?.toLowerCase().includes(termo) ||
           sol.wbs?.toLowerCase().includes(termo);
  });

  // Consolidar todos os itens das solicitações selecionadas na tabela da direita
  const itensConsolidados = solicitacoes
    .filter(sol => selecionados.includes(sol.id))
    .flatMap(sol => {
      return (sol.itens || []).map(item => ({
        idLinha: `${sol.id}-${item.id}`,
        origem: sol.pl, // Usa sempre a PL
        desenhoSAP: item.desenho_sap_manual || item.desenhoSAP || '-',
        quantidade: item.quantidade_solicitada || item.qtd || 1,
        valorUnitario: item.valor_unitario_manual || 0,
        wbs: sol.wbs || item.wbsOrigem || '-',
        destino: sol.filial || '-',
      }));
    });

  // ---------------------------------------------------------------------------
  // 3. LÓGICA DE CÓPIA PARA A ÁREA DE TRANSFERÊNCIA (CLIPBOARD)
  // ---------------------------------------------------------------------------
  const atualizarCategoriaGeral = (valor) => {
    setCategoriaGeral(valor);
    const novasCatIndividuais = {};
    itensConsolidados.forEach(item => {
      novasCatIndividuais[item.idLinha] = valor;
    });
    setCategoriasIndividuais(novasCatIndividuais);
  };

  const atualizarCategoriaIndividual = (idLinha, valor) => {
    setCategoriasIndividuais(prev => ({ ...prev, [idLinha]: valor }));
  };

  const gerarLinhaTsv = (item) => {
    const categoria = categoriasIndividuais[item.idLinha] || categoriaGeral || 'Preencher .';
    const valorFormatado = Number(item.valorUnitario).toFixed(2);
    // Ordem exata: Desenho SAP \t Quantidade \t Valor Unitário \t WBS \t Filial de Destino \t Categoria
    return `${item.desenhoSAP}\t${item.quantidade}\t${valorFormatado}\t${item.wbs}\t${item.destino}\t${categoria}`;
  };

  const copiarLinha = (item) => {
    const texto = gerarLinhaTsv(item);
    navigator.clipboard.writeText(texto);
  };

  const copiarTudo = () => {
    if (itensConsolidados.length === 0) return;
    const textoCompleto = itensConsolidados.map(gerarLinhaTsv).join('\n');
    navigator.clipboard.writeText(textoCompleto);
    alert('Dados copiados para a área de transferência! Pronto para colar no SAP.');
  };

  // ---------------------------------------------------------------------------
  // 4. INTERFACE (RENDER)
  // ---------------------------------------------------------------------------
  return (
    <div className="form-sap-wrapper">
      
      {/* CABEÇALHO DA PÁGINA */}
      <div className="form-sap-cabecalho">
        <div className="form-sap-icone-titulo">
          <FileSpreadsheet size={28} />
        </div>
        <div>
          <h1>Formatação para SAP</h1>
          <p>Selecione múltiplas PL para juntar (limite de 20 itens), preencha a Categoria e copie as linhas formatadas.</p>
        </div>
      </div>

      <div className="form-sap-grid">
        
        {/* ================= COLUNA ESQUERDA: LISTA E PESQUISA ================= */}
        <div className="form-sap-coluna-esq">
          <div className="sap-pesquisa-caixa">
            <div className="sap-input-wrapper">
              <Search size={16} className="sap-icone-pesquisa" />
              <input 
                type="text" 
                placeholder="Buscar por nº PL, WBS ou Solicitante..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            
            <div className="sap-selecao-info">
              <span className="texto-selecionados">{selecionados.length} selecionado(s)</span>
              {selecionados.length > 0 && (
                <button className="btn-limpar-selecao" onClick={limparSelecao}>
                  <X size={14} /> Limpar
                </button>
              )}
            </div>
          </div>

          <div className="sap-lista-scroll">
            {carregando ? (
              <div className="sap-estado-vazio">A carregar Packing Lists...</div>
            ) : listaFiltrada.length === 0 ? (
              <div className="sap-estado-vazio">Nenhuma PL concluída encontrada.</div>
            ) : (
              listaFiltrada.map(sol => {
                const isSelected = selecionados.includes(sol.id);
                const dataFormatada = sol.criacaoPl && sol.criacaoPl !== '—' ? sol.criacaoPl.split(' ')[0] : 'N/D';
                const qtdItens = sol.itens ? sol.itens.length : 0;

                return (
                  <div 
                    key={sol.id} 
                    className={`sap-lista-item ${isSelected ? 'selecionado' : ''}`}
                    onClick={() => toggleSelecao(sol.id)}
                  >
                    <div className="sap-item-check">
                      {isSelected ? <CheckCircle2 size={20} color="#2563eb" className="check-preenchido" /> : <Circle size={20} color="#cbd5e1" />}
                    </div>
                    <div className="sap-item-detalhes">
                      <div className="sap-item-titulo">{sol.pl}</div>
                      <div className="sap-item-subtitulo">
                        {sol.solicitante.toUpperCase()} · {qtdItens} itens · {dataFormatada}
                      </div>
                      <div className="sap-item-destino">
                        &rarr; {sol.filial}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUNA DIREITA: PREVIEW E AÇÕES ================= */}
        <div className="form-sap-coluna-dir">
          
          {selecionados.length === 0 ? (
            <div className="sap-preview-vazio">
              <FileSpreadsheet size={48} color="#cbd5e1" />
              <h3>Nenhum documento selecionado</h3>
              <p>Selecione itens na lista ao lado para começar a formatar.</p>
            </div>
          ) : (
            <div className="sap-preview-conteudo">
              
              {/* Alerta Topo */}
              <div className="sap-alerta-selecao">
                <div className="sap-alerta-texto">
                  <AlertTriangle size={16} /> 
                  {selecionados.length} PL selecionado(s) — {itensConsolidados.length} itens no total
                </div>
                <div className="sap-tags-selecionadas">
                  {solicitacoes.filter(s => selecionados.includes(s.id)).slice(0, 3).map(s => (
                    <span key={s.id} className="sap-tag">
                      {s.pl} 
                      <X size={12} onClick={() => toggleSelecao(s.id)} />
                    </span>
                  ))}
                  {selecionados.length > 3 && <span className="sap-tag-extra">+{selecionados.length - 3}</span>}
                </div>
              </div>

              {/* Barra de Ação Global (Categoria) */}
              <div className="sap-barra-acao">
                <div className="sap-categoria-global">
                  <div className="sap-icone-camadas"><Layers size={20} /></div>
                  <div className="sap-labels-categoria">
                    <span className="sap-label-forte">CATEGORIA GERAL</span>
                    <span className="sap-label-fraco">Preenche todos os itens abaixo</span>
                  </div>
                  <select 
                    className="sap-select-categoria"
                    value={categoriaGeral}
                    onChange={(e) => atualizarCategoriaGeral(e.target.value)}
                  >
                    <option value="">— Escolher —</option>
                    {opcoesCategoria.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                
                <button className="sap-btn-copiar-tudo" onClick={copiarTudo}>
                  <Copy size={16} /> Copiar Tudo para SAP
                </button>
              </div>

              {/* Tabela de Itens */}
              <div className="sap-tabela-container">
                <table className="sap-tabela-preview">
                  <thead>
                    <tr>
                      <th>ORIGEM</th>
                      <th>DESENHO SAP</th>
                      <th>QUANTIDADE</th>
                      <th>VALOR UNITÁRIO</th>
                      <th>WBS</th>
                      <th>DESTINO</th>
                      <th>CATEGORIA</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensConsolidados.map(item => (
                      <tr key={item.idLinha}>
                        <td className="texto-cinza">{item.origem}</td>
                        <td className="texto-negrito">{item.desenhoSAP}</td>
                        <td className="texto-negrito">{item.quantidade}</td>
                        <td>{Number(item.valorUnitario).toFixed(2)}</td>
                        <td className="texto-azul-link">{item.wbs}</td>
                        <td>{item.destino}</td>
                        <td>
                          <select 
                            className="sap-select-tabela"
                            value={categoriasIndividuais[item.idLinha] || categoriaGeral || 'Preencher .'}
                            onChange={(e) => atualizarCategoriaIndividual(item.idLinha, e.target.value)}
                          >
                            <option value="Preencher .">Preencher .</option>
                            {opcoesCategoria.filter(c => c !== 'Preencher .').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="td-acao">
                          <button className="btn-copiar-linha" onClick={() => copiarLinha(item)} title="Copiar esta linha">
                            <Copy size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Nota de Rodapé */}
              <div className="sap-footer-nota">
                <Lightbulb size={16} color="#eab308" />
                <span>
                  Ordem das colunas: <strong>Desenho SAP · Quantidade · Valor Unitário · WBS · Filial de Destino · Categoria</strong> — Use a <strong>Categoria Geral</strong> para preencher todos de uma vez, ou edite individualmente.
                </span>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}