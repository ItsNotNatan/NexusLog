// =================================================================
// ARQUIVO: src/pages/Logistica/FormatacaoSAP/FormatacaoSAP.jsx
// DESCRIÇÃO: Formatação SAP conectada ao endpoint otimizado /listar-sap
// =================================================================
import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { 
  FileSpreadsheet, Search, X, CheckCircle2, Circle, 
  Layers, Copy, Lightbulb, AlertTriangle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import './FormatacaoSAP.css';
import { apiFetch } from '../../../services/api';

export default function FormatacaoSAP() {
  const [carregando, setCarregando] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState([]);
  
  const [busca, setBusca] = useState('');
  const buscaDiferida = useDeferredValue(busca);

  const [selecionados, setSelecionados] = useState(() => new Set()); 
  const [categoriaGeral, setCategoriaGeral] = useState('');
  const [categoriasIndividuais, setCategoriasIndividuais] = useState({});
  const [copiadoSucesso, setCopiadoSucesso] = useState(false);

  // Paginação da tabela direita
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;

  // Paginação do seletor lateral esquerdo
  const [paginaEsquerda, setPaginaEsquerda] = useState(1);
  const plsPorPagina = 8;

  const opcoesCategoria = [
    'Preencher .', 'Consumo', 'Imobilizado', 'Transferência', 
    'Venda', 'ZBN3', 'ZNB4', 'ZBRI', 'ZBE3', 'ZBE4'
  ];

  const limparEFormatarValor = (valorSujo) => {
    if (!valorSujo || valorSujo === '-' || String(valorSujo).trim() === 'NaN') return "0.00";
    let limpo = String(valorSujo).replace(/[^\d.,-]/g, '');
    if (limpo.includes('.') && limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');
    else if (limpo.includes(',')) limpo = limpo.replace(',', '.');

    const numReal = parseFloat(limpo);
    return isNaN(numReal) ? "0.00" : numReal.toFixed(2);
  };

  const formatarData = (dataStr) => {
    if (!dataStr || dataStr === '—' || dataStr === '-') return 'N/D';
    try {
      if (dataStr.includes('/')) return dataStr.split(' ')[0];
      return new Date(dataStr).toLocaleDateString('pt-BR');
    } catch {
      return String(dataStr);
    }
  };

  useEffect(() => {
    let ativo = true;

    const buscarDados = async () => {
      try {
        setCarregando(true);
        // ✨ Consome a rota filtrada e enriquecida no servidor (sem baixar o estoque geral)
        const resultado = await apiFetch('/solicitacoes/listar-sap');

        if (!ativo) return;

        if (resultado?.sucesso && Array.isArray(resultado.dados)) {
          setSolicitacoes(resultado.dados);
        }
      } catch (error) {
        console.error('Erro ao buscar dados formatados:', error.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    buscarDados();
    return () => { ativo = false; };
  }, []);

  const toggleSelecao = useCallback((id) => {
    setSelecionados(prev => {
      const proximo = new Set(prev);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }, []);

  const limparSelecao = useCallback(() => {
    setSelecionados(new Set());
    setCategoriaGeral('');
    setCategoriasIndividuais({});
  }, []);

  useEffect(() => { setPaginaAtual(1); }, [selecionados]);
  useEffect(() => { setPaginaEsquerda(1); }, [buscaDiferida]);

  const listaFiltrada = useMemo(() => {
    const termo = buscaDiferida.trim().toLowerCase();
    if (!termo) return solicitacoes;
    return solicitacoes.filter(sol => 
      sol.pl?.toLowerCase().includes(termo) || 
      sol.solicitante?.toLowerCase().includes(termo) ||
      sol.wbs?.toLowerCase().includes(termo)
    );
  }, [solicitacoes, buscaDiferida]);

  const totalPaginasEsquerda = Math.max(1, Math.ceil(listaFiltrada.length / plsPorPagina));
  const indexPrimeiroPl = (paginaEsquerda - 1) * plsPorPagina;
  const plsPaginadas = useMemo(() => 
    listaFiltrada.slice(indexPrimeiroPl, indexPrimeiroPl + plsPorPagina), 
    [listaFiltrada, indexPrimeiroPl]
  );

  const itensConsolidados = useMemo(() => {
    if (selecionados.size === 0) return [];
    const consolidado = [];

    for (let i = 0; i < solicitacoes.length; i++) {
      const sol = solicitacoes[i];
      if (selecionados.has(sol.id)) {
        const itens = sol.itens || [];
        for (let j = 0; j < itens.length; j++) {
          const item = itens[j];
          consolidado.push({
            idLinha: `${sol.id}-${item.id}`,
            origem: sol.pl,
            desenhoSAP: item.desenho_sap_manual || item.desenho_sap || item.desenhoSAP || '-',
            quantidade: item.quantidade_solicitada || item.qtd || 1,
            valorUnitario: limparEFormatarValor(item.valor_unitario_enriquecido),
            fabricante: item.fabricante_enriquecido || '-',
            wbs: sol.wbs || item.wbs_element || item.wbsOrigem || '-',
            destino: sol.filial || '-',
          });
        }
      }
    }
    return consolidado;
  }, [solicitacoes, selecionados]);

  const totalPaginas = Math.max(1, Math.ceil(itensConsolidados.length / itensPorPagina));
  const indexPrimeiroItem = (paginaAtual - 1) * itensPorPagina;
  const indexUltimoItem = Math.min(paginaAtual * itensPorPagina, itensConsolidados.length);
  const itensPaginados = useMemo(() => 
    itensConsolidados.slice(indexPrimeiroItem, indexUltimoItem), 
    [itensConsolidados, indexPrimeiroItem, indexUltimoItem]
  );

  const atualizarCategoriaGeral = (valor) => {
    setCategoriaGeral(valor);
    const novas = {};
    for (let i = 0; i < itensConsolidados.length; i++) {
      novas[itensConsolidados[i].idLinha] = valor;
    }
    setCategoriasIndividuais(novas);
  };

  const atualizarCategoriaIndividual = (idLinha, valor) => {
    setCategoriasIndividuais(prev => ({ ...prev, [idLinha]: valor }));
  };

  const gerarLinhaTsv = (item) => {
    const categoria = categoriasIndividuais[item.idLinha] || categoriaGeral || 'Preencher .';
    return `${item.desenhoSAP}\t${item.quantidade}\t${item.valorUnitario}\t${item.wbs}\t${item.destino}\t${categoria}`;
  };

  const forcarCopiaClipboard = (texto) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = texto;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const sucesso = document.execCommand('copy');
      document.body.removeChild(textArea);
      return sucesso;
    } catch {
      return false;
    }
  };

  const copiarLinha = (item) => {
    forcarCopiaClipboard(gerarLinhaTsv(item));
  };

  const copiarTudo = () => {
    if (itensConsolidados.length === 0) return;
    const copiado = forcarCopiaClipboard(itensConsolidados.map(gerarLinhaTsv).join('\n'));
    if (copiado) {
      setCopiadoSucesso(true);
      setTimeout(() => setCopiadoSucesso(false), 2000);
    }
  };

  return (
    <div className="form-sap-wrapper">
      <div className="form-sap-cabecalho">
        <div className="form-sap-icone-titulo"><FileSpreadsheet size={28} /></div>
        <div>
          <h1>Formatação para SAP</h1>
          <p>Selecione múltiplas PL concluídas para juntar, preencha a Categoria e copie as linhas formatadas.</p>
        </div>
      </div>

      <div className="form-sap-grid">
        {/* PAINEL LATERAL ESQUERDO */}
        <div className="form-sap-coluna-esq" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              <span className="texto-selecionados">{selecionados.size} selecionado(s)</span>
              {selecionados.size > 0 && (
                <button className="btn-limpar-selecao" onClick={limparSelecao}><X size={14} /> Limpar</button>
              )}
            </div>
          </div>

          <div className="sap-lista-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {carregando ? (
              <div className="sap-estado-vazio">A carregar Packing Lists...</div>
            ) : listaFiltrada.length === 0 ? (
              <div className="sap-estado-vazio">Nenhuma PL de Material ou Crossdocking concluída encontrada.</div>
            ) : (
              plsPaginadas.map(sol => {
                const isSelected = selecionados.has(sol.id);
                const dataFormatada = formatarData(sol.criacaoPl);
                
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
                        {sol.solicitante?.toUpperCase()} · {sol.itens?.length || 0} itens · {dataFormatada}
                      </div>
                      <div className="sap-item-destino">&rarr; {sol.filial}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!carregando && totalPaginasEsquerda > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Pág. <strong>{paginaEsquerda}</strong> de <strong>{totalPaginasEsquerda}</strong>
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  onClick={() => setPaginaEsquerda(p => Math.max(p - 1, 1))} 
                  disabled={paginaEsquerda === 1}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: paginaEsquerda === 1 ? '#f1f5f9' : '#fff', color: paginaEsquerda === 1 ? '#94a3b8' : '#334155', cursor: paginaEsquerda === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button 
                  onClick={() => setPaginaEsquerda(p => Math.min(p + 1, totalPaginasEsquerda))} 
                  disabled={paginaEsquerda === totalPaginasEsquerda}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: paginaEsquerda === totalPaginasEsquerda ? '#f1f5f9' : '#fff', color: paginaEsquerda === totalPaginasEsquerda ? '#94a3b8' : '#334155', cursor: paginaEsquerda === totalPaginasEsquerda ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PAINEL DIREITO */}
        <div className="form-sap-coluna-dir">
          {selecionados.size === 0 ? (
            <div className="sap-preview-vazio">
              <FileSpreadsheet size={48} color="#cbd5e1" />
              <h3>Nenhum documento selecionado</h3>
              <p>Selecione itens na lista ao lado para começar a formatar.</p>
            </div>
          ) : (
            <div className="sap-preview-conteudo" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="sap-alerta-selecao">
                <div className="sap-alerta-texto">
                  <AlertTriangle size={16} /> 
                  {selecionados.size} PL selecionado(s) — {itensConsolidados.length} itens no total
                </div>
                <div className="sap-tags-selecionadas">
                  {solicitacoes.filter(s => selecionados.has(s.id)).slice(0, 3).map(s => (
                    <span key={s.id} className="sap-tag">
                      {s.pl} <X size={12} onClick={() => toggleSelecao(s.id)} />
                    </span>
                  ))}
                  {selecionados.size > 3 && <span className="sap-tag-extra">+{selecionados.size - 3}</span>}
                </div>
              </div>

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
                
                <button 
                  className="sap-btn-copiar-tudo" 
                  onClick={copiarTudo}
                  style={copiadoSucesso ? { backgroundColor: '#10b981', color: '#ffffff', border: '1px solid #059669' } : {}}
                >
                  {copiadoSucesso ? <CheckCircle2 size={16} /> : <Copy size={16} />} 
                  {copiadoSucesso ? 'Copiado com Sucesso!' : 'Copiar Tudo para SAP'}
                </button>
              </div>

              <div className="sap-tabela-container" style={{ flex: 1 }}>
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
                    {itensPaginados.map(item => (
                      <tr key={item.idLinha}>
                        <td className="texto-cinza">{item.origem}</td>
                        <td className="texto-negrito">{item.desenhoSAP}</td>
                        <td className="texto-negrito">{item.quantidade}</td>
                        <td>{item.valorUnitario}</td>
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

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Página <strong style={{ color: '#1e293b' }}>{paginaAtual}</strong> de <strong style={{ color: '#1e293b' }}>{totalPaginas}</strong> &middot; Exibindo {itensConsolidados.length === 0 ? 0 : indexPrimeiroItem + 1} a <strong>{indexUltimoItem}</strong> de <strong>{itensConsolidados.length}</strong> itens
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} 
                      disabled={paginaAtual === 1}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: paginaAtual === 1 ? '#f1f5f9' : '#fff', color: paginaAtual === 1 ? '#94a3b8' : '#334155', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500' }}
                    >
                      <ChevronLeft size={16} /> Anterior
                    </button>
                    <button 
                      onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} 
                      disabled={paginaAtual === totalPaginas}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: paginaAtual === totalPaginas ? '#f1f5f9' : '#fff', color: paginaAtual === totalPaginas ? '#94a3b8' : '#334155', cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500' }}
                    >
                      Próxima <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
