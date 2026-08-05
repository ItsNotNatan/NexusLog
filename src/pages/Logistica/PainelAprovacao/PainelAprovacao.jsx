import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  FileText, 
  AlertCircle, 
  Check, 
  X, 
  Clock, 
  User, 
  GitBranch,
  RefreshCw,
  Boxes
} from 'lucide-react';
import './PainelAprovacao.css';

export default function PainelAprovacao() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [processando, setProcessando] = useState(false);

  const token = localStorage.getItem('@NexusLog:token') || '';

  const carregarPendentes = async () => {
    try {
      setCarregando(true);
      const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar?status=Pendente', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resultado = await resposta.json();

      if (resposta.ok && resultado.sucesso) {
        const dadosFormatados = resultado.dados.map((item) => ({
          ...item,
          pl: item.pl || item.bs || '-',
          criacaoPl: item.criacao_pl || item.criacao_bs || item.data_solicitacao
        }));
        setSolicitacoes(dadosFormatados);
      } else {
        // Mock de simulação para fallback operacional
        setSolicitacoes([
          { 
            id: '10976', 
            solicitante: 'MARCIO SILVA', 
            wbs: 'WBS-PRJ-2024-001', 
            pl: 'PL-10976', 
            tipo: 'Material', 
            dataSolicitacao: '05/08/2026 09:30', 
            status: 'Pendente', 
            itensCount: 5 
          },
          { 
            id: '10975', 
            solicitante: 'ANA PAULA', 
            wbs: 'WBS-PRJ-2024-002', 
            pl: 'PL-10975', 
            tipo: 'Transferência WBS', 
            dataSolicitacao: '05/08/2026 10:15', 
            status: 'Pendente', 
            itensCount: 2 
          }
        ]);
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações pendentes de aprovação PL:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPendentes();
  }, []);

  const handleAprovar = async (idSolicitacao) => {
    if (!window.confirm(`Confirmar a aprovação da PL para a solicitação #${idSolicitacao}?`)) return;

    try {
      setProcessando(true);
      const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${idSolicitacao}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Em Separação' })
      });

      if (resposta.ok) {
        alert(`PL #${idSolicitacao} aprovada com sucesso! Pedido enviado para a fila de separação.`);
        setSolicitacoes((prev) => prev.filter((item) => item.id !== idSolicitacao));
      } else {
        const errData = await resposta.json().catch(() => ({}));
        alert(`Erro ao aprovar solicitação: ${errData.erro || 'Servidor indisponível.'}`);
      }
    } catch (error) {
      console.error("Erro na aprovação:", error);
      alert("Falha de conexão com o servidor ao emitir aprovação.");
    } finally {
      setProcessando(false);
    }
  };

  const handleRecusar = async () => {
    if (!motivoRecusa.trim()) {
      alert("Por favor, informe a justificativa de recusa do cancelamento/aprovação da PL.");
      return;
    }

    try {
      setProcessando(true);
      const resposta = await fetch(`http://localhost:3001/api/solicitacoes/${itemSelecionado.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'Recusado', 
          motivo_recusa: motivoRecusa 
        })
      });

      if (resposta.ok) {
        alert(`Solicitação de PL #${itemSelecionado.id} recusada com sucesso.`);
        setSolicitacoes((prev) => prev.filter((item) => item.id !== itemSelecionado.id));
        setModalAberto(false);
        setMotivoRecusa('');
        setItemSelecionado(null);
      } else {
        alert("Erro ao registar recusa de PL no servidor.");
      }
    } catch (error) {
      console.error("Erro ao recusar PL:", error);
      alert("Falha de conexão com o servidor.");
    } finally {
      setProcessando(false);
    }
  };

  const abrirModalRecusa = (item) => {
    setItemSelecionado(item);
    setMotivoRecusa('');
    setModalAberto(true);
  };

  const solicitacoesFiltradas = solicitacoes.filter((item) => {
    const termo = termoPesquisa.toLowerCase();
    return (
      String(item.id).toLowerCase().includes(termo) ||
      (item.solicitante && item.solicitante.toLowerCase().includes(termo)) ||
      (item.wbs && item.wbs.toLowerCase().includes(termo)) ||
      (item.pl && String(item.pl).toLowerCase().includes(termo))
    );
  });

  return (
    <div className="painel-aprovacao-wrapper">
      <header className="aprovacao-cabecalho">
        <div>
          <h1>Painel de Aprovação de PL</h1>
          <p>Validação e liberação de Packing Lists pendentes para envio ao almoxarifado</p>
        </div>
        <div className="badge-contador-pendentes">
          <Clock size={16} />
          <span>Pendentes: <strong>{solicitacoes.length}</strong></span>
        </div>
      </header>

      <div className="aprovacao-cartao">
        <div className="controles-topo">
          <div className="pesquisa-wrapper-aprovacao">
            <Search size={18} className="icone-pesquisa-aprovacao" />
            <input
              type="text"
              placeholder="Buscar por ID, Solicitante, WBS ou Nº de PL..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
            />
          </div>
          <button className="btn-recarregar" onClick={carregarPendentes} title="Atualizar lista">
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {carregando ? (
          <div className="status-carregando">
            <RefreshCw size={24} className="animate-spin" />
            <span>Carregando solicitações pendentes de PL...</span>
          </div>
        ) : solicitacoesFiltradas.length === 0 ? (
          <div className="status-vazio">
            <CheckCircle2 size={40} color="#16a34a" />
            <h3>Nenhuma PL Pendente</h3>
            <p>Todas as solicitações de Packing List foram processadas ou aprovadas.</p>
          </div>
        ) : (
          <div className="grelha-solicitacoes">
            {solicitacoesFiltradas.map((item) => (
              <div key={item.id} className="cartao-solicitacao-item">
                <div className="cartao-solicitacao-header">
                  <span className="badge-pl-id">
                    <FileText size={14} /> {item.pl && item.pl !== '-' ? item.pl : `PL #${item.id}`}
                  </span>
                  <span className="badge-tipo-item">{item.tipo || 'Material'}</span>
                </div>

                <div className="cartao-solicitacao-corpo">
                  <div className="linha-info">
                    <User size={15} className="icone-info" />
                    <span>Solicitante: <strong>{item.solicitante}</strong></span>
                  </div>
                  <div className="linha-info">
                    <GitBranch size={15} className="icone-info" />
                    <span>WBS: <strong className="texto-wbs">{item.wbs}</strong></span>
                  </div>
                  <div className="linha-info">
                    <Boxes size={15} className="icone-info" />
                    <span>Itens solicitados: <strong>{item.itensCount || item.quantidade_itens || '—'}</strong></span>
                  </div>
                  <div className="linha-info">
                    <Clock size={15} className="icone-info" />
                    <span className="texto-data-criacao">Criado em: {item.criacaoPl || item.dataSolicitacao}</span>
                  </div>
                </div>

                <div className="cartao-solicitacao-acoes">
                  <button
                    className="btn-acao-aprovar"
                    onClick={() => handleAprovar(item.id)}
                    disabled={processando}
                  >
                    <Check size={16} /> Aprovar PL
                  </button>
                  <button
                    className="btn-acao-recusar"
                    onClick={() => abrirModalRecusa(item)}
                    disabled={processando}
                  >
                    <X size={16} /> Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-conteudo">
            <div className="modal-cabecalho">
              <h3>
                <AlertCircle size={20} color="#ef4444" /> Recusar Solicitação de PL #{itemSelecionado?.id}
              </h3>
              <button className="btn-fechar-modal" onClick={() => setModalAberto(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-corpo">
              <p>Por favor, detalhe o motivo para o indeferimento do Packing List:</p>
              <textarea
                className="textarea-recusa"
                placeholder="Ex: Item indisponível no estoque ou WBS incorreta..."
                rows={4}
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
              />
            </div>

            <div className="modal-rodape">
              <button className="btn-modal-cancelar" onClick={() => setModalAberto(false)}>
                Voltar
              </button>
              <button
                className="btn-modal-confirmar-recusa"
                onClick={handleRecusar}
                disabled={processando}
              >
                {processando ? "Processando..." : "Confirmar Recusa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}