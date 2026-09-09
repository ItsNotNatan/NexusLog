// =================================================================
// ARQUIVO: src/pages/Cliente/TransferenciaWBS/TransferenciaWBS.jsx
// DESCRIÇÃO: Ecrã de transferência com anexo opcional e formatação WBS
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import './TransferenciaWBS.css';
import { Send, MapPin } from 'lucide-react'; 

import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import SeletorEstoqueLateral from '../../../components/SeletorEstoqueLateral/SeletorEstoqueLateral';
import { AuthContext } from '../../../contexts/AuthContext';
import { apiFetch, urlDoServidor, enviarArquivos } from '../../../services/api';
import { useAlert } from '../../../contexts/AlertContext'; 
import { io } from 'socket.io-client';

// ✨ IMPORTAÇÃO DO FORMATADOR CENTRALIZADO
import { formatarWBS } from '../../../utils/formatadores';

export default function TransferenciaWBS() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [formDados, setFormDados] = useState({ nome: '', wbsDestino: '', justificativa: '', entregaUrgente: false });
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [estoqueReal, setEstoqueReal] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);

  // Buscar dados e ligar o radar em tempo real
  useEffect(() => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      setEstoqueReal([]); setCarregandoEstoque(false); return;
    }

    const carregarEstoque = async () => {
      try {
        const resultado = await apiFetch(`/estoque/listar?filial_id=${estoqueAtual}`);
        if (resultado.sucesso) {
          const itensComSaldo = resultado.dados.filter(item => item.quantidade_disponivel > 0);
          setEstoqueReal(itensComSaldo);

          // SINCRONIZA O CARRINHO EM TEMPO REAL
          setItensSelecionados(prevSelecionados => 
            prevSelecionados.map(selecionado => {
              const itemFresco = itensComSaldo.find(i => i.id === selecionado.id);
              if (itemFresco) {
                const saldoLivreNovo = itemFresco.quantidade_disponivel - (itemFresco.quantidade_reservada || 0);
                let novaQtd = selecionado.qtdTransferencia;
                
                if (novaQtd > saldoLivreNovo) {
                  novaQtd = saldoLivreNovo > 0 ? saldoLivreNovo : 1;
                }

                return { 
                  ...selecionado, 
                  quantidade_disponivel: itemFresco.quantidade_disponivel, 
                  quantidade_reservada: itemFresco.quantidade_reservada,
                  qtdTransferencia: novaQtd
                };
              }
              return selecionado;
            })
          );
        }
      } catch (error) { console.error("Falha ao buscar estoque:", error.message); } 
      finally { setCarregandoEstoque(false); }
    };
    
    carregarEstoque();

    // CONFIGURAÇÃO DO SOCKET.IO
    const SOCKET_URL = urlDoServidor();
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('estoque_atualizado', () => { carregarEstoque(); });
    socket.on('solicitacoes_atualizadas', () => { carregarEstoque(); });

    return () => socket.disconnect();
  }, [estoqueAtual]); 

  const adicionarItem = (itemOriginal) => {
    if (itensSelecionados.length >= 20) { showAlert("Limite Atingido", "Limite máximo de 20 itens.", "warning"); return; }
    
    const saldoLivre = itemOriginal.quantidade_disponivel - (itemOriginal.quantidade_reservada || 0);
    if (saldoLivre <= 0) {
      showAlert("Estoque Reservado", "A quantidade deste item já se encontra 100% reservada para outras solicitações.", "warning");
      return;
    }

    if (!itensSelecionados.find(i => i.id === itemOriginal.id)) {
      setItensSelecionados([...itensSelecionados, { ...itemOriginal, qtdTransferencia: 1 }]);
    }
  };
  
  const removerItem = (id) => setItensSelecionados(itensSelecionados.filter(i => i.id !== id));

  const atualizarQuantidade = (idOriginal, novaQtd) => {
    const itemEstoque = estoqueReal.find(i => i.id === idOriginal);
    if (!itemEstoque) return;
    
    const maxPermitido = itemEstoque.quantidade_disponivel - (itemEstoque.quantidade_reservada || 0);

    let qtdFormatada = parseInt(novaQtd, 10);
    if (isNaN(qtdFormatada) || qtdFormatada < 1) qtdFormatada = 1;
    if (qtdFormatada > maxPermitido) qtdFormatada = maxPermitido > 0 ? maxPermitido : 1;
    
    setItensSelecionados(itensSelecionados.map(i => i.id === idOriginal ? { ...i, qtdTransferencia: qtdFormatada } : i));
  };

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') { showAlert("Atenção", "Selecione uma filial de origem.", "warning"); return; }
    if (!formDados.nome || !formDados.wbsDestino) { showAlert("Campos Obrigatórios", "Preencha o Nome e o WBS de Destino.", "warning"); return; }
    if (itensSelecionados.length === 0) { showAlert("Carrinho Vazio", "Selecione pelo menos um item para transferir.", "warning"); return; }

    let anexosProcessados = [];
    if (anexos.length > 0) {
      try {
        anexosProcessados = await enviarArquivos(anexos);
      } catch (erroUpload) {
        showAlert("Falha no Anexo", erroUpload.message || "Erro ao anexar os ficheiros.", "error");
        return;
      }
    }

    const payload = {
      solicitante: { ...formDados, tipo: 'Transferencia WBS', filial_origem: estoqueAtual },
      itens: itensSelecionados.map(item => ({
        estoque_id: item.id, desenhoSAP: item.desenho_sap || item.desenhoSAP || '-', 
        numPecaFabricante: item.part_number || item.numPecaFabricante || '-',
        materialDescription: item.descricao || item.materialDescription || '-',
        qtd: item.qtdTransferencia, wbsOrigem: item.wbs || item.wbs_element || '-', alocacao: item.alocacao || '-'
      })),
      anexos: anexosProcessados 
    };

    try {
      const dados = await apiFetch('/solicitacoes/transferencia', { method: 'POST', body: JSON.stringify(payload) });
      if (dados.sucesso || dados.ps) {
        showAlert("Sucesso!", `Transferência solicitada com sucesso. PS Gerada: ${dados.ps}`, "success");
        setFormDados({ nome: '', wbsDestino: '', justificativa: '', entregaUrgente: false });
        setItensSelecionados([]); setAnexos([]); 
      } else { showAlert("Erro do Servidor", dados.erro, "error"); }
    } catch (error) { showAlert("Falha de Conexão", "Não foi possível ligar ao servidor.", "error"); }
  };

  return (
    <>
      <div className="form-cartao">
        <div className="form-grid">
          <div className="input-grupo">
            <label>SOLICITANTE *</label>
            <input type="text" className="input-campo" placeholder="Seu nome" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} />
          </div>
          <div className="input-grupo">
            <label>WBS DE DESTINO *</label>
            <input 
              type="text" 
              className="input-campo" 
              placeholder="WBS do projeto destino" 
              value={formDados.wbsDestino} 
              onChange={(e) => setFormDados({...formDados, wbsDestino: formatarWBS(e.target.value)})} 
            />
          </div>
          <div className="input-grupo">
            <label><MapPin size={14} /> FILIAL ORIGEM</label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" color="#2563eb" />
              <input type="text" className="input-campo" value={estoqueAtual} readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>
          <div className="input-grupo span-2">
            <label>JUSTIFICATIVA</label>
            <textarea className="input-campo" placeholder="Motivo..." rows="2" value={formDados.justificativa} onChange={(e) => setFormDados({...formDados, justificativa: e.target.value})}></textarea>
          </div>
        </div>
        
        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} titulo="ANEXOS (OPCIONAL)" />
      </div>

      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <SeletorEstoqueLateral 
          estoque={estoqueReal} 
          carregando={carregandoEstoque} 
          itensSelecionados={itensSelecionados} 
          bloquearTransferidos={true} 
          limiteMaximo={20}
          onAdicionarItem={adicionarItem} 
          onRemoverItem={removerItem}
          onAtualizarQuantidade={atualizarQuantidade}
        />
      </div>

      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul" onClick={handleEnviar}><Send size={16} /> Confirmar Transferência</button>
      </div>
    </>
  );
}