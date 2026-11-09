import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Package, Truck, User, Paperclip, Send, FileSpreadsheet, X, Info, Eye, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
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
import { normalizarString } from '../../../utils/formatadores';

const LIMITE_LOGISTICA = 100;

export default function EntradaEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert, showLoading, closeAlert } = useAlert();
  
  const [formDados, setFormDados] = useState({
    nome: '', observacoes: ''
  });

  const gerarLinhaVazia = () => ({
    id: `linha-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
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
    centro: estoqueAtual !== 'TODOS' ? estoqueAtual : '', 
    deposito: '', 
    alocacao: ''
  });

  const [itens, setItens] = useState(() => [gerarLinhaVazia()]);
  const [anexos, setAnexos] = useState([]);
  
  const [crossdockingsPendentes, setCrossdockingsPendentes] = useState([]);
  const [solicitacaoAbertaId, setSolicitacaoAbertaId] = useState(null);
  const processador = useProcessadorExcel();

  useEffect(() => {
    const buscarCrossdockingsPendentes = async () => {
      try {
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=1000`);
        
        if (resultado && resultado.sucesso && Array.isArray(resultado.dados)) {
          const pendentes = resultado.dados.filter(sol => sol.tipo === 'Crossdocking' && sol.status === 'Pendente');
          setCrossdockingsPendentes(pendentes);
        }
      } catch (error) {
        console.error("Erro ao buscar Crossdockings pendentes:", error);
      }
    };

    if (estoqueAtual) {
      buscarCrossdockingsPendentes();
    }
  }, [estoqueAtual]);

  const handleImportarExcel = async (arquivo) => {
    try {
      showLoading("Processando Excel", "A procurar a aba e as colunas corretas. Por favor, aguarde...");
      
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
        const qtd = parseInt(puxarDado(['QTDE ENTRADA', 'QTD', 'QUANTIDADE'])) || 1;
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
        const filialPlanilha = puxarDado(['FILIAL', 'CENTRO']) || (estoqueAtual !== 'TODOS' ? estoqueAtual : '');
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
        const listaLimpa = prev.filter(i => (i.fabricante !== '' || i.desenhoSAP !== '' || i.vendorDescription !== '' || i.nfEntrada !== ''));
        const novaLista = [...listaLimpa, ...novosItensFormatados];

        if (novaLista.length > LIMITE_LOGISTICA) {
          showAlert("Limite de Linhas Excedido", `Foram importados os primeiros ${LIMITE_LOGISTICA} itens permitidos.`, "warning");
          return novaLista.slice(0, LIMITE_LOGISTICA);
        }

        return novaLista.length > 0 ? novaLista : [gerarLinhaVazia()];
      });

    } catch (error) {
      console.error(error);
      showAlert("Erro de Leitura", "Falha ao ler o ficheiro Excel.", "error");
    }
  };

  const adicionarLinhaEmBranco = () => {
    if (itens.length < LIMITE_LOGISTICA) {
      setItens(prev => [...prev, gerarLinhaVazia()]);
    } else {
      showAlert("Limite Atingido", `O limite máximo é de ${LIMITE_LOGISTICA} itens.`, "warning");
    }
  };

  const atualizarCampo = (id, campo, novoValor) => {
    setItens(prevItens => prevItens.map(item => {
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
  
  const removerItem = (idParaRemover) => {
    setItens(prevItens => {
      const restantes = prevItens.filter(item => item.id !== idParaRemover);
      return restantes.length > 0 ? restantes : [gerarLinhaVazia()];
    });
  };

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Ação Bloqueada", "Por favor, selecione uma filial específica no topo da página antes de registar a entrada.", "warning");
      return;
    }

    if (!formDados.nome || formDados.nome.trim() === '') {
      showAlert("Campos Obrigatórios", "Preencha o Nome do operador.", "warning");
      return;
    }

    const itensValidos = itens.filter(i => 
      (i.desenhoSAP && i.desenhoSAP.trim() !== '') || 
      (i.vendorDescription && i.vendorDescription.trim() !== '') || 
      (i.fabricante && i.fabricante.trim() !== '') ||
      (i.nfEntrada && i.nfEntrada.trim() !== '')
    );
    
    if (itensValidos.length === 0) {
      showAlert("Lista Vazia", "Preencha ao menos uma linha da tabela para registrar a entrada.", "warning");
      return;
    }

    if (itensValidos.some(i => !i.qtdFornecida || i.qtdFornecida === '' || Number(i.qtdFornecida) < 1)) {
      showAlert("Dados da Tabela", "Preencha a Quantidade corretamente em todas as linhas preenchidas (mínimo 1).", "warning");
      return;
    }

    try {
      showLoading("Registar Entrada", "A gravar dados no sistema...");
      const anexosProcessados = [];
      if (anexos.length > 0) {
        let enviados;
        try {
          enviados = await enviarArquivos(anexos);
        } catch (erroUpload) {
          showAlert("Erro de Anexo", erroUpload.message || "Falha ao anexar os ficheiros.", "error");
          return;
        }

        anexosProcessados.push(...enviados.map((anexo) => ({ ...anexo, origem: 'logistica' })));
      }

      const payload = {
        solicitante: { 
          ...formDados, 
          tipo: 'Entrada', 
          filial_id: estoqueAtual 
        },
        itens: itensValidos.map(item => ({
          desenho_sap: normalizarString(item.desenhoSAP) || '-',
          part_number: normalizarString(item.numPecaFabricante) || '-',
          fabricante: item.fabricante || null,
          fornecedor: normalizarString(item.fornecedor) || null,
          referencia: item.referencia || null,
          qtd: parseInt(item.qtdFornecida, 10) || 1,
          unidade_medida: item.unidadeMedida || 'Unid',
          nf_entrada: normalizarString(item.nfEntrada) || null,
          descricao: item.vendorDescription || 'Sem descrição',
          materialDescription: item.vendorDescription || 'Sem descrição',
          wbs_element: item.wbsElement || '-',
          nome_projeto: item.nomeProjeto || null,
          emissao_nf: item.emissaoNF || null,
          receb_nf: item.recebNF || null,
          documento_compras: item.docCompras || null,
          valor_unitario: item.poNetPrice || null,
          centro: item.centro || estoqueAtual,
          deposito: item.deposito || null,
          alocacao: item.alocacao || null
        })),
        anexos: anexosProcessados 
      };

      const dados = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados && (dados.sucesso || dados.ps_id || dados.ps)) {
        closeAlert();
        showAlert("Operação Concluída!", `Entrada registrada automaticamente no galpão ${estoqueAtual}.\nNúmero de acompanhamento: ${dados.ps_id || dados.ps}`, "success");
        setFormDados({ nome: '', observacoes: '' }); 
        setItens([gerarLinhaVazia()]);
        setAnexos([]);
      } else {
        closeAlert();
        showAlert("Erro no Servidor", dados?.erro || "Falha ao gravar entrada.", "error");
      }
    } catch (error) {
      closeAlert();
      showAlert("Erro de Conexão", `Falha ao conectar com o servidor. Motivo: ${error.message}`, "error");
    }
  };

  // ✨ MATCH VISUAL REFORÇADO (O CORAÇÃO DA SOLUÇÃO DO PROBLEMA 1)
  const { idsLinhasCrossdocking, solicitacoesCrossEncontradas } = useMemo(() => {
    const idsMarcados = new Set();
    const mapSolicitacoes = new Map();

    itens.forEach(linhaTabela => {
      const nfTab = normalizarString(linhaTabela.nfEntrada);
      const sapTab = normalizarString(linhaTabela.desenhoSAP);
      const fornTab = normalizarString(linhaTabela.fornecedor);

      if (!nfTab || !fornTab) return;

      crossdockingsPendentes.forEach(cross => {
        const nfCross = normalizarString(cross.nfCrossdocking);
        
        let fornCross = '';
        if (cross.itens && cross.itens.length > 0 && cross.itens[0].fornecedor) {
          fornCross = normalizarString(cross.itens[0].fornecedor);
        }
        if (!fornCross && cross.observacoes) {
          const matchForn = cross.observacoes.match(/Fornecedor:\s*([^\]|\n]+)/i);
          if (matchForn) fornCross = normalizarString(matchForn[1]);
        }

        // Se bater NF e Fornecedor
        if (nfTab === nfCross && fornTab === fornCross) {
          const obs = String(cross.observacoes || '');
          const isParcial = /sa[íi]da\s+parcial/i.test(obs) || (cross.itens && cross.itens.length > 0 && !/sa[íi]da\s+total/i.test(obs));

          if (isParcial) {
            if (!sapTab) return;
            const itensCross = cross.itens || [];
            
            // Só pinta de azul se a linha bater com um SAP solicitado
            const bateuSap = itensCross.some(ic => {
              const sapCross = normalizarString(ic.desenho_sap_manual || ic.desenho_sap || ic.desenhoSAP);
              return sapCross && sapCross === sapTab;
            });

            if (bateuSap) {
              idsMarcados.add(linhaTabela.id);
              mapSolicitacoes.set(cross.id, { ...cross, fornecedorIdentificado: fornCross, isParcial: true });
            }
          } else {
            // Se for Total, aprova tudo o que partilhar a mesma NF e Fornecedor
            idsMarcados.add(linhaTabela.id);
            mapSolicitacoes.set(cross.id, { ...cross, fornecedorIdentificado: fornCross, isParcial: false });
          }
        }
      });
    });

    return { 
      idsLinhasCrossdocking: idsMarcados, 
      solicitacoesCrossEncontradas: Array.from(mapSolicitacoes.values()) 
    };
  }, [itens, crossdockingsPendentes]);

  const temCrossdockingAguardando = solicitacoesCrossEncontradas.length > 0;

  return (
    <div className="estoque-wrapper">
      <ModalProcessamento estaProcessando={processador.estaProcessando} concluido={processador.concluido} estadoProgresso={processador.estadoProgresso} resultado={processador.resultado} erroFatal={processador.erroFatal} onClose={processador.resetarProcessador} />

      <header className="estoque-cabecalho">
        <h1>Entrada de Estoque</h1>
        <p>Cadastro detalhado de itens — Back-Office Logística</p>
      </header>

      <div className="estoque-cartao form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="icone-fundo-azul" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb' }}><User size={18} /></div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#0f172a' }}>Operador Responsável</h2>
          </div>
        </div>
        
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>NOME *</label>
            <input type="text" className="input-campo" placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }} />
          </div>
          
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>OBSERVAÇÕES</label>
            <textarea className="input-campo" placeholder="Informações adicionais para a conferência..." value={formDados.observacoes} onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})} style={{ minHeight: '42px', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', resize: 'vertical' }}></textarea>
          </div>
        </div>
      </div>

      {temCrossdockingAguardando && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '14px',
          backgroundColor: '#eff6ff', border: '1px solid #93c5fd',
          padding: '18px 22px', borderRadius: '12px', marginBottom: '24px',
          color: '#1e3a8a', animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: '#dbeafe', padding: '10px', borderRadius: '50%', color: '#2563eb' }}>
                <Truck size={24} />
              </div>
              <div>
                <strong style={{ fontSize: '1.05rem', display: 'block', color: '#1e40af' }}>
                  {solicitacoesCrossEncontradas.length} Solicitação(ões) de Crossdocking Reconhecida(s)
                </strong>
                <span style={{ fontSize: '0.825rem', color: '#475569' }}>
                  Os materiais abaixo coincidiram rigorosamente com NF, Fornecedor e Desenho SAP.
                </span>
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#dbeafe', color: '#1d4ed8',
              padding: '6px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700'
            }}>
              <Info size={14} />
              Dedução Automática na Entrada
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            {solicitacoesCrossEncontradas.map(cross => {
              const estaExpandida = solicitacaoAbertaId === cross.id;

              return (
                <div 
                  key={cross.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(37,99,235,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        backgroundColor: '#1e40af', color: '#ffffff',
                        fontFamily: 'monospace', fontWeight: '700', fontSize: '0.85rem',
                        padding: '3px 8px', borderRadius: '6px'
                      }}>
                        {cross.ps}
                      </span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '700',
                        backgroundColor: cross.isParcial ? '#fef3c7' : '#dcfce7',
                        color: cross.isParcial ? '#b45309' : '#15803d',
                        padding: '2px 8px', borderRadius: '4px', border: `1px solid ${cross.isParcial ? '#fde68a' : '#bbf7d0'}`
                      }}>
                        {cross.isParcial ? 'Saída Parcial' : 'Saída Total'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSolicitacaoAbertaId(estaExpandida ? null : cross.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px',
                        padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600', color: '#2563eb',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={14} />
                      {estaExpandida ? 'Ocultar Itens' : 'Ver Solicitação'}
                      {estaExpandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '10px', fontSize: '0.80rem', color: '#334155' }}>
                    <div><strong>Solicitante:</strong> {cross.solicitante || cross.nome_solicitante || '-'}</div>
                    <div><strong>Fornecedor:</strong> {cross.fornecedorIdentificado || '-'}</div>
                    <div><strong>NF:</strong> {cross.nfCrossdocking || '-'}</div>
                    <div><strong>Destino:</strong> {cross.destino || '-'}</div>
                    <div><strong>WBS:</strong> {cross.wbs || cross.wbs_destino || '-'}</div>
                  </div>

                  {estaExpandida && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                        Itens Cadastrados no Pedido de Crossdocking:
                      </span>

                      {cross.itens && cross.itens.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                                <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>SAP</th>
                                <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Descrição</th>
                                <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Qtd Solicitada</th>
                                <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>Unid</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cross.itens.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: '700', color: '#2563eb' }}>
                                    {it.desenho_sap_manual || it.desenho_sap || it.desenhoSAP || '-'}
                                  </td>
                                  <td style={{ padding: '6px 10px', color: '#334155' }}>
                                    {it.descricao_manual || it.descricao || it.vendorDescription || '-'}
                                  </td>
                                  <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '700', color: '#16a34a' }}>
                                    {it.quantidade_solicitada || 1}
                                  </td>
                                  <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                    {it.unidade_medida_manual || it.unidadeMedida || 'Unid'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                          Saída Total: Todos os itens correspondentes a esta NF e Fornecedor serão transferidos.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#ffffff', border: '1px solid #bfdbfe',
            padding: '8px 12px', borderRadius: '6px', fontSize: '0.80rem', color: '#1d4ed8', marginTop: '4px'
          }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Identificação Visual:</strong> As linhas marcadas com fundo azul e o selo <strong>CROSS</strong> na tabela abaixo são as que serão deduzidas na saída.
            </span>
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
