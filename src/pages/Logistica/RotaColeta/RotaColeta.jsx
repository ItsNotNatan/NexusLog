// =================================================================
// ARQUIVO: src/pages/Logistica/RotaColeta/RotaColeta.jsx
// DESCRIÇÃO: Página de geração de Rota de Coleta (Picking).
// Gera o PDF silenciosamente em memória e abre-o no visualizador
// nativo do navegador.
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import './RotaColeta.css';
import { 
  Waypoints, Box, Search, Circle, CheckCircle2, 
  MapPin, Layers, CheckSquare, Printer, FileText, Loader2,
  ArrowRight
} from 'lucide-react';

// ✨ IMPORTAÇÃO DA BIBLIOTECA DE PDF
import html2pdf from 'html2pdf.js';

import { AuthContext } from '../../../contexts/AuthContext';
import { apiFetch } from '../../../services/api';

export default function RotaColeta() {
  const { estoqueAtual } = useContext(AuthContext);

  // ESTADOS DO COMPONENTE
  const [listaPl, setListaPl] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [selecionados, setSelecionados] = useState([]);
  const [rotaGerada, setRotaGerada] = useState(false);

  // ==========================================
  // 1. CARREGAMENTO DAS PLs ATIVAS DA API
  // ==========================================
  useEffect(() => {
    const carregarPlsAtivos = async () => {
      try {
        setCarregando(true);
        setSelecionados([]);
        setRotaGerada(false);

        const resultado = await apiFetch(`/solicitacoes/listar?status=Em%20Separa%C3%A7%C3%A3o&filial=${estoqueAtual || ''}&limit=100`);

        if (resultado.sucesso && resultado.dados) {
          const apenasPLsReais = resultado.dados.filter(item => item.pl && item.pl !== '-' && item.pl !== '—');

          const plsFormatados = apenasPLsReais.map(item => ({
            id: item.pl.replace(/\D/g, ''), 
            idOriginal: item.id,
            plCompleto: item.pl, 
            solicitante: item.solicitante || 'Não identificado',
            wbs: item.wbs || 'WBS-PADRAO',
            itens: item.itens ? item.itens.length : 0,
            destino: item.destino || item.filial || 'BR06',
            itensDetalhados: item.itens || []
          }));

          setListaPl(plsFormatados);
        }
      } catch (error) {
        console.error("Erro ao carregar PLs para rota de coleta:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarPlsAtivos();
  }, [estoqueAtual]);

  // ==========================================
  // 2. LÓGICA DE PESQUISA E SELEÇÃO
  // ==========================================
  const listaFiltrada = listaPl.filter(pl => 
    pl.plCompleto.toLowerCase().includes(pesquisa.toLowerCase()) || 
    pl.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    pl.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

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
      setSelecionados(listaFiltrada.map(pl => pl.id));
    }
  };

  const isTodosSelecionados = selecionados.length === listaFiltrada.length && listaFiltrada.length > 0;
  const existemSelecionados = selecionados.length > 0;

  // ==========================================
  // 3. LÓGICA DE AGRUPAMENTO (PARADAS E NFs)
  // ==========================================
  const plsSelecionadosObjetos = listaPl.filter(pl => selecionados.includes(pl.id));
  
  let todosItens = [];
  plsSelecionadosObjetos.forEach(pl => {
    (pl.itensDetalhados || []).forEach(item => {
      todosItens.push({
        ...item,
        plOrigem: pl.plCompleto,
        wbs: pl.wbs || item.wbs_element || '-',
        alocacao: item.alocacao || 'Sem Alocação',
        nf: item.nf_entrada || 'SEM NF'
      });
    });
  });

  const paradasMap = {};
  todosItens.forEach(item => {
    if (!paradasMap[item.alocacao]) paradasMap[item.alocacao] = [];
    paradasMap[item.alocacao].push(item);
  });
  const paradasOrdenadas = Object.keys(paradasMap).sort();

  const somarQtd = (itensArray) => itensArray.reduce((acc, item) => 
    acc + Number(item.quantidade_solicitada || item.qtdFornecida || item.quantidade || 1), 0
  );

  const totalParadas = paradasOrdenadas.length;
  const totalQtdGeral = somarQtd(todosItens);
  const totalNFs = new Set(todosItens.map(i => i.nf)).size;

  const dataHoraAtual = new Date().toLocaleString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });

  // ==========================================
  // 4. ✨ GERAR PDF EM MEMÓRIA E ABRIR NO NAVEGADOR
  // ==========================================
  const gerarPdfNativo = () => {
    // 1. Abre a aba imediatamente para evitar bloqueio de Pop-ups
    const novaAba = window.open('', '_blank');
    novaAba.document.write(`
      <html>
        <head><title>A gerar PDF...</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f1f5f9; color: #475569; margin: 0;">
          <h2 style="font-weight: 500;">A compilar o documento PDF. Por favor, aguarde...</h2>
        </body>
      </html>
    `);

    // 2. Cria o elemento HTML invisível em memória para desenhar o boletim
    const containerParaPdf = document.createElement('div');
    containerParaPdf.style.width = '1000px'; 
    containerParaPdf.style.padding = '20px';
    containerParaPdf.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    containerParaPdf.style.color = '#1e293b';
    containerParaPdf.style.backgroundColor = '#ffffff';

    let htmlString = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2px solid #1e293b;">
        <h3 style="margin: 0; font-size: 1.4rem; color: #1e293b; text-transform: uppercase; font-weight: 800;">ROTA DE COLETA — SEPARAÇÃO OTIMIZADA</h3>
        <span style="font-size: 0.9rem; color: #475569;">${dataHoraAtual}</span>
      </div>
      <div style="font-size: 0.95rem; color: #1e293b; font-weight: 700; margin-bottom: 24px;">
        PLs incluídos: ${selecionados.map(id => `PL #${id}`).join(', ')} &nbsp;|&nbsp; Paradas: ${totalParadas} &nbsp;|&nbsp; Itens consolidados: ${totalQtdGeral}
      </div>
    `;

    // Loop nas Paradas
    paradasOrdenadas.forEach((localizacao, pIdx) => {
      const itensDaParada = paradasMap[localizacao];
      const totalDaParada = somarQtd(itensDaParada);

      const nfMap = {};
      itensDaParada.forEach(it => {
        if (!nfMap[it.nf]) nfMap[it.nf] = [];
        nfMap[it.nf].push(it);
      });

      htmlString += `
        <div style="margin-bottom: 24px; border: 2px solid #2563eb; border-radius: 4px; overflow: hidden; page-break-inside: avoid;">
          <div style="background-color: #ffffff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2563eb;">
            <div>
              <span style="font-weight: 800; font-size: 1.2rem; margin-right: 12px; text-transform: uppercase; color: #94a3b8;">PARADA ${String(pIdx + 1).padStart(2, '0')}</span>
              <span style="color: #b45309; font-weight: 800; font-size: 1.2rem;">${localizacao}</span>
            </div>
            <span style="font-weight: 700; font-size: 1rem; color: #94a3b8;">Total Geral: ${totalDaParada}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; table-layout: fixed; word-wrap: break-word;">
            <thead>
              <tr>
                <th style="width: 15%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: center;">NF</th>
                <th style="width: 25%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: left;">Desenho SAP</th>
                <th style="width: 15%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: center;">WBS</th>
                <th style="width: 30%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: left;">Descrição</th>
                <th style="width: 5%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: center;">Qtd</th>
                <th style="width: 5%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: center;">Un</th>
                <th style="width: 10%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: center;">PL</th>
                <th style="width: 5%; background-color: #ffffff; color: #cbd5e1; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; text-transform: uppercase; font-size: 0.75rem; text-align: center;">✓</th>
              </tr>
            </thead>
            <tbody>
      `;

      Object.keys(nfMap).forEach((numNF) => {
        const itensDaNF = nfMap[numNF];
        const totalDaNF = somarQtd(itensDaNF);

        itensDaNF.forEach((item, iIdx) => {
          htmlString += `<tr>`;
          if (iIdx === 0) {
            htmlString += `<td rowspan="${itensDaNF.length}" style="font-weight: 800; font-size: 1rem; text-align: center; background-color: #ffffff; word-break: break-all; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb; vertical-align: middle;">${numNF}</td>`;
          }
          
          htmlString += `
              <td style="padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb; vertical-align: middle;">
                <strong style="font-size: 1rem; font-weight: 800;">${item.desenho_sap_manual || item.desenhoSAP || '-'}</strong><br/>
                <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-top: 2px;">PN: ${item.part_number_manual || item.numPecaFabricante || '-'}</span>
              </td>
              <td style="font-family: monospace, sans-serif; font-weight: 700; font-size: 0.85rem; text-align: center; word-break: break-all; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb; vertical-align: middle;">${item.wbs}</td>
              <td style="font-size: 0.85rem; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb; vertical-align: middle;">${item.descricao_manual || item.materialDescription || 'Sem descrição'}</td>
              <td style="text-align: center; font-weight: bold; font-size: 0.95rem; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb; vertical-align: middle;">
                ${item.quantidade_solicitada || item.qtdFornecida || item.quantidade || 1}
              </td>
              <td style="text-align: center; font-size: 0.85rem; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb; vertical-align: middle;">${item.unidade_medida_manual || 'Unid'}</td>
              <td style="text-align: center; font-size: 0.75rem; font-weight: 600; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb; vertical-align: middle;">${item.plOrigem?.replace('PL #', '')}</td>
              <td style="padding: 8px; border-bottom: 1px solid #2563eb; vertical-align: middle;"></td>
            </tr>
          `;
        });

        htmlString += `
          <tr>
            <td colspan="4" style="text-align: right; background-color: #ffffff; border-top: 1px solid #2563eb; font-weight: 600; font-size: 0.9rem; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb;">Subtotal NF ${numNF}:</td>
            <td style="text-align: center; background-color: #ffffff; border-top: 1px solid #2563eb; font-weight: 700; font-size: 0.95rem; padding: 8px; border-bottom: 1px solid #2563eb; border-right: 1px solid #2563eb;">${totalDaNF}</td>
            <td colspan="3" style="background-color: #ffffff; border-top: 1px solid #2563eb; padding: 8px; border-bottom: 1px solid #2563eb;"></td>
          </tr>
        `;
      });

      htmlString += `
            <tr>
              <td colspan="4" style="text-align: right; background-color: #ffffff; border-top: 2px solid #2563eb; color: #000000; font-weight: 800; font-size: 0.95rem; padding: 10px 8px; border-right: 1px solid #2563eb;">TOTAL GERAL DA PARADA:</td>
              <td style="text-align: center; background-color: #ffffff; border-top: 2px solid #2563eb; color: #000000; font-weight: 800; font-size: 1.1rem; padding: 10px 8px; border-right: 1px solid #2563eb;">${totalDaParada}</td>
              <td colspan="3" style="background-color: #ffffff; border-top: 2px solid #2563eb; padding: 8px;"></td>
            </tr>
          </tbody>
        </table>
      </div>`;
    });

    htmlString += `
      <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 0.95rem; font-weight: 700; color: #1e293b; page-break-inside: avoid;">
        <div style="width: 45%; display: flex; align-items: flex-end;">Operador (Empilhadeira): <div style="flex: 1; border-bottom: 1px solid #1e293b; margin-left: 8px;"></div></div>
        <div style="width: 45%; display: flex; align-items: flex-end;">Assinatura: <div style="flex: 1; border-bottom: 1px solid #1e293b; margin-left: 8px;"></div></div>
      </div>
    `;

    containerParaPdf.innerHTML = htmlString;

    // 3. Configurações para a biblioteca gerar o PDF a partir do HTML em memória
    const opcoesPDF = {
      margin:       10, 
      filename:     `Boletim_Coleta_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true }, 
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 4. Executa a geração do PDF e substitui a aba pelo Blob do ficheiro
    html2pdf().set(opcoesPDF).from(containerParaPdf).output('bloburl').then((pdfBlobUrl) => {
      // Magia: A aba "Aguarde" transforma-se instantaneamente no leitor nativo de PDF do Chrome!
      novaAba.location.replace(pdfBlobUrl); 
    }).catch(err => {
      console.error("Erro ao gerar PDF:", err);
      novaAba.close();
      alert("Houve um problema ao gerar o documento PDF.");
    });
  };

  return (
    <div className="rota-coleta-wrapper">
      
      <header className="rota-cabecalho">
        <Waypoints className="icone-titulo" size={36} strokeWidth={2.5} />
        <div>
          <h1>Rota de Coleta (Picking)</h1>
          <p>Selecione múltiplas PLs para consolidar os materiais e gerar uma rota de separação ordenada pela posição no estoque.</p>
        </div>
      </header>

      <div className="rota-grid">
        {/* COLUNA ESQUERDA: LISTA DE PLs */}
        <div className="painel-selecao">
          <div className="banner-info-azul">
            <Box size={16} /> Exibindo apenas PLs ativos (Em Separação)
          </div>

          <div className="pesquisa-pl-wrapper">
            <Search className="pesquisa-icone" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nº PL, WBS, solicitante..." 
              className="pesquisa-input"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </div>

          <div className="selecionar-todos-bar">
            <div className="checkbox-personalizado" onClick={toggleSelecionarTodos}>
              <input type="checkbox" checked={isTodosSelecionados} readOnly className="checkbox-input" />
              <span>Selecionar todos</span>
            </div>
            <span className="texto-selecionados">{selecionados.length} selecionado(s)</span>
          </div>

          <div className="lista-pl-scroll">
            {carregando ? (
              <div className="estado-vazio-pl">
                <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                <span>Buscando PLs ativos...</span>
              </div>
            ) : listaFiltrada.length === 0 ? (
              <div className="estado-vazio-pl">
                Nenhuma Packing List aprovada pendente de separação para esta filial.
              </div>
            ) : (
              listaFiltrada.map((pl) => {
                const isChecked = selecionados.includes(pl.id);
                return (
                  <div key={pl.id} className={`item-pl-coleta ${isChecked ? 'selecionado' : ''}`} onClick={() => toggleSelecao(pl.id)}>
                    <div className="item-pl-check">
                      {isChecked ? <CheckCircle2 size={20} color="#2563eb" fill="#eff6ff" /> : <Circle size={20} color="#cbd5e1" />}
                    </div>
                    <div className="item-pl-info">
                      <div className="item-pl-titulo"><strong>PL</strong> #{pl.id}</div>
                      <div className="item-pl-detalhes">
                        {pl.solicitante.toUpperCase()} &middot; WBS {pl.wbs} &middot; {pl.itens} {pl.itens === 1 ? 'item' : 'itens'}
                      </div>
                      <div className="item-pl-destino"><ArrowRight size={12} /> {pl.destino}</div>
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
              onClick={() => setRotaGerada(true)}
            >
              <Waypoints size={18} /> Gerar Rota de Coleta
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: PREVIEW E ROTA GERADA */}
        {!rotaGerada ? (
          <div className="painel-preview">
            <Waypoints size={64} className="icone-preview-rota" strokeWidth={1.5} />
            <h3>Selecione uma ou mais PLs e clique em "Gerar Rota de Coleta"</h3>
            <p>A rota será consolidada e ordenada pela posição física no estoque</p>
          </div>
        ) : (
          <div className="painel-rota-gerada">
            <div className="rota-kpis-grid">
              <div className="rota-kpi-item"><div className="kpi-icone-bg azul"><MapPin size={18} /></div><div className="kpi-textos"><strong>{totalParadas}</strong><span>Paradas</span></div></div>
              <div className="rota-kpi-item"><div className="kpi-icone-bg azul"><Layers size={18} /></div><div className="kpi-textos"><strong>{selecionados.length}</strong><span>PLs</span></div></div>
              <div className="rota-kpi-item"><div className="kpi-icone-bg azul"><Box size={18} /></div><div className="kpi-textos"><strong>{totalQtdGeral}</strong><span>Qtd Total</span></div></div>
              <div className="rota-kpi-item"><div className="kpi-icone-bg verde"><CheckSquare size={18} /></div><div className="kpi-textos"><strong>{totalNFs}</strong><span>NFs</span></div></div>
            </div>

            <div className="rota-header-imprimir">
              <div>
                <h2>Rota Otimizada de Separação</h2>
                <p>Ordenada por posição no estoque &middot; PL #{selecionados.join(', PL #')}</p>
              </div>
              {/* ✨ AÇÃO: Dispara a nova função de PDF puro */}
              <button className="btn-imprimir" onClick={gerarPdfNativo}>
                <Printer size={16} /> Imprimir / PDF
              </button>
            </div>

            <div className="rota-paradas-scroll">
              {paradasOrdenadas.map((localizacao, pIdx) => {
                const itensDaParada = paradasMap[localizacao];
                const totalDaParada = somarQtd(itensDaParada);
                const nfMap = {};
                itensDaParada.forEach(it => {
                  if (!nfMap[it.nf]) nfMap[it.nf] = [];
                  nfMap[it.nf].push(it);
                });

                return (
                  <div key={localizacao} className="parada-cartao">
                    <div className="parada-header">
                      <div className="parada-header-esq">
                        <span className="badge-parada-num">PARADA {String(pIdx + 1).padStart(2, '0')}</span>
                        <span className="badge-parada-loc"><MapPin size={14}/> {localizacao}</span>
                      </div>
                      <div className="parada-total-geral">Total Geral: <strong>{totalDaParada}</strong></div>
                    </div>

                    <div className="parada-body">
                      {Object.keys(nfMap).map(numNF => {
                        const itensDaNF = nfMap[numNF];
                        const totalDaNF = somarQtd(itensDaNF);
                        return (
                          <div key={numNF} className="nf-grupo-container">
                            <div className="nf-linha-header">
                              <div className="badge-nf-tit"><FileText size={16}/> NÚMERO DA NF: <span className="badge-nf-num">{numNF}</span></div>
                              <span className="texto-qtd-nf">Qtd NF: <strong>{totalDaNF}</strong></span>
                            </div>
                            {itensDaNF.map((item, iIdx) => (
                              <div key={iIdx} className="item-linha-detalhe">
                                <Circle size={20} color="#cbd5e1" style={{ flexShrink: 0, cursor: 'pointer' }} />
                                <span className="badge-wbs-item">WBS {item.wbs}</span>
                                <div className="item-desc-textos">
                                  <strong>{item.desenho_sap_manual || item.desenhoSAP || '-'}</strong>
                                  <span className="item-nome-desc">{item.descricao_manual || item.materialDescription || 'Sem descrição'}</span>
                                  <span className="item-pn-desc">PN: {item.part_number_manual || item.numPecaFabricante || '-'}</span>
                                </div>
                                <div className="item-qtd-destaque">
                                  <strong>{item.quantidade_solicitada || item.qtdFornecida || item.quantidade || 1}</strong>
                                  <span>{item.unidade_medida_manual || 'Unid'}</span>
                                </div>
                              </div>
                            ))}
                            <div className="linha-subtotal">Subtotal NF {numNF}: <strong>{totalDaNF}</strong></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="linha-total-final">TOTAL GERAL DA PARADA: <strong>{totalDaParada}</strong></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}