import React, { useState, useEffect, useContext } from 'react';
import { Package, Truck, User, Paperclip, Send, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';

// ✨ IMPORTAÇÃO DO CSS CORRIGIDA! Agora usa o seu próprio ficheiro CSS
import './EntradaEstoque.css';

import CarregarArquivo from '../../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../../hooks/useProcessadorExcel';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import TabelaInsercaoItens from '../../../components/TabelaInsercaoItens/TabelaInsercaoItens'; 
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch, enviarArquivos } from '../../../services/api';

const LIMITE_LOGISTICA = 60;

export default function EntradaEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert, showLoading, closeAlert } = useAlert();
  
  const [formDados, setFormDados] = useState({
    nome: '', observacoes: ''
  });

  const gerarLinhaVazia = () => ({
    id: `linha-vazia-${Date.now()}-${Math.random()}`, 
    desenhoSAP: '', 
    fabricante: '', // NOVO CAMPO
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
  
  const [nfsCrossdocking, setNfsCrossdocking] = useState([]);
  const processador = useProcessadorExcel();

  useEffect(() => {
    const buscarCrossdockingsPendentes = async () => {
      try {
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=1000`);
        
        if (resultado.sucesso && Array.isArray(resultado.dados)) {
          const nfsAguardadas = resultado.dados
            .filter(sol => sol.tipo === 'Crossdocking' && sol.status === 'Pendente')
            .map(sol => sol.nfCrossdocking)
            .filter(nf => nf !== null && nf !== undefined && nf !== ''); 
            
          setNfsCrossdocking(nfsAguardadas);
        }
      } catch (error) {
        console.error("Erro ao buscar as solicitações de Crossdocking:", error);
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
        showAlert("Aba não encontrada", "Não foi possível encontrar a tabela de dados em nenhuma das abas da planilha. Verifique o ficheiro.", "error");
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
          showAlert("Limite de Linhas Excedido", `A planilha contém mais itens do que o limite permitido. Foram importados os primeiros ${LIMITE_LOGISTICA} itens (de um total detetado de ${novaLista.length}).`, "warning");
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
  
  const removerItem = (idParaRemover) => {
    setItens(itens.filter(item => item.id !== idParaRemover));
  };

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

    // ✨ CORRIGIDO: Removida a verificação obrigatória de 'numPecaFabricante'
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

        anexosProcessados.push(...enviados.map((anexo) => ({ ...anexo, origem: 'logistica' })));
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
          fabricante: item.fabricante || null, // ✨ ENVIO DO FABRICANTE
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
        method: '
