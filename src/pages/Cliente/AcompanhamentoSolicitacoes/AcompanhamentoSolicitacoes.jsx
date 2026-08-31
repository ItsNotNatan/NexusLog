import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./AcompanhamentoSolicitacoes.css";
import {
  Search, ChevronRight, ChevronLeft, GitBranch, FileText,
  RefreshCw, CheckCircle2, XCircle, Zap, Upload, AlertCircle, MapPin
} from "lucide-react";

import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import DetalhesSolicitacao from "./Detalhes/DetalhesSolicitacao";
import GerenciadorAnexos from "../../../components/GerenciadorAnexos/GerenciadorAnexos";
import BotaoGerarPDF from "../../../components/BotaoGerarPDF/BotaoGerarPDF";
import ScrollDuplo from "../../../components/ScrollDuplo/ScrollDuplo";
import { apiFetch, urlDoServidor, enviarArquivos } from '../../../services/api';
import { io } from 'socket.io-client';

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

// ✨ FUNÇÃO AUXILIAR: Transforma o texto no formato do input datetime-local
const converterParaInputDateTime = (dataString) => {
  if (!dataString || dataString === '-' || dataString === '—' || dataString === 'Disponível') return '';
  
  const partes = dataString.split(' ');
  if (partes[0].includes('/')) {
    const [dia, mes, ano] = partes[0].split('/');
    let hora = '00:00';
    
    if (partes.length >= 3 && partes[2].includes(':')) {
       hora = partes[2]; 
    } else if (partes.length === 2 && partes[1].includes(':')) {
       hora = partes[1]; 
    }
    
    return `${ano}-${mes}-${dia}T${hora}`;
  }
  return '';
};

