// =================================================================
// ARQUIVO: src/pages/Cliente/AcompanhamentoSolicitacoes/AcompanhamentoSolicitacoes.jsx
// =================================================================
import React, { useState, useEffect, useContext, useMemo, useRef } from "react"; // ✨ useRef adicionado
import { useNavigate } from "react-router-dom";
import "./AcompanhamentoSolicitacoes.css";
import {
  Search, ChevronRight, ChevronLeft, GitBranch, FileText,
  RefreshCw, CheckCircle2, XCircle, Zap, Upload, AlertCircle, MapPin, Filter, Check, X
} from "lucide-react";

import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import DetalhesSolicitacao from "./Detalhes/DetalhesSolicitacao";
import GerenciadorAnexos from "../../../components/GerenciadorAnexos/GerenciadorAnexos";
import BotaoGerarPDF from "../../../components/BotaoGerarPDF/BotaoGerarPDF";
import ScrollDuplo from "../../../components/ScrollDuplo/ScrollDuplo";
import { apiFetch, urlDoServidor, enviarArquivos } from '../../../services/api';
import { io } from 'socket.io-client';

import FiltroSolicitacoesModal from "../../../components/FiltroSolicitacoesModal/FiltroSolicitacoesModal";

const renderBadgeStatus = (status) => {
  switch (status) {
    case "Pendente":
    case "Em Separação":
    case "Em Andamento":
      return <span className="badge-status status-separacao"><RefreshCw size={14} className="animate-spin" /> {status}</span>;
    case "Concluído":
    case "Reintegrado":
      return <span className="badge-status status-concluido"><CheckCircle2 size={14} /> {status}</span>;
    case "Cancelado":
    case "Recusado":
      return <span className="badge-status status-cancelado"><XCircle size={14} /> {status}</span>;
    default:
      return <span className="badge-status">{status}</span>;
  }
};

const obterClasseBadgeTipo = (tipo) => {
  switch (tipo) {
    case "Transfer. WBS":
    case "Transferencia WBS": return "badge-tipo-amarelo";
    case "Nota Fiscal": return "badge-tipo-roxo";
    case "Entrada": return "badge-tipo-verde";
    case "Crossdocking": return "badge-tipo-ciano";
    case "Reintegração":
    case "Reintegracao": return "badge-tipo-laranja";
    case "Cancelado": return "badge-tipo-vermelho";
    case "Material":
    default: return "badge-tipo-azul";
  }
};

const converterParaInputDateTime = (dataString) => {
  if (!dataString || dataString === '-' || dataString === '—' || dataString === 'Disponível') return '';
  const partes = dataString.split(' ');
  if (partes[0].includes('/')) {
    const [dia, mes, ano] = partes[0].split('/');
    let hora = '00:00';
    if (partes.length >= 3 && partes[2].includes(':')) hora = partes[2]; 
    else if (partes.length === 2 && partes[1].includes(':')) hora = partes[1]; 
    return `${ano}-${mes}-${dia}T${hora}`;
  }
  return '';
};

