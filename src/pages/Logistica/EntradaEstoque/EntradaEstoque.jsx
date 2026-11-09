import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Package, Truck, User, Paperclip, Send, FileSpreadsheet, X, Info } from 'lucide-react';
import ExcelJS from 'exceljs';

import './EntradaEstoque.css';

import CarregarArquivo from '../../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../../hooks/useProcessadorExcel';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import TabelaInsercaoItens from '../../../components/TabelaInsercaoItens/TabelaInsercaoItens'; 
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch, enviarArquivos } from '../../../services/api';

const LIMITE_LOGISTICA = 100;

export default function EntradaEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert, showLoading, closeAlert } = useAlert();
  
  const [formDados, setFormDados] = useState({
    nome: '', observacoes: ''
  });

  const gerarLinhaVazia = () => ({
    id: `linha-vazia-${Date.now()}-${Math.random()}`, 
    desenhoSAP: '', 
    fabricante: '', 
    numPecaFabricante: '', 
    fornecedor: '', 
    referencia: '', 
    qtdFornecida: 1, 
    nfEntrada: '', 
    unidadeMedida: 'Unid', 
    vendorDescription: '', 
    wbsElement: '', 
    nomeProjeto: '', 
    emissaoNF: '', 
    recebNF: '', 
    docCompras: '', 
    poNetPrice: '', 
    centro: '', 
    deposito: '', 
    alocacao: ''
  });

  const [itens, setItens] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [crossdockingsPendentes, setCrossdockingsPendentes] = useState([]);
  const processador = useProcessadorExcel();

  const buscarCrossdockingsPendentes = async () => {
    try {
      const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
      const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=1000`);
      
      if (resultado.sucesso && Array.isArray(resultado.dados)) {
        const pendentes = resultado.dados.filter(sol => sol.tipo === 'Crossdocking' && sol.status === 'Pendente');
        setCrossdockingsPendentes(pendentes);
      }
    } catch (error) {
      console.error("Erro ao buscar solicitações de Crossdocking:", error);
    }
  };

  useEffect(() => {
    if (estoqueAtual) {
      buscarCrossdockingsPendentes();
    }
  }, [estoqueAtual]);

  const handleImportarExcel = async (arquivo) => {
    try {
      showLoading("Processando Excel", "Localizando aba e colunas de entrada...");
      
      const workbook = new ExcelJS.Workbook();
      const buffer = await arquivo.arrayBuffer();
      await workbook.xlsx.load(buffer);
      
      const novosItensFormatados = [];
      let headerRowIndex = -1;
      let mapColunas = {};
      let worksheetParaLer = null;

      workbook.worksheets.forEach(worksheet => {
        if (worksheetParaLer) return; 

        worksheet.eachRow((row, rowNumber) => {
          if (worksheetParaLer) return; 
          if (rowNumber > 30) return; 

          const tempMap = {};
          row.eachCell((cell, colNumber) => {
            let val = cell.value;
            if (val && typeof val === 'object' && val.richText) {
              val = val.richText.map(rt => rt.text).join('');
            }
            const valStr = String(val || '').trim().toUpperCase();
            if (valStr) tempMap[valStr] = colNumber;
          });

          const temCabecalho = Object.keys(tempMap).some(k => 
            k.includes('DESCRIÇÃO') || k.includes('DESCRICAO') || 
            k.includes('CÓDIGO') || k.includes('CODIGO') || 
            k.includes('SAP') || k.includes('PART NUMBER') || 
            k.includes('FABRICANTE') || k.includes('QTDE ENTRADA')
          );

          if (temCabecalho) {
            headerRowIndex = rowNumber; 
            mapColunas = tempMap;        
            worksheetParaLer = worksheet;
          }
        });
      });

      if (!worksheetParaLer) {
        closeAlert();
        showAlert("Aba não encontrada", "Não foi possível encontrar a tabela de dados nas abas da planilha.", "error");
        return;
      }

      worksheetParaLer.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return; 

        const getVal = (colIndex) => {
          if (!colIndex) return '';
          const cell = row.getCell(colIndex);
          const val = cell.value;
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') {
            if (val.result !== undefined && val.result !== null) return String(val.result).trim();
            if (val.richText) return val.richText.map(rt => rt.text).join('').trim();
            if (val instanceof Date) return val.toISOString().split('T')[0];
          }
          return String(val).trim();
        };

        const puxarDado = (palavrasChave) => {
          const chavesReais = Object.keys(mapColunas);
          for (const palavra of palavrasChave) {
            const chaveEncontrada = chavesReais.find(k => k.includes(palavra));
            if (chaveEncontrada) {
              const numColuna = mapColunas[chaveEncontrada];
              const valor = getVal(numColuna);
              return valor === '-' ? '' : valor;
            }
          }
          return '';
        };

        const sap = puxarDado(['NUM SAP', 'DESENHO', 'SAP', 'CÓDIGO', 'CODIGO']);
        const desc = puxarDado(['DESCRIÇÃO', 'DESCRICAO', 'VENDOR']);
        const nomeFab = puxarDado(['FABRICANTE', 'MARCA', 'FABR']);
        const numPeca = puxarDado(['PEÇA', 'PART NUMBER', 'PN', 'REF. FABRICANTE']);
        const qtd = parseInt(puxarDado(['QTDE ENTRADA', 'QTD', 'QUANTIDADE']), 10) || 1;
        const ref = puxarDado(['REFERÊNCIA', 'REFERENCIA']);
        const unid = puxarDado(['UNID. MEDIDA', 'UNIDADE DE MEDIDA', 'UNID']) || 'Unid';
        const nf = puxarDado(['NUM DA NOTA FISCAL', 'NF DE ENTRADA', 'NFE ENTRADA', 'NOTA FISCAL']);
        const fornec = puxarDado(['FORNECEDOR', 'REGISTRO']);
        const wbs = puxarDado(['CENTRO DE CUSTO - WBS', 'WBS']);
        const projeto = puxarDado(['NOME CENTRO DE CUSTO', 'PROJETO']);
        const emissao = puxarDado(['EMISSÃO NF', 'EMISSAO', 'DATA EMISSÃO']);
        const receb = puxarDado(['RECEB. NF', 'RECEBIMENTO']);
        const docCompras = puxarDado(['PEDIDO DE COMPRA', 'CPV', 'COMPRAS']);
        const preco = puxarDado(['VLR. UNITÁRIO', 'VALOR UNITÁRIO', 'PO NET PRICE']);
        const filialPlanilha = puxarDado(['FILIAL', 'CENTRO']);
        const deposito = puxarDado(['DEPÓSITO', 'DEPOSITO', 'LOCAL ESTOQUE']);
        const alocacao = puxarDado(['ALOCAÇÃO', 'ALOCACAO']);

        const linhaValida = (nomeFab.length > 1) || (sap.length > 2 && desc.length > 3) || (numPeca.length > 2);

        if (linhaValida) {
          novosItensFormatados.push({
            id: `excel-${Date.now()}-${rowNumber}`,
            desenhoSAP: sap,                        
            vendorDescription: desc,                
            fabricante: nomeFab,                    
            numPecaFabricante: numPeca,             
            qtdFornecida: qtd,                 
            referencia: ref, 
            unidadeMedida: unid,                  
            nfEntrada: nf,                          
            fornecedor: fornec,                     
            wbsElement: wbs,                        
            nomeProjeto: projeto,                   
            emissaoNF: emissao,                     
            recebNF: receb,                         
            docCompras: docCompras,                 
            poNetPrice: preco,                      
            centro: filialPlanilha,                 
            deposito: deposito,                     
            alocacao: alocacao                      
          });
        }
      });

      closeAlert();

      setItens(prev => {
        const listaLimpa = prev.filter(i => (i.fabricante !== '' || i.desenhoSAP !== '' || i.vendorDescription !== ''));
        const novaLista = [...listaLimpa, ...novosItensFormatados];

        if (novaLista.length > LIMITE_LOGISTICA) {
          showAlert("Limite Excedido", `Importados os primeiros ${LIMITE_LOGISTICA} itens permitidos.`, "warning");
          return novaLista.slice(0, LIMITE_LOGISTICA);
        }

        return novaLista;
      });

    } catch (error) {
      console.error(error);
      showAlert("Erro de Leitura", "Falha ao processar o arquivo Excel.", "error");
    }
  };

  const adicionarLinhaEmBranco = () => {
    if (itens.length < LIMITE_LOGISTICA) {
      setItens([...itens, gerarLinhaVazia()]);
    } else {
      showAlert("Limite Atingido", `O limite máximo é de ${LIMITE_LOGISTICA} itens.`, "warning");
    }
  };

  const atualizarCampo = (id, campo, novoValor) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        let valorValidado = novoValor;
        if (campo === 'qtdFornecida') {
          if (novoValor === '') {
            valorValidado = ''; 
          } else {
            valorValidado = parseInt(novoValor, 10);
            if (isNaN(valorValidado) || valorValidado < 1) valorValidado = 1;
          }
        }
        return { ...item, [campo]: valorValidado };
      }
      return item;
    }));
  };

  const handleAnexar = (arquivo) => setAnexos([...anexos, arquivo]);
  const removerAnexo = (indexRemover) => setAnexos(anexos.filter((_, index) => index !== indexRemover));
  const removerItem = (idParaRemover) => setItens(itens.filter(item => item.id !== idParaRemover));

  // Validação Estrita de Matching (NF, Fornecedor e Desenho SAP)
  const { idsLinhasCrossdocking, nfsUnicasEncontradas, solicitacoesIdentificadas } = useMemo(() => {
    const idsMarcados = new Set();
    const nfsEncontradas = new Set();
    const solicitacoesMap = new Map();

    itens.forEach(linhaTabela => {
      const nfTab = String(linhaTabela.nfEntrada || '').trim().toUpperCase();
      const sapTab = String(linhaTabela.desenhoSAP || '').trim().toUpperCase();
      const fornTabRaw = String(linhaTabela.fornecedor || '').trim().toUpperCase();

      if (!nfTab || !fornTabRaw) return;

      crossdockingsPendentes.forEach(cross => {
        const nfCross = String(cross.nfCrossdocking || '').trim().toUpperCase();
        
        let fornCrossRaw = '';
        if (cross.itens && cross.itens.length > 0 && cross.itens[0].fornecedor) {
          fornCrossRaw = String(cross.itens[0].fornecedor).trim().toUpperCase();
        }
        if (!fornCrossRaw && cross.observacoes) {
          const matchForn = cross.observacoes.match(/Fornecedor:\s*([^\]|\n]+)/i);
          if (matchForn) fornCrossRaw = matchForn[1].trim().toUpperCase();
        }

        // Validação estrita:
        // 1. NF idêntica
        // 2. O fornecedor cadastrado (já sanitizado como termo único) deve ser igual ao primeiro termo da linha
        const primeiroNomeTab = fornTabRaw.split(/\s+/)[0];
        const primeiroNomeCross = fornCrossRaw.split(/\s+/)[0];

        const bateuFornecedor = (fornTabRaw === fornCrossRaw) || (primeiroNomeTab === fornCrossRaw) || (primeiroNomeTab === primeiroNomeCross && fornCrossRaw.length <= primeiroNomeCross.length);

        if (nfTab === nfCross && bateuFornecedor) {
          const itensCross = cross.itens || [];
          const isParcial = itensCross.some(i => i.desenho_sap_manual && i.desenho_sap_manual !== '-');

          if (isParcial) {
            if (!sapTab) return;
            const bateuSap = itensCross.some(ic => {
              const sapCross = String(ic.desenho_sap_manual || ic.desenho_sap || ic.desenhoSAP || '').trim().toUpperCase();
              return sapCross && sapCross === sapTab;
            });

            if (bateuSap) {
              idsMarcados.add(linhaTabela.id);
              nfsEncontradas.add(nfTab);
              solicitacoesMap.set(cross.id, { ...cross, _modalidade: 'Parcial' });
            }
          } else {
            idsMarcados.add(linhaTabela.id);
            nfsEncontradas.add(nfTab);
            solicitacoesMap.set(cross.id, { ...cross, _modalidade: 'Total' });
          }
        }
      });
    });

    return { 
      idsLinhasCrossdocking: idsMarcados, 
      nfsUnicasEncontradas: Array.from(nfsEncontradas),
      solicitacoesIdentificadas: Array.from(solicitacoesMap.values())
    };
  }, [itens, crossdockingsPendentes]);

  const temCrossdockingAguardando = nfsUnicasEncontradas.length > 0;

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Ação Bloqueada", "Selecione uma filial física no topo da página antes de registrar a entrada.", "warning");
      return;
    }

    if (!formDados.nome) {
      showAlert("Campos Obrigatórios", "Preencha o Nome do operador.", "warning");
      return;
    }
    
    if (itens.length === 0) {
      showAlert("Lista Vazia", "Adicione ao menos um item à tabela para registrar a entrada.", "warning");
      return;
    }

    if (itens.some(i => !i.qtdFornecida || i.qtdFornecida === '' || Number(i.qtdFornecida) < 1)) {
      showAlert("Dados da Tabela", "Preencha o campo de Quantidade em todas as linhas (mínimo 1).", "warning");
      return;
    }

    try {
      showLoading("Registrando Entrada", "Persistindo entrada e validando deduções...");
      const anexosProcessados = [];
      if (anexos.length > 0) {
        let enviados;
        try {
          enviados = await enviarArquivos(anexos);
        } catch (erroUpload) {
          showAlert("Erro de Anexo", erroUpload.message || "Falha ao enviar os arquivos.", "error");
          return;
        }
        anexosProcessados.push(...enviados.map(anexo => ({ ...anexo, origem: 'logistica' })));
      }

      const payload = {
        solicitante: { 
          ...formDados, 
          tipo: 'Entrada', 
          filial_id: estoqueAtual 
        },
        itens: itens.map(item => ({
          desenho_sap: item.desenhoSAP || '-',
          part_number: item.numPecaFabricante || '-',
          fabricante: item.fabricante || null,
          fornecedor: item.fornecedor || null,
          referencia: item.referencia || null,
          qtd: parseInt(item.qtdFornecida, 10) || 1,
          unidade_medida: item.unidadeMedida || 'Unid',
          nf_entrada: item.nfEntrada || null,
          descricao: item.vendorDescription || 'Sem descrição',
          materialDescription: item.vendorDescription || 'Sem descrição',
          wbs_element: item.wbsElement || '-',
          nome_projeto: item.nomeProjeto || null,
          emissao_nf: item.emissaoNF || null,
          receb_nf: item.recebNF || null,
          documento_compras: item.docCompras || null,
          valor_unitario: item.poNetPrice || null,
          centro: item.centro || null,
          deposito: item.deposito || null,
          alocacao: item.alocacao || null
        })),
        anexos: anexosProcessados 
      };

      const dados = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps_id || dados.ps) {
        closeAlert();
        showAlert(
          "Operação Concluída!", 
          `Entrada registrada no galpão ${estoqueAtual}.\nNúmero de acompanhamento: ${dados.ps_id || dados.ps}${temCrossdockingAguardando ? '\n\nOs itens identificados como Crossdocking foram deduzidos e vinculados com sucesso.' : ''}`, 
          "success"
        );
        setFormDados({ nome: '', observacoes: '' }); 
        setItens([]);
        setAnexos([]);
        buscarCrossdockingsPendentes();
      } else {
        closeAlert();
        showAlert("Erro no Servidor", dados.erro, "error");
      }
    } catch (error) {
      closeAlert();
      showAlert("Erro de Conexão", `Falha de comunicação: ${error.message}`, "error");
    }
  };

  return (
    <div className="estoque-wrapper">
      <ModalProcessamento 
        estaProcessando={processador.estaProcessando} 
        concluido={processador.concluido} 
        estadoProgresso={processador.estadoProgresso} 
        resultado={processador.resultado} 
        erroFatal={processador.erroFatal} 
        onClose={processador.resetarProcessador} 
      />

      <header className="estoque-cabecalho">
        <h1>Entrada de Estoque</h1>
        <p>Cadastro detalhado de itens — Back-Office Logística</p>
      </header>

      <div className="estoque-cartao form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="icone-fundo-azul" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <User size={18} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#0f172a' }}>Operador Responsável</h2>
          </div>
        </div>
        
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>NOME *</label>
            <input 
              type="text" 
              className="input-campo" 
              placeholder="Seu nome completo" 
              value={formDados.nome} 
              onChange={(e) => setFormDados({...formDados, nome: e.target.value})} 
              style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }} 
            />
          </div>
          
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>OBSERVAÇÕES</label>
            <textarea 
              className="input-campo" 
              placeholder="Informações adicionais para a conferência..." 
              value={formDados.observacoes} 
              onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})} 
              style={{ minHeight: '42px', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* BANNER E CARDS DAS SOLICITAÇÕES RECONHECIDAS */}
      {temCrossdockingAguardando && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          backgroundColor: '#eff6ff', border: '1px solid #93c5fd',
          padding: '20px', borderRadius: '12px', marginBottom: '24px',
          color: '#1e3a8a', animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#dbeafe', padding: '10px', borderRadius: '50%', color: '#2563eb' }}>
              <Truck size={24} />
            </div>
            <div>
              <strong style={{ fontSize: '1.05rem', display: 'block', color: '#1e40af' }}>
                Crossdocking Identificado — NF: {nfsUnicasEncontradas.join(', ')}
              </strong>
              <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                Identificamos {solicitacoesIdentificadas.length} solicitação(ões) pendente(s) aguardando o recebimento desta carga.
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#ffffff', border: '1px solid #bfdbfe',
            padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: '#1d4ed8'
          }}>
            <Info size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Regra de Abatimento:</strong> As linhas com destaque azul na tabela abaixo não irão para o saldo de prateleira; serão baixadas e vinculadas à solicitação no momento do salvamento.
            </span>
          </div>

          {/* Cards das Solicitações Encontradas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.05em' }}>
              Solicitações Vinculadas Prontas para Baixa Automática:
            </span>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
              {solicitacoesIdentificadas.map(sol => (
                <div 
                  key={sol.id} 
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                        {sol.ps}
                      </span>
                      {sol.pl && (
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                          {sol.pl}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      backgroundColor: sol._modalidade === 'Total' ? '#dcfce7' : '#fef9c3',
                      color: sol._modalidade === 'Total' ? '#15803d' : '#a16207',
                      border: `1px solid ${sol._modalidade === 'Total' ? '#bbf7d0' : '#fef08a'}`
                    }}>
                      Crossdocking {sol._modalidade}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>SOLICITANTE</span>
                      <strong style={{ color: '#1e293b' }}>{sol.solicitante || sol.nome_solicitante || 'Não informado'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>WBS / DESTINO</span>
                      <strong style={{ color: '#1e293b' }}>{sol.wbs || sol.wbs_destino || sol.destino || '—'}</strong>
                    </div>
                  </div>

                  {sol.itens && sol.itens.length > 0 && (
                    <div style={{ marginTop: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Itens Cadastrados no Pedido:
                      </span>
                      <div style={{ maxHeight: '90px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sol.itens.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: '600' }}>
                              {it.desenho_sap_manual && it.desenho_sap_manual !== '-' ? it.desenho_sap_manual : 'TODA A NOTA (TOTAL)'}
                            </span>
                            <span style={{ color: '#334155', fontWeight: '700' }}>
                              Qtd: {it.quantidade_solicitada || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TabelaInsercaoItens 
        itens={itens}
        limiteLinhas={LIMITE_LOGISTICA} 
        linhasDestacadas={idsLinhasCrossdocking} 
        onAtualizarCampo={atualizarCampo}
        onRemoverItem={removerItem}
        onAdicionarLinha={adicionarLinhaEmBranco}
        onImportarExcel={handleImportarExcel}
      />

      <div className="form-cartao" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginTop: '24px' }}>
        <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>ANEXOS (OPCIONAL - Notas Fiscais, Manuais, Fotos)</label>
          <div style={{ marginTop: '8px' }}>
            <CarregarArquivo variante="botao" accept=".pdf, .jpg, .png, .xlsx" label="Anexar Arquivo" icone={<Paperclip size={16} />} onFileSelect={handleAnexar} />
          </div>
          {anexos.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {anexos.map((arquivo, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: 'fit-content', minWidth: '300px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{arquivo.name}</span>
                  <button onClick={() => removerAnexo(index)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BotaoAcaoGlobal texto="Registrar Entrada" icone={<Send size={16} />} cor="verde" onClick={handleEnviar} />
    </div>
  );
}