// ✨ FUNÇÃO AUXILIAR INTELIGENTE: Puxa o valor da solicitação ou cruza com o estoque
const obterValorSeguro = (valItem, valEstoque) => {
  const validar = (v) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== 'null';
  if (validar(valItem)) return valItem;
  if (validar(valEstoque)) return valEstoque;
  return '';
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
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [anexosNovos, setAnexosNovos] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const itensPorPagina = 10;

  let usuarioLogado = {};
  try {
    const dadosUsuario = localStorage.getItem('@NexusLog:usuario');
    if (dadosUsuario && dadosUsuario !== 'undefined') {
      usuarioLogado = JSON.parse(dadosUsuario);
    }
  } catch (erro) { }

  const token = localStorage.getItem('@NexusLog:token') || '';
  const isOperador = String(usuarioLogado.cargo || '').toLowerCase().trim().includes('operador');
  const listaFiltros = ["Todos", "Material", "Transfer. WBS", "Nota Fiscal", "Entrada", "Crossdocking", "Reintegração"];

  useEffect(() => {
    if (perfil === 'cliente' && estoqueAtual === 'TODOS') return;

    const buscarDados = async () => {
      try {
        setCarregando(true);
        const tipoMapeado = filtroAtivo === "Transfer. WBS" ? "Transferencia WBS" : filtroAtivo === "Reintegração" ? "Reintegracao" : filtroAtivo;

        const urlSolicitacoes = `/solicitacoes/listar?limit=1000&busca=${termoPesquisa}&tipo=${tipoMapeado !== 'Todos' ? tipoMapeado : ''}&filial=${estoqueAtual}`;

        // ✨ ADICIONADO "?rastreabilidade=true" PARA LER ITENS ZERADOS E RECUPERAR A REFERÊNCIA
        const [resultadoSol, resultadoEst] = await Promise.all([
          apiFetch(urlSolicitacoes),
          apiFetch("/estoque/listar?rastreabilidade=true")
        ]);

        if (resultadoEst.sucesso) {
          setEstoque(resultadoEst.dados);
        }

        if (resultadoSol.sucesso) {
          const reints = resultadoSol.dados.filter(sol =>
            (sol.tipo === 'Reintegracao' || sol.tipo === 'Reintegração') &&
            (sol.status === 'Em Separação' || sol.status === 'Concluído')
          );

          const cancelamentosAtivos = resultadoSol.dados.filter(sol =>
            sol.tipo === 'Cancelado' && sol.status !== 'Recusado'
          );

          const estoqueReferencia = resultadoEst.sucesso ? resultadoEst.dados : [];

          const dadosFormatados = resultadoSol.dados.map((item) => {
            let prefixo = "PS";
            const idNumerico = item.id.replace(/\D/g, "");
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

            const temPedidoDeCancelamento = cancelamentosAtivos.find(canc =>
              canc.observacoes && canc.observacoes.includes(item.idOriginal)
            );

            if (item.tipo !== 'Cancelado' && temPedidoDeCancelamento) {
              statusFinalVisual = 'Cancelado';
            }
            else if (item.tipo === 'Material' && (item.status === 'Em Separação' || item.status === 'Concluído') && numeroPL !== '-') {
              const qtdJaDevolvida = {};
              reints.forEach(reint => {
                if (reint.observacoes && reint.observacoes.includes(numeroPL)) {
                  (reint.itens || []).forEach(it => {
                    qtdJaDevolvida[it.estoque_id] = (qtdJaDevolvida[it.estoque_id] || 0) + Number(it.quantidade_solicitada || 0);
                  });
                }
              });

              const itensRestantes = (item.itens || []).filter(origItem => {
                const devolvido = qtdJaDevolvida[origItem.estoque_id] || 0;
                return (Number(origItem.quantidade_solicitada) - devolvido) > 0;
              });

              if (itensRestantes.length === 0 && (item.itens || []).length > 0) {
                statusFinalVisual = 'Reintegrado';
              }
            }

            // ✨ AQUI: ENRIQUECIMENTO DOS ITENS! 
            // Cruza todos os campos da solicitação com a prateleira física (mesmo as zeradas)
            const itensEnriquecidos = (item.itens || []).map(it => {
              const itemFisico = (it.estoque_id && estoqueReferencia.length > 0)
                ? estoqueReferencia.find(e => e.id === it.estoque_id)
                : null;
                
              return {
                ...it,
                desenho_sap_manual: obterValorSeguro(it.desenho_sap_manual || it.desenho_sap, itemFisico?.desenho_sap),
                part_number_manual: obterValorSeguro(it.part_number_manual || it.part_number, itemFisico?.part_number),
                descricao_manual: obterValorSeguro(it.descricao_manual || it.descricao, itemFisico?.descricao),
                referencia: obterValorSeguro(it.referencia, itemFisico?.referencia),
                fornecedor: obterValorSeguro(it.fornecedor, itemFisico?.fornecedor),
                nf_entrada: obterValorSeguro(it.nf_entrada, itemFisico?.nf_entrada),
                wbs_element: obterValorSeguro(it.wbs_element, itemFisico?.wbs),
                nome_projeto: obterValorSeguro(it.nome_projeto, itemFisico?.nome_projeto),
                emissao_nf: obterValorSeguro(it.emissao_nf, itemFisico?.emissao_nf),
                receb_nf: obterValorSeguro(it.receb_nf, itemFisico?.receb_nf),
                documento_compras: obterValorSeguro(it.documento_compras, itemFisico?.documento_compras),
                valor_unitario_manual: obterValorSeguro(it.valor_unitario_manual, itemFisico?.valor_unitario),
                centro: obterValorSeguro(it.centro, itemFisico?.centro),
                deposito: obterValorSeguro(it.deposito, itemFisico?.deposito),
                alocacao: obterValorSeguro(it.alocacao, itemFisico?.alocacao),
                unidade_medida_manual: obterValorSeguro(it.unidade_medida_manual, itemFisico?.unidade_medida) || 'Unid'
              };
            });

            return {
              ...item,
              idOriginal: item.id,
              id: idNumerico || item.id,
              prefixo: prefixo,
              statusExibicao: statusFinalVisual,
              statusDestinoAprovacao: statusDestinoAprovacao,
              acaoTipo: acaoTipo,
              acaoValor: acaoValor,
              dataSolicitacao: item.dataSolicitacao || "-",
              dataEntrega: item.dataEntrega || "-",
              pl: numeroPL,
              nfCrossdocking: item.nfCrossdocking || null,
              itens: itensEnriquecidos // ✨ Substitui pela versão completa com as Referências resgatadas
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

    if (token) {
      buscarDados();

      const SOCKET_URL = urlDoServidor();
      const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      
      socket.on('solicitacoes_atualizadas', () => {
        console.log('⚡ Status de solicitação alterado! Atualizando tabela...');
        buscarDados();
      });

      return () => socket.disconnect();
    } else {
      setCarregando(false);
    }
  }, [filtroAtivo, termoPesquisa, token, estoqueAtual, showAlert, perfil]);

  useEffect(() => { setPaginaAtual(1); }, [filtroAtivo, filtroStatus, termoPesquisa]);

  // ✨ FILTRO DUPLO SEGURO: Filtra pela Filial Atual + Status + Termo
  const dadosFiltrados = dadosTabela.filter((item) => {
    // Bloqueia qualquer filial que não seja a selecionada (se não for TODOS)
    if (estoqueAtual && estoqueAtual !== 'TODOS' && item.filial !== estoqueAtual) {
      return false;
    }

    if (filtroStatus !== 'Todos') {
      if (filtroStatus === 'Pendente' && item.status !== 'Pendente') return false;
      if (filtroStatus === 'Em Andamento' && (item.status !== 'Em Separação' && item.status !== 'Em Andamento')) return false;
      if (filtroStatus === 'Concluído' && (item.status !== 'Concluído' && item.statusExibicao !== 'Reintegrado')) return false;
      if (filtroStatus === 'Recusado' && item.status !== 'Recusado') return false;
      if (filtroStatus === 'Cancelado' && (item.status !== 'Cancelado' && item.statusExibicao !== 'Cancelado')) return false;
    }

    return true;
  });

  const kpiTotal = dadosFiltrados.length;
  const kpiPendentes = dadosFiltrados.filter((item) => item.status === "Pendente").length;
  const kpiAndamento = dadosFiltrados.filter((item) => item.status === "Em Separação" || item.status === "Em Andamento").length;
  const kpiConcluidos = dadosFiltrados.filter((item) => item.status === "Concluído" || item.statusExibicao === "Reintegrado").length;
  const kpiRecusados = dadosFiltrados.filter((item) => item.status === "Recusado").length;
  const kpiCancelados = dadosFiltrados.filter((item) => item.status === "Cancelado" || item.statusExibicao === "Cancelado").length;

  const totalRegistrosFiltrados = dadosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistrosFiltrados / itensPorPagina));
  const indexPrimeiroItem = (paginaAtual - 1) * itensPorPagina;
  const indexUltimoItem = paginaAtual * itensPorPagina;
  const dadosPaginados = dadosFiltrados.slice(indexPrimeiroItem, indexUltimoItem);

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
            if (dados.numeroPL) {
              novoPl = `PL #${dados.numeroPL}`;
            } else if ((novoStatus === 'Em Separação' || novoStatus === 'Concluído') && sol.pl === '-') {
              novoPl = `PL-${sol.id}`;
            }
            return {
              ...sol,
              status: novoStatus,
              statusExibicao: novoStatus,
              acaoValor: novoStatus,
              pl: (novoStatus === 'Pendente' || novoStatus === 'Recusado' || novoStatus === 'Cancelado') ? '-' : novoPl,
              acaoTipo: novoStatus === 'Pendente' ? 'botao' : 'select'
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
          if (sol.idOriginal === idSolicitacao) {
            return { ...sol, dataEntrega: dataFormatada };
          }
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
          <span>Total</span><strong>{kpiTotal}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-pendentes ${filtroStatus === "Pendente" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Pendente")}>
          <span>Pendentes</span><strong>{kpiPendentes}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-andamento ${filtroStatus === "Em Andamento" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Em Andamento")}>
          <span>Em Separação</span><strong>{kpiAndamento}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-concluidos ${filtroStatus === "Concluído" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Concluído")}>
          <span>Concluídos</span><strong>{kpiConcluidos}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-recusados ${filtroStatus === "Recusado" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Recusado")}>
          <span>Recusados</span><strong>{kpiRecusados}</strong>
        </div>
        <div className={`kpi-card-resumo kpi-cancelados ${filtroStatus === "Cancelado" ? "ativo" : ""}`} onClick={() => setFiltroStatus("Cancelado")}>
          <span>Cancelados</span><strong>{kpiCancelados}</strong>
        </div>
      </div>

      <div className="tabela-cartao-container">
        <div className="tabela-controlos-topo">
          <div className="filtros-botoes">
            {listaFiltros.map((filtro) => (
              <button key={filtro} className={`btn-aba ${filtroAtivo === filtro ? "ativo" : ""}`} onClick={() => setFiltroAtivo(filtro)}>{filtro}</button>
            ))}
          </div>
          <div className="pesquisa-wrapper-direita">
            <Search className="icone-pesquisa-dir" size={18} />
            <input type="text" placeholder="Buscar por ID, solicitante, WBS..." value={termoPesquisa} onChange={(e) => setTermoPesquisa(e.target.value)} />
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
                <th>FILIAL</th>
                <th>DATA CRIAÇÃO</th>
                <th>DATA ENTREGA</th>
                <th>STATUS {perfil === "logistica" && "/ AÇÃO"}</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="8" style={{ padding: "60px", textAlign: "center", color: "#64748b", fontWeight: "500" }}>Carregando solicitações...</td></tr>
              ) : dadosPaginados.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Nenhuma solicitação encontrada.</td></tr>
              ) : (
                dadosPaginados.map((linha, index) => {
                  const idUnico = `${linha.prefixo}-${linha.id}-${index}`;
                  const isExpandida = linhaExpandida === idUnico;
                  const isCrossdocking = linha.tipo === 'Crossdocking';
                  let nfNoEstoque = true;

                  if (isCrossdocking && linha.nfCrossdocking) {
                    nfNoEstoque = estoque.some(itemEstoque => String(itemEstoque.nf_entrada || '').trim() === String(linha.nfCrossdocking || '').trim() && String(itemEstoque.nf_entrada || '').trim() !== '');
                  }
                  const statusBloqueado = isCrossdocking && !nfNoEstoque;
                  
                  const isRecusadoOuCancelado = linha.statusExibicao === 'Recusado' || linha.statusExibicao === 'Cancelado' || linha.tipo === 'Cancelado';
                  
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
                            <span style={{ fontSize: "0.875rem", fontWeight: "700", color: corTextoForte, marginTop: "4px", display: "block", fontFamily: "monospace" }}>{linha.prefixo}:{linha.id}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.75rem", color: corTextoMedio, textTransform: "uppercase", fontWeight: "600" }}>{linha.solicitante}</span>
                            {linha.wbs && <span style={{ fontSize: "0.75rem", color: corDestaque, fontWeight: "500" }}>{linha.wbs}</span>}
                          </div>
                        </td>

                        <td>
                          {linha.pl && linha.pl !== "-" && linha.pl !== "—" ? (
                            <BotaoGerarPDF
                              linha={linha}
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: isRecusadoOuCancelado ? '#fef2f2' : '#f1f5f9', color: corTextoMedio, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', border: `1px solid ${isRecusadoOuCancelado ? '#fca5a5' : '#cbd5e1'}`, whiteSpace: 'nowrap' }}>
                            <MapPin size={12} /> {obterNomeFilialDinamico(linha.filial || linha.estoque)}
                          </span>
                        </td>
                        <td className="texto-data" style={{ color: corTextoFraco }}>{linha.dataSolicitacao}</td>

                        <td>
                          {perfil === "logistica" && !isOperador && !isRecusadoOuCancelado && linha.status !== 'Pendente' ? (
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                              <input
                                type="datetime-local"
                                value={converterParaInputDateTime(linha.dataEntrega)}
                                onChange={(e) => lidarComMudancaDataEntrega(linha.idOriginal, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#059669',
                                  fontWeight: '600',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Altere a data e hora de entrega"
                              />
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
                            <DetalhesSolicitacao item={linha} perfil={perfil} onDeleteAnexo={!isOperador ? ((anexo) => handleDeletarAnexo(linha.idOriginal, anexo)) : undefined} />

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
            </tbody>
          </table>
        </ScrollDuplo>

        <div className="paginacao-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
          <div className="paginacao-info" style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> &middot; Exibindo {dadosPaginados.length === 0 ? 0 : indexPrimeiroItem + 1} a <strong>{Math.min(indexUltimoItem, totalRegistrosFiltrados)}</strong> de <strong>{totalRegistrosFiltrados}</strong> resultados
          </div>
          <div className="paginacao-botoes" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="btn-paginacao" onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))} disabled={paginaAtual === 1 || carregando} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: (paginaAtual === 1 || carregando) ? 'not-allowed' : 'pointer', opacity: (paginaAtual === 1 || carregando) ? 0.6 : 1 }}><ChevronLeft size={16} /> Anterior</button>
            {Array.from({ length: totalPaginas }, (_, index) => {
              const numeroPagina = index + 1;
              const ehAtiva = paginaAtual === numeroPagina;
              return (<button key={numeroPagina} onClick={() => setPaginaAtual(numeroPagina)} disabled={carregando} style={{ padding: '6px 12px', backgroundColor: ehAtiva ? '#ea580c' : '#ffffff', color: ehAtiva ? '#ffffff' : '#334155', border: `1px solid ${ehAtiva ? '#ea580c' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '0.875rem', fontWeight: ehAtiva ? '600' : '500', cursor: carregando ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>{numeroPagina}</button>);
            })}
            <button className="btn-paginacao" onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas || carregando || totalRegistrosFiltrados === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: (paginaAtual === totalPaginas || carregando || totalRegistrosFiltrados === 0) ? 'not-allowed' : 'pointer', opacity: (paginaAtual === totalPaginas || carregando || totalRegistrosFiltrados === 0) ? 0.6 : 1 }}>Próxima <ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