const obterValorSeguroNumero = (valItem, valEstoque) => {
  const processarNumero = (valor) => {
    if (valor === undefined || valor === null || valor === '-' || valor === '') return 0;
    let limpo = String(valor).replace(/[^\d.,-]/g, '');
    if (limpo.includes('.') && limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');
    else if (limpo.includes(',')) limpo = limpo.replace(',', '.');
    const numeroFinal = parseFloat(limpo);
    return isNaN(numeroFinal) ? 0 : numeroFinal;
  };
  const num1 = processarNumero(valItem);
  if (num1 > 0) return num1;
  const num2 = processarNumero(valEstoque);
  if (num2 > 0) return num2;
  return 0;
};

const obterValorSeguroTexto = (valItem, valEstoque) => {
  const validar = (v) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== 'null';
  if (validar(valItem)) return valItem;
  if (validar(valEstoque)) return valEstoque;
  return '-';
};

export default function AcompanhamentoSolicitacoes({ perfil = "cliente" }) {
  const { estoqueAtual, carregandoInicial, filiaisGlobais } = useContext(AuthContext);
  const { showAlert, showConfirm, showLoading, closeAlert } = useAlert();
  const navigate = useNavigate();

  const obterNomeFilialDinamico = (codigo) => {
    if (!codigo) return 'N/D';
    if (codigo === 'TODOS') return 'Todas as Filiais';
    const filial = filiaisGlobais.find(f => f.id === codigo);
    return filial ? filial.nome : codigo;
  };

  useEffect(() => {
    if (!carregandoInicial) {
      if (perfil === 'cliente' && estoqueAtual === 'TODOS') {
        showAlert("Ação Restrita", "Para visualizar o acompanhamento, selecione uma filial específica no topo da página.", "warning");
        navigate('/cliente/consulta-estoque');
      }
    }
  }, [estoqueAtual, perfil, navigate, showAlert, carregandoInicial]);

  const [dadosTabela, setDadosTabela] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [anexosNovos, setAnexosNovos] = useState([]);

  // ✨ Estados para o Debounce da Pesquisa
  const [termoPesquisaInput, setTermoPesquisaInput] = useState("");
  const [termoPesquisaFiltro, setTermoPesquisaFiltro] = useState("");

  useEffect(() => {
    const atraso = setTimeout(() => {
      setTermoPesquisaFiltro(termoPesquisaInput);
    }, 350);
    return () => clearTimeout(atraso);
  }, [termoPesquisaInput]);

  const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    tipo: '', id: '', solicitante: '', wbs: '', sap: '', nf: '', pl: '', filial: '', destino: '', statusExibicao: ''
  });

  const [editandoDataId, setEditandoDataId] = useState(null);
  const [dataTemporaria, setDataTemporaria] = useState("");

  let usuarioLogado = {};
  try {
    const dadosUsuario = localStorage.getItem('@NexusLog:usuario');
    if (dadosUsuario && dadosUsuario !== 'undefined') {
      usuarioLogado = JSON.parse(dadosUsuario);
    }
  } catch (erro) { }

  const isOperador = String(usuarioLogado.cargo || '').toLowerCase().trim().includes('operador');
  const listaFiltros = ["Todos", "Material", "Transfer. WBS", "Nota Fiscal", "Entrada", "Crossdocking", "Reintegração"];

  const mapEstoque = useMemo(() => {
    const map = {};
    estoque.forEach(e => { map[e.id] = e; });
    return map;
  }, [estoque]);

  useEffect(() => {
    if (perfil === 'cliente' && estoqueAtual === 'TODOS') return;

    const buscarDados = async () => {
      try {
        setCarregando(true);
        const urlSolicitacoes = `/solicitacoes/listar?limit=1000&filial=${estoqueAtual}`;

        const [resultadoSol, resultadoEst] = await Promise.all([
          apiFetch(urlSolicitacoes),
          apiFetch("/estoque/listar?rastreabilidade=true")
        ]);

        if (resultadoEst.sucesso) {
          setEstoque(resultadoEst.dados);
        }

        if (resultadoSol.sucesso) {
          const dicionarioEstoque = {};
          if (resultadoEst.sucesso && resultadoEst.dados) {
            resultadoEst.dados.forEach(itemFisico => {
              dicionarioEstoque[itemFisico.id] = itemFisico;
            });
          }

          const reints = resultadoSol.dados.filter(sol =>
            (sol.tipo === 'Reintegracao' || sol.tipo === 'Reintegração') &&
            (sol.status === 'Em Separação' || sol.status === 'Concluído')
          );
          
          const qtdJaDevolvidaGlobal = {};
          reints.forEach(reint => {
            if (reint.observacoes) {
               const match = reint.observacoes.match(/PL #(\d+)/);
               if (match) {
                 const plKey = `PL #${match[1]}`;
                 if (!qtdJaDevolvidaGlobal[plKey]) qtdJaDevolvidaGlobal[plKey] = {};
                 
                 (reint.itens || []).forEach(it => {
                   qtdJaDevolvidaGlobal[plKey][it.estoque_id] = (qtdJaDevolvidaGlobal[plKey][it.estoque_id] || 0) + Number(it.quantidade_solicitada || 0);
                 });
               }
            }
          });

          const idsCanceladosSet = new Set();
          resultadoSol.dados.forEach(sol => {
            if (sol.tipo === 'Cancelado' && sol.status !== 'Recusado' && sol.observacoes) {
              const matches = sol.observacoes.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
              if (matches) idsCanceladosSet.add(matches[0]);
            }
          });

          const dadosFormatados = resultadoSol.dados.map((item) => {
            let acaoTipo = "select";
            let acaoValor = item.status;
            let statusDestinoAprovacao = item.tipo === "Entrada" ? "Concluído" : "Em Separação";

            if (item.status === "Pendente") {
              acaoTipo = "botao";
              acaoValor = "Aprovar";
            } else if (item.status === "Em Separação" || item.status === "Em Andamento") {
              acaoValor = "Em Separação";
            }

            let numeroPL = "-";
            if (item.status !== "Pendente" && item.status !== "Cancelado" && item.status !== "Recusado") {
              numeroPL = item.pl || item.bs || "-";
            }

            let statusFinalVisual = item.status;

            if (item.tipo !== 'Cancelado' && idsCanceladosSet.has(item.id)) {
              statusFinalVisual = 'Cancelado';
            }
            else if (item.tipo === 'Material' && (item.status === 'Em Separação' || item.status === 'Concluído') && numeroPL !== '-') {
              const devolucoesDestaPL = qtdJaDevolvidaGlobal[numeroPL] || {};
              const itensRestantes = (item.itens || []).filter(origItem => {
                const devolvido = devolucoesDestaPL[origItem.estoque_id] || 0;
                return (Number(origItem.quantidade_solicitada) - devolvido) > 0;
              });

              if (itensRestantes.length === 0 && (item.itens || []).length > 0) {
                statusFinalVisual = 'Reintegrado';
              }
            }

            const wbsProcura = item.wbs || '—';
            const destinoProcura = item.destino || 'Não informado';
            const idProcura = item.ps || item.id;
            const solicitanteProcura = item.solicitante || '';
            const textoBuscavel = `${idProcura} ${solicitanteProcura} ${wbsProcura} ${destinoProcura} ${numeroPL}`.toLowerCase();

            return {
              ...item,
              idOriginal: item.idOriginal || item.id,
              id: idProcura,
              statusExibicao: statusFinalVisual,
              statusDestinoAprovacao: statusDestinoAprovacao,
              acaoTipo: acaoTipo,
              acaoValor: acaoValor,
              dataSolicitacao: item.dataSolicitacao || "-",
              dataEntrega: item.dataEntrega || "-",
              pl: numeroPL,
              wbs: wbsProcura, 
              destino: destinoProcura,
              filial: item.filial_origem_id || item.filial || '-',
              textoBuscavel: textoBuscavel,
              itensRaw: item.itens || []
            };
          });

          setDadosTabela(dadosFormatados);
        } else {
          showAlert("Erro Operacional", resultadoSol.erro || 'Falha ao buscar dados.', "error");
        }
      } catch (error) {
        showAlert("Falha de Conexão", `Verifique se o servidor está ativo. Erro: ${error.message}`, "error");
      } finally {
        setCarregando(false);
      }
    };

    buscarDados();

    const SOCKET_URL = urlDoServidor();
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('solicitacoes_atualizadas', () => buscarDados());
    return () => socket.disconnect();
  }, [estoqueAtual, showAlert, perfil]);

  // =================================================================
  // ✨ LÓGICA MESTRA: SCROLL INFINITO & RENDERIZAÇÃO INCREMENTAL
  // =================================================================
  
  // Controla quantas linhas desenhar na memória de cada vez
  const [limiteExibicao, setLimiteExibicao] = useState(15);
  // Esta referência vai para a última linha invisível da tabela
  const observerTarget = useRef(null);

  // Sempre que os filtros mudam, resetamos o limite para 15 (para ser super rápido)
  useEffect(() => {
    setLimiteExibicao(15);
  }, [filtroAtivo, filtroStatus, termoPesquisaFiltro, filtrosAvancados]);

  // O Detetive que sabe quando o utilizador chegou ao fundo da tabela
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entradas) => {
        // Se a linha invisível aparecer no ecrã...
        if (entradas[0].isIntersecting) {
          // ... aumenta o número de itens desenhados em mais 15!
          setLimiteExibicao((limiteAtual) => limiteAtual + 15);
        }
      },
      { threshold: 0.1 } // Deteta logo que 10% da linha invisível aparece
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [dadosTabela]); // Atualiza o detetive se os dados mudarem


  const getItensEnriquecidos = (linha) => {
    if (!linha.itensRaw) return [];
    return linha.itensRaw.map(it => {
      const itemFisico = it.estoque_id ? mapEstoque[it.estoque_id] : null;
      return {
        ...it,
        desenho_sap_manual: obterValorSeguroTexto(it.desenho_sap_manual || it.desenho_sap, itemFisico?.desenho_sap),
        part_number_manual: obterValorSeguroTexto(it.part_number_manual || it.part_number, itemFisico?.part_number),
        descricao_manual: obterValorSeguroTexto(it.descricao_manual || it.descricao, itemFisico?.descricao),
        fabricante_enriquecido: obterValorSeguroTexto(it.fabricante || it.fabricante_manual, itemFisico?.fabricante),
        valor_unitario_enriquecido: obterValorSeguroNumero(it.valor_unitario_manual || it.valor_unitario || it.poNetPrice, itemFisico?.valor_unitario),
        referencia: obterValorSeguroTexto(it.referencia, itemFisico?.referencia),
        fornecedor: obterValorSeguroTexto(it.fornecedor, itemFisico?.fornecedor),
        nf_entrada: obterValorSeguroTexto(it.nf_entrada, itemFisico?.nf_entrada),
        wbs_element: obterValorSeguroTexto(it.wbs_element || it.wbs, itemFisico?.wbs),
        nome_projeto: obterValorSeguroTexto(it.nome_projeto, itemFisico?.nome_projeto),
        emissao_nf: obterValorSeguroTexto(it.emissao_nf, itemFisico?.emissao_nf),
        receb_nf: obterValorSeguroTexto(it.receb_nf, itemFisico?.receb_nf),
        documento_compras: obterValorSeguroTexto(it.documento_compras, itemFisico?.documento_compras),
        centro: obterValorSeguroTexto(it.centro, itemFisico?.centro),
        deposito: obterValorSeguroTexto(it.deposito, itemFisico?.deposito),
        alocacao: obterValorSeguroTexto(it.alocacao, itemFisico?.alocacao),
        unidade_medida_manual: obterValorSeguroTexto(it.unidade_medida_manual, itemFisico?.unidade_medida)
      };
    });
  };

  const verificaFiltroAvancado = (valorItem, valorFiltro) => {
    if (!valorFiltro) return true; 
    const tagsArray = String(valorFiltro).split(',');
    return tagsArray.includes(String(valorItem));
  };

  const handleLimparFiltros = () => {
    setFiltrosAvancados({ tipo: '', id: '', solicitante: '', wbs: '', sap: '', nf: '', pl: '', filial: '', destino: '', statusExibicao: '' });
  };

  const dadosFiltrados = useMemo(() => {
    return dadosTabela.filter((item) => {
      if (estoqueAtual && estoqueAtual !== 'TODOS' && item.filial !== estoqueAtual) return false;

      if (filtroStatus !== 'Todos') {
        if (filtroStatus === 'Pendente' && item.status !== 'Pendente') return false;
        if (filtroStatus === 'Em Andamento' && (item.status !== 'Em Separação' && item.status !== 'Em Andamento')) return false;
        if (filtroStatus === 'Concluído' && (item.status !== 'Concluído' && item.statusExibicao !== 'Reintegrado')) return false;
        if (filtroStatus === 'Recusado' && item.status !== 'Recusado') return false;
        if (filtroStatus === 'Cancelado' && (item.status !== 'Cancelado' && item.statusExibicao !== 'Cancelado')) return false;
      }

      const tipoMapeado = filtroAtivo === "Transfer. WBS" ? "Transferencia WBS" : filtroAtivo === "Reintegração" ? "Reintegracao" : filtroAtivo;
      if (filtroAtivo !== "Todos" && item.tipo !== tipoMapeado && item.tipo !== filtroAtivo) return false;

      if (filtrosAvancados.wbs) {
        const batePrincipal = verificaFiltroAvancado(item.wbs, filtrosAvancados.wbs);
        const bateItens = item.itensRaw?.some(it => verificaFiltroAvancado(it.wbs_element || it.wbs, filtrosAvancados.wbs));
        if (!batePrincipal && !bateItens) return false;
      }

      if (filtrosAvancados.sap) {
        const bateItens = item.itensRaw?.some(it => verificaFiltroAvancado(it.desenho_sap_manual || it.desenho_sap, filtrosAvancados.sap));
        if (!bateItens) return false;
      }

      if (filtrosAvancados.nf) {
        const batePrincipal = verificaFiltroAvancado(item.nfCrossdocking, filtrosAvancados.nf);
        const bateItens = item.itensRaw?.some(it => verificaFiltroAvancado(it.nf_entrada || it.nfEntrada || it.nf, filtrosAvancados.nf));
        if (!batePrincipal && !bateItens) return false;
      }

      if (!verificaFiltroAvancado(item.tipo, filtrosAvancados.tipo)) return false;
      if (!verificaFiltroAvancado(item.id, filtrosAvancados.id)) return false;
      if (!verificaFiltroAvancado(item.solicitante, filtrosAvancados.solicitante)) return false;
      if (!verificaFiltroAvancado(item.pl, filtrosAvancados.pl)) return false;
      if (!verificaFiltroAvancado(item.filial, filtrosAvancados.filial)) return false;
      if (!verificaFiltroAvancado(item.destino, filtrosAvancados.destino)) return false;
      if (!verificaFiltroAvancado(item.statusExibicao, filtrosAvancados.statusExibicao)) return false;

      if (termoPesquisaFiltro) {
        const termo = termoPesquisaFiltro.toLowerCase();
        if (!item.textoBuscavel.includes(termo)) return false;
      }
      return true;
    });
  }, [dadosTabela, estoqueAtual, filtroStatus, filtroAtivo, filtrosAvancados, termoPesquisaFiltro]);

  const kpis = useMemo(() => {
    return {
      total: dadosFiltrados.length,
      pendentes: dadosFiltrados.filter((item) => item.status === "Pendente").length,
      andamento: dadosFiltrados.filter((item) => item.status === "Em Separação" || item.status === "Em Andamento").length,
      concluidos: dadosFiltrados.filter((item) => item.status === "Concluído" || item.statusExibicao === "Reintegrado").length,
      recusados: dadosFiltrados.filter((item) => item.status === "Recusado").length,
      cancelados: dadosFiltrados.filter((item) => item.status === "Cancelado" || item.statusExibicao === "Cancelado").length,
    };
  }, [dadosFiltrados]);

  // ✨ FATIAMENTO INTELIGENTE: Pega apenas do item 0 até ao limite visível
  const dadosParaExibir = useMemo(() => {
    return dadosFiltrados.slice(0, limiteExibicao);
  }, [dadosFiltrados, limiteExibicao]);

  const lidarComMudancaStatus = async (idSolicitacao, novoStatus) => {
    const confirmar = await showConfirm("Alterar Status", `Tem certeza que deseja mudar o status para "${novoStatus}"?`, "warning", "Sim, Mudar");
    if (!confirmar) return;

    let motivo = null;
    if (novoStatus === 'Recusado' || novoStatus === 'Cancelado') {
      motivo = window.prompt("Por favor, informe o motivo da recusa/cancelamento:");
      if (!motivo) return;
    }

    try {
      const dados = await apiFetch(`/solicitacoes/${idSolicitacao}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: novoStatus, motivo_recusa: motivo })
      });

      if (dados.sucesso) {
        const solAlterada = dadosTabela.find(s => s.idOriginal === idSolicitacao);
        if (solAlterada && solAlterada.tipo === 'Cancelado' && (novoStatus === 'Em Separação' || novoStatus === 'Concluído')) {
          showAlert("Cancelamento Aprovado", "O pedido original foi cancelado e o estoque devolvido com sucesso.", "success");
          setTimeout(() => window.location.reload(), 1500);
          return;
        }

        setDadosTabela(prev => prev.map(sol => {
          if (sol.idOriginal === idSolicitacao) {
            let novoPl = sol.pl;
            if (dados.numeroPL) novoPl = `PL #${dados.numeroPL}`;
            else if ((novoStatus === 'Em Separação' || novoStatus === 'Concluído') && sol.pl === '-') novoPl = `PL-${sol.idOriginal}`;
            return {
              ...sol,
              status: novoStatus, statusExibicao: novoStatus, acaoValor: novoStatus,
              pl: (novoStatus === 'Pendente' || novoStatus === 'Recusado' || novoStatus === 'Cancelado') ? '-' : novoPl,
              acaoTipo: novoStatus === 'Pendente' ? 'botao' : 'select',
              textoBuscavel: `${sol.id} ${sol.solicitante} ${sol.wbs} ${sol.destino} ${novoPl}`.toLowerCase()
            };
          }
          return sol;
        }));
        showAlert("Status Atualizado", `A solicitação foi atualizada para ${novoStatus} com sucesso!`, "success");
      } else {
        showAlert("Erro de Servidor", `Erro ao atualizar o status: ${dados.erro || 'Desconhecido'}`, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor ao atualizar o status.", "error");
    }
  };

  const lidarComMudancaDataEntrega = async (idSolicitacao, novaData) => {
    try {
      const dados = await apiFetch(`/solicitacoes/${idSolicitacao}/local`, {
        method: 'PATCH',
        body: JSON.stringify({ data_entrega: novaData ? new Date(novaData).toISOString() : null })
      });

      if (dados.sucesso) {
        let dataFormatada = '—';
        if (novaData) {
          const dataObj = new Date(novaData);
          const dia = String(dataObj.getDate()).padStart(2, '0');
          const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
          const ano = dataObj.getFullYear();
          const hora = String(dataObj.getHours()).padStart(2, '0');
          const min = String(dataObj.getMinutes()).padStart(2, '0');
          dataFormatada = `${dia}/${mes}/${ano} às ${hora}:${min}`;
        }

        setDadosTabela(prev => prev.map(sol => {
          if (sol.idOriginal === idSolicitacao) return { ...sol, dataEntrega: dataFormatada };
          return sol;
        }));
        showAlert("Data Atualizada", "A data e hora de entrega foram atualizadas com sucesso!", "success");
      } else {
        showAlert("Erro", dados.erro || "Falha ao salvar a data de entrega.", "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", "Não foi possível conectar ao servidor.", "error");
    }
  };

  const toggleLinha = (idUnico) => {
    setLinhaExpandida(linhaExpandida === idUnico ? null : idUnico);
    setAnexosNovos([]);
  };

  const handleDeletarAnexo = async (idSolicitacao, anexo) => {
    const confirmar = await showConfirm("Excluir Anexo", `Tem a certeza que deseja apagar o ficheiro "${anexo.nome_arquivo}"?`, "error", "Sim, Apagar");
    if (!confirmar) return;

    try {
      const dados = await apiFetch(`/solicitacoes/anexo/${anexo.id}`, { method: "DELETE" });
      if (dados.sucesso) {
        setDadosTabela((prev) => prev.map((sol) => {
          if (sol.idOriginal === idSolicitacao) return { ...sol, anexos: sol.anexos.filter((a) => a.id !== anexo.id) };
          return sol;
        }));
      } else {
        showAlert("Erro", "Não foi possível apagar o anexo.", "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", "Falha ao comunicar com o servidor.", "error");
    }
  };

  const handleEnviarAnexosExtras = async (idSolicitacao) => {
    if (anexosNovos.length === 0) return;

    try {
      setCarregando(true);
      let anexosProcessados = [];
      try {
        anexosProcessados = await enviarArquivos(anexosNovos);
      } catch (erroUpload) {
        showAlert("Erro no Anexo", erroUpload.message || "Falha ao anexar os ficheiros.", "error");
        setCarregando(false);
        return;
      }

      const dados = await apiFetch(`/solicitacoes/${idSolicitacao}/anexos`, { method: "POST", body: JSON.stringify({ anexos: anexosProcessados }) });

      if (dados.sucesso) {
        showAlert("Sucesso!", "Novos anexos integrados na base de dados com sucesso.", "success");
        setAnexosNovos([]);
        setLinhaExpandida(null);
        window.location.reload();
      } else {
        showAlert("Erro do Servidor", dados.erro, "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", "Falha ao conectar com o servidor.", "error");
    } finally {
      setCarregando(false);
    }
  };

  if (carregandoInicial || (perfil === 'cliente' && estoqueAtual === 'TODOS')) return null;

  return (
    <div className="acompanhamento-wrapper">
      <header className="acompanhamento-cabecalho">
        <h1>{perfil === "logistica" ? "Painel Geral de Solicitações" : "Acompanhamento de Solicitações"}</h1>
        <p>{perfil === "logistica" ? "Gerencie todas as solicitações — materiais, WBS, NFs, entradas, crossdocking e reintegrações" : "Visualize todas as solicitações abertas do sistema"}</p>
      </header>

      <div className="kpis-linha">
        <div className={`kpi-card-resumo kpi-total ${filtroStatus === "Todos" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Todos")}>
          <span>Total</span><strong>{kpis.total}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-pendentes ${filtroStatus === "Pendente" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Pendente")}>
          <span>Pendentes</span><strong>{kpis.pendentes}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-andamento ${filtroStatus === "Em Andamento" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Em Andamento")}>
          <span>Em Separação</span><strong>{kpis.andamento}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-concluidos ${filtroStatus === "Concluído" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Concluído")}>
          <span>Concluídos</span><strong>{kpis.concluidos}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-recusados ${filtroStatus === "Recusado" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Recusado")}>
          <span>Recusados</span><strong>{kpis.recusados}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-cancelados ${filtroStatus === "Cancelado" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Cancelado")}>
          <span>Cancelados</span><strong>{kpis.cancelados}</strong>
        </div>
      </div>

      <div className="tabela-cartao-container">
        
        <div className="tabela-controlos-topo">
          <div className="filtros-botoes">
            {listaFiltros.map((filtro) => (
              <button key={filtro} className={`btn-aba ${filtroAtivo === filtro ? "ativo" : ""}`} onClick={() => setFiltroAtivo(filtro)}>{filtro}</button>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', height: '42px' }}>
            <div className="pesquisa-wrapper-direita" style={{ height: '100%', width: '350px' }}>
              <Search className="icone-pesquisa-dir" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por ID, solicitante, WBS..." 
                value={termoPesquisaInput} 
                onChange={(e) => setTermoPesquisaInput(e.target.value)} 
                style={{ height: '100%', boxSizing: 'border-box', margin: 0 }} 
              />
            </div>

            <button 
              onClick={() => setModalFiltroAberto(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                backgroundColor: '#ffffff', color: '#334155', fontSize: '0.875rem', 
                fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s',
                height: '100%', boxSizing: 'border-box'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <Filter size={18} color="#475569" />
              Filtros
              {Object.values(filtrosAvancados).some(v => v !== '') && (
                <span style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
              )}
            </button>
          </div>
        </div>

        <ScrollDuplo larguraConteudo="1100px">
          <table className="tabela-solicitacoes" style={{ width: '100%', minWidth: '1100px' }}>
            <thead>
              <tr>
                <th className="col-chevron"></th>
                <th>TIPO / ID (PS)</th>
                <th>SOLICITANTE / WBS</th>
                <th>Nº DA PL</th>
                <th>DE ➔ PARA</th>
                <th>DATA CRIAÇÃO</th>
                <th>DATA ENTREGA</th>
                <th>STATUS {perfil === "logistica" && "/ AÇÃO"}</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="8" style={{ padding: "60px", textAlign: "center", color: "#64748b", fontWeight: "500" }}>Carregando solicitações e a processar o estoque de segurança...</td></tr>
              ) : dadosParaExibir.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Nenhuma solicitação encontrada.</td></tr>
              ) : (
                dadosParaExibir.map((linha, index) => {
                  const idUnico = `${linha.idOriginal}-${index}`;
                  const isExpandida = linhaExpandida === idUnico;
                  const isCrossdocking = linha.tipo === 'Crossdocking';
                  let nfNoEstoque = true;

                  if (isCrossdocking && linha.nfCrossdocking) {
                    nfNoEstoque = estoque.some(itemEstoque => String(itemEstoque.nf_entrada || '').trim() === String(linha.nfCrossdocking || '').trim() && String(itemEstoque.nf_entrada || '').trim() !== '');
                  }
                  const statusBloqueado = isCrossdocking && !nfNoEstoque;
                  
                  const isRecusadoOuCancelado = linha.statusExibicao === 'Recusado' || linha.statusExibicao === 'Cancelado' || linha.tipo === 'Cancelado';
                  
                  const esconderPL = linha.tipo === 'Nota Fiscal' || linha.tipo === 'Entrada';
                  
                  const corTextoForte = isRecusadoOuCancelado ? "#991b1b" : "#1e293b";
                  const corTextoMedio = isRecusadoOuCancelado ? "#dc2626" : "#475569";
                  const corTextoFraco = isRecusadoOuCancelado ? "#ef4444" : "#64748b";
                  const corDestaque = isRecusadoOuCancelado ? "#dc2626" : "#2563eb";
                  const classeBadgeTipoAtual = isRecusadoOuCancelado ? "badge-tipo-vermelho" : obterClasseBadgeTipo(linha.tipo);

                  return (
                    <React.Fragment key={idUnico}>
                      <tr
                        className={isExpandida ? "tr-expandida" : ""}
                        style={{
                          backgroundColor: isRecusadoOuCancelado ? '#fef2f2' : '',
                          borderBottom: isRecusadoOuCancelado ? '1px solid #fecaca' : '1px solid #f1f5f9',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <td className="col-chevron" onClick={() => toggleLinha(idUnico)}>
                          <ChevronRight size={18} className={isExpandida ? "icone-rotacionado" : "icone-normal"} style={{ color: corTextoFraco }} />
                        </td>
                        <td>
                          <div className="bloco-tipo-id">
                            <span className={`badge-tipo ${classeBadgeTipoAtual} ${linha.entregaUrgente ? "badge-urgente-critico" : ""}`}>
                              {linha.entregaUrgente ? <Zap size={13} color="#ef4444" fill="#ef4444" /> : (isRecusadoOuCancelado ? <XCircle size={13} /> : <GitBranch size={13} />)}
                              {linha.tipo}
                            </span>
                            <span style={{ fontSize: "0.875rem", fontWeight: "700", color: corTextoForte, marginTop: "4px", display: "block", fontFamily: "monospace" }}>{linha.id}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.75rem", color: corTextoMedio, textTransform: "uppercase", fontWeight: "600" }}>{linha.solicitante}</span>
                            {linha.wbs && <span style={{ fontSize: "0.75rem", color: corDestaque, fontWeight: "500" }}>{linha.wbs}</span>}
                          </div>
                        </td>

                        <td>
                          {!esconderPL && linha.pl && linha.pl !== "-" && linha.pl !== "—" ? (
                            <BotaoGerarPDF
                              linha={{ ...linha, itens: getItensEnriquecidos(linha) }}
                              nomeFilial={obterNomeFilialDinamico(linha.filial || linha.estoque)}
                              showAlert={showAlert}
                              showLoading={showLoading}
                              closeAlert={closeAlert}
                            />
                          ) : (
                            <span className="traco-vazio" style={{ color: corTextoFraco }}>—</span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ display: 'inline-block', backgroundColor: isRecusadoOuCancelado ? '#fef2f2' : '#f8fafc', color: corTextoMedio, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: `1px solid ${isRecusadoOuCancelado ? '#fca5a5' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>
                              De: {obterNomeFilialDinamico(linha.filial || linha.estoque)}
                            </span>

                            <span style={{ display: 'inline-block', backgroundColor: isRecusadoOuCancelado ? '#fef2f2' : '#eff6ff', color: isRecusadoOuCancelado ? '#dc2626' : '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: `1px solid ${isRecusadoOuCancelado ? '#fca5a5' : '#bfdbfe'}`, whiteSpace: 'nowrap' }}>
                              Para: {linha.destino}
                            </span>
                          </div>
                        </td>

                        <td className="texto-data" style={{ color: corTextoFraco }}>{linha.dataSolicitacao}</td>

                        <td>
                          {perfil === "logistica" && !isOperador && !isRecusadoOuCancelado && linha.status !== 'Pendente' ? (
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="datetime-local"
                                value={editandoDataId === linha.idOriginal ? dataTemporaria : converterParaInputDateTime(linha.dataEntrega)}
                                onChange={(e) => {
                                  if (editandoDataId !== linha.idOriginal) {
                                    setEditandoDataId(linha.idOriginal);
                                  }
                                  setDataTemporaria(e.target.value);
                                }}
                                style={{
                                  padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff', color: '#059669', fontWeight: '600', outline: 'none', cursor: 'pointer'
                                }}
                                title="Altere a data e hora de entrega"
                              />
                              {editandoDataId === linha.idOriginal && (
                                <>
                                  <button
                                    onClick={() => {
                                      lidarComMudancaDataEntrega(linha.idOriginal, dataTemporaria);
                                      setEditandoDataId(null);
                                    }}
                                    title="Confirmar alteração"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                  <button
                                    onClick={() => setEditandoDataId(null)}
                                    title="Cancelar"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    <X size={14} strokeWidth={3} />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: linha.dataEntrega && linha.dataEntrega !== "-" && linha.dataEntrega !== "—" ? (isRecusadoOuCancelado ? "#dc2626" : "#10b981") : corTextoFraco }}>
                              {linha.dataEntrega && linha.dataEntrega !== "-" && linha.dataEntrega !== "—" ? linha.dataEntrega : "—"}
                            </span>
                          )}
                        </td>

                        <td>
                          {perfil === "logistica" && !isOperador ? (
                            linha.statusExibicao === 'Reintegrado' ? (
                              <span className="badge-status status-concluido"><CheckCircle2 size={14} /> Resolvido</span>
                            ) : linha.statusExibicao === 'Cancelado' && linha.tipo !== 'Cancelado' ? (
                              <span className="badge-status status-cancelado"><AlertCircle size={14} /> Cancelamento Solicitado</span>
                            ) : linha.status === 'Pendente' ? (
                              statusBloqueado ? (
                                <div title={`Aguardando NF ${linha.nfCrossdocking || ''} dar entrada no estoque`} style={{ color: '#d97706', backgroundColor: '#fefce8', border: '1px solid #fde047', padding: '4px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600' }}><AlertCircle size={14} /> Aguardando NF</div>
                              ) : (
                                <button className="btn-aprovar-acao" style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: '999px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => { e.stopPropagation(); lidarComMudancaStatus(linha.idOriginal || linha.id, linha.statusDestinoAprovacao); }}><RefreshCw size={14} /> Aprovar</button>
                              )
                            ) : (
                              <select className="select-acao" value={linha.status} onChange={(e) => { e.stopPropagation(); lidarComMudancaStatus(linha.idOriginal || linha.id, e.target.value); }} style={{ padding: '4px 10px', border: '1px solid #bfdbfe', borderRadius: '999px', backgroundColor: '#eff6ff', fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', outline: 'none', cursor: 'pointer' }}>
                                <option value="Pendente" disabled>Pendente</option>
                                <option value="Em Separação">Em Separação</option>
                                <option value="Concluído">Concluído</option>
                                <option value="Cancelado">Cancelado</option>
                                <option value="Recusado">Recusado</option>
                              </select>
                            )
                          ) : (
                            renderBadgeStatus(linha.statusExibicao)
                          )}
                        </td>
                      </tr>

                      {isExpandida && (
                        <tr>
                          <td colSpan="8" className="td-expandida">
                            <DetalhesSolicitacao item={{ ...linha, itens: getItensEnriquecidos(linha) }} perfil={perfil} onDeleteAnexo={!isOperador ? ((anexo) => handleDeletarAnexo(linha.idOriginal, anexo)) : undefined} />

                            {perfil === "logistica" && !isOperador && linha.statusExibicao !== 'Reintegrado' && linha.statusExibicao !== 'Cancelado' && (
                              <div style={{ padding: "0 32px 24px 32px", backgroundColor: "#f8fafc" }}>
                                <hr style={{ border: "none", borderTop: "1px dashed #cbd5e1", margin: "0 0 16px 0" }} />
                                <GerenciadorAnexos anexos={anexosNovos} setAnexos={setAnexosNovos} titulo="ADICIONAR NOVOS ANEXOS A ESTA SOLICITAÇÃO" />
                                {anexosNovos.length > 0 && (
                                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                                    <button onClick={() => handleEnviarAnexosExtras(linha.idOriginal)} disabled={carregando} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", backgroundColor: carregando ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: carregando ? "not-allowed" : "pointer" }}><Upload size={16} />{carregando ? "A salvar..." : "Salvar Novos Anexos"}</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {/* ✨ O DETETIVE INVISÍVEL: A linha que dispara o carregamento contínuo */}
              {!carregando && limiteExibicao < dadosFiltrados.length && (
                <tr ref={observerTarget}>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontWeight: '500' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto', display: 'block', marginBottom: '8px' }} />
                    A carregar mais solicitações...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollDuplo>

        {/* Rodapé informativo substitui os antigos botões de página */}
        <div className="paginacao-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
          <span>Exibindo <strong>{Math.min(limiteExibicao, dadosFiltrados.length)}</strong> de <strong>{dadosFiltrados.length}</strong> resultados listados.</span>
        </div>
      </div>

      <FiltroSolicitacoesModal
        aberto={modalFiltroAberto}
        onClose={() => setModalFiltroAberto(false)}
        dadosTabela={dadosTabela}
        filtros={filtrosAvancados}
        setFiltros={setFiltrosAvancados} 
        onLimpar={handleLimparFiltros}
      />

    </div>
  );
}
