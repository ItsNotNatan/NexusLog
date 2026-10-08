// =================================================================
// ARQUIVO: src/pages/Logistica/FormatacaoSAP/FormatacaoSAP.jsx
// DESCRIÇÃO: Interface interativa para preparar e copiar dados para o SAP (Com Valores Unitários Enriquecidos)
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
  
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState([]); 
  const [categoriaGeral, setCategoriaGeral] = useState('');
  const [categoriasIndividuais, setCategoriasIndividuais] = useState({});

  const opcoesCategoria = [
    'Preencher .', 
    'Consumo', 
    'Imobilizado', 
    'Transferência', 
    'Venda',
    'ZBN3',
    'ZNB4',
    'ZBRI',
    'ZBE3',
    'ZBE4'
  ];

  useEffect(() => {
    const buscarDados = async () => {
      try {
        setCarregando(true);
        
        // ✨ CORREÇÃO CRUCIAL: Buscar as solicitações E o inventário ao mesmo tempo para cruzar dados!
        const [resultadoSol, resultadoEst] = await Promise.all([
          apiFetch('/solicitacoes/listar?status=Conclu%C3%ADdo&limit=100'),
          apiFetch('/estoque/listar?rastreabilidade=true')
        ]);

        let estoqueReferencia = [];
        if (resultadoEst && resultadoEst.sucesso && resultadoEst.dados) {
          estoqueReferencia = resultadoEst.dados;
        }
        
        if (resultadoSol && resultadoSol.sucesso && resultadoSol.dados) {
          // Filtro estrito: Apenas os 3 tipos E obrigatoriamente com PL gerada
          const transferencias = resultadoSol.dados.filter(
            s => (
              s.tipo === 'Material' || 
              s.tipo === 'Transferencia WBS' || 
              s.tipo === 'Transfer. WBS' || 
              s.tipo === 'Crossdocking'
            ) && (s.pl && s.pl !== '-' && s.pl !== '—')
          );

          // ✨ ENRIQUECIMENTO: Puxamos o valor unitário da prateleira (estoque físico)
          const solicitacoesEnriquecidas = transferencias.map(sol => {
            const itensEnriquecidos = (sol.itens || []).map(it => {
              const itemFisico = (it.estoque_id && estoqueReferencia.length > 0)
                ? estoqueReferencia.find(e => e.id === it.estoque_id)
                : null;
                
              return {
                ...it,
                valor_unitario_enriquecido: it.valor_unitario_manual ?? itemFisico?.valor_unitario ?? null
              };
            });

            return { ...sol, itens: itensEnriquecidos };
          });

          setSolicitacoes(solicitacoesEnriquecidas);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error.message);
      } finally {
        setCarregando(false);
      }
    };
    
    buscarDados();
  }, []);

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

  // ✨ FUNÇÃO: Transforma "R$ 1.234,56" num número limpo (1234.56) que o SAP entende
  const limparEFormatarValor = (valorSujo) => {
    if (valorSujo === undefined || valorSujo === null || valorSujo === '-' || String(valorSujo).trim() === 'NaN') return "0.00";
    
    // Se for string, remove tudo o que não for número, vírgula ou ponto
    let limpo = String(valorSujo).replace(/[^\d.,-]/g, '');
    
    // Converte formatação brasileira (1.234,56) para formato matemático (1234.56)
    if (limpo.includes('.') && limpo.includes(',')) {
      limpo = limpo.replace(/\./g, '').replace(',', '.');
    } else if (limpo.includes(',')) {
      limpo = limpo.replace(',', '.');
    }

    const numReal = parseFloat(limpo);
    return isNaN(numReal) ? "0.00" : numReal.toFixed(2);
  };

  const listaFiltrada = solicitacoes.filter(sol => {
    const termo = busca.toLowerCase();
    return sol.pl.toLowerCase().includes(termo) || 
           sol.solicitante?.toLowerCase().includes(termo) ||
           sol.wbs?.toLowerCase().includes(termo);
  });

  const itensConsolidados = solicitacoes
    .filter(sol => selecionados.includes(sol.id))
    .flatMap(sol => {
      return (sol.itens || []).map(item => ({
        idLinha: `${sol.id}-${item.id}`,
        origem: sol.pl,
        desenhoSAP: item.desenho_sap_manual || item.desenhoSAP || '-',
        quantidade: item.quantidade_solicitada || item.qtd || 1,
        // ✨ CORREÇÃO: Aplica a função de limpeza ao valor unitário ENRIQUECIDO de forma segura
        valorUnitario: limparEFormatarValor(item.valor_unitario_enriquecido),
        wbs: sol.wbs || item.wbsOrigem || '-',
        destino: sol.filial || '-',
      }));
    });

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
    return `${item.desenhoSAP}\t${item.quantidade}\t${item.valorUnitario}\t${item.wbs}\t${item.destino}\t${categoria}`;
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

  return (
    <div className="form-sap-wrapper">
      
      <div className="form-sap-cabecalho">
        <div className="form-sap-icone-titulo">
          <FileSpreadsheet size={28} />
        </div>
        <div>
          <h1>Formatação para SAP</h1>
          <p>Selecione múltiplas PL concluídas para juntar, preencha a Categoria e copie as linhas formatadas.</p>
        </div>
      </div>

      <div className="form-sap-grid">
        
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

        <div className="form-sap-coluna-dir">
          {selecionados.length === 0 ? (
            <div className="sap-preview-vazio">
              <FileSpreadsheet size={48} color="#cbd5e1" />
              <h3>Nenhum documento selecionado</h3>
              <p>Selecione itens na lista ao lado para começar a formatar.</p>
            </div>
          ) : (
            <div className="sap-preview-conteudo">
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
