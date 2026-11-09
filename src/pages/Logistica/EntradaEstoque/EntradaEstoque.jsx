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
          showAlert("Limite de Linhas Excedido", `Foram importados os primeiros ${LIMITE_LOGISTICA} itens permitidos.`, "warning");
          return novaLista.slice(0, LIMITE_LOGISTICA);
        }

        return novaLista;
      });

    } catch (error) {
      console.error(error);
      showAlert("Erro de Leitura", "Falha ao ler o ficheiro Excel. Verifique se o documento está corrompido.", "error");
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

  // ✨ MAPEAMENTO DE MATCHING RIGOROSO: Impede falsos positivos em nomes compostos
  const { idsLinhasCrossdocking, nfsUnicasEncontradas } = useMemo(() => {
    const idsMarcados = new Set();
    const nfsEncontradas = new Set();

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

        const fornCrossEsperado = fornCrossRaw.split(/\s+/)[0];
        if (!fornCrossEsperado) return;

        const primeiroFornLinha = fornTabRaw.split(/\s+/)[0];
        const bateuFornecedor = (fornTabRaw === fornCrossEsperado) || 
                                (primeiroFornLinha === fornCrossEsperado && fornCrossRaw.startsWith(fornTabRaw));

        if (nfTab === nfCross && bateuFornecedor) {
          const obs = String(cross.observacoes || '');
          const isParcial = /sa[íi]da\s+parcial/i.test(obs) || (cross.itens && cross.itens.length > 0 && cross.itens.some(i => i.desenho_sap_manual && i.desenho_sap_manual !== '-'));

          if (isParcial) {
            if (!sapTab) return;
            const itensCross = cross.itens || [];
            const bateuSap = itensCross.some(ic => {
              const sapCross = String(ic.desenho_sap_manual || ic.desenho_sap || ic.desenhoSAP || '').trim().toUpperCase();
              return sapCross && sapCross === sapTab;
            });

            if (bateuSap) {
              idsMarcados.add(linhaTabela.id);
              nfsEncontradas.add(nfTab);
            }
          } else {
            idsMarcados.add(linhaTabela.id);
            nfsEncontradas.add(nfTab);
          }
        }
      });
    });

    return { 
      idsLinhasCrossdocking: idsMarcados, 
      nfsUnicasEncontradas: Array.from(nfsEncontradas) 
    };
  }, [itens, crossdockingsPendentes]);

  const temCrossdockingAguardando = nfsUnicasEncontradas.length > 0;

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Ação Bloqueada", "Por favor, selecione uma filial específica no topo da página antes de registar a entrada.", "warning");
      return;
    }

    if (!formDados.nome) {
      showAlert("Campos Obrigatórios", "Preencha o Nome do operador.", "warning");
      return;
    }
    
    if (itens.length === 0) {
      showAlert("Lista Vazia", "Adicione pelo menos um item à tabela para registar a entrada.", "warning");
      return;
    }

    if (itens.some(i => !i.qtdFornecida || i.qtdFornecida === '' || Number(i.qtdFornecida) < 1)) {
      showAlert("Dados da Tabela", "Preencha o campo de Quantidade em todas as linhas. A quantidade deve ser no mínimo 1.", "warning");
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

        anexosProcessados.push(...enviados.map(anexo => ({ ...anexo, origem: 'logistica' })));
      }

      // Payload completo preservando 100% dos dados para o backend
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
        showAlert("Operação Concluída!", `Entrada registrada automaticamente no galpão ${estoqueAtual}.\nNúmero de acompanhamento: ${dados.ps_id || dados.ps}`, "success");
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
      showAlert("Erro de Conexão", `Falha ao conectar com o servidor. Motivo: ${error.message}`, "error");
    }
  };

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
          display: 'flex', flexDirection: 'column', gap: '12px',
          backgroundColor: '#eff6ff', border: '1px solid #93c5fd',
          padding: '16px 20px', borderRadius: '12px', marginBottom: '24px',
          color: '#1e3a8a', animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#dbeafe', padding: '8px', borderRadius: '50%', color: '#2563eb' }}>
              <Truck size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem', display: 'block', color: '#1e40af' }}>
                Crossdocking Identificado (NF: {nfsUnicasEncontradas.join(', ')})
              </strong>
              <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                Detectamos solicitações pendentes associadas a estes itens.
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#ffffff', border: '1px solid #bfdbfe',
            padding: '10px 14px', borderRadius: '8px', fontSize: '0.825rem', color: '#1d4ed8'
          }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Atenção:</strong> Apenas as linhas <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>destacadas em azul</span> na tabela abaixo correspondem aos materiais exatos que serão deduzidos pelo Crossdocking. As demais linhas entrarão normalmente no estoque.
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
