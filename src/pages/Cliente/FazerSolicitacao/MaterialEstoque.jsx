// =================================================================
// ARQUIVO: src/pages/Cliente/FazerSolicitacao/MaterialEstoque.jsx
// DESCRIÇÃO: Ecrã para solicitar material do estoque com TEMPO REAL
// =================================================================
import React, { useState, useEffect, useContext } from "react";
import { User, MapPin, Calendar, Send, Zap } from "lucide-react";

import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';

import GerenciadorAnexos from "../../../components/GerenciadorAnexos/GerenciadorAnexos";
import SeletorEstoqueLateral from "../../../components/SeletorEstoqueLateral/SeletorEstoqueLateral";
import { supabase } from "../../../supabaseClient";
import { apiFetch } from '../../../services/api';
import { io } from 'socket.io-client'; // ✨ IMPORTAÇÃO DO SOCKET.IO

const formatarWBS = (valor) => {
  if (!valor) return '';
  const limpo = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (limpo.length > 5) return `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
  return limpo;
};

export default function MaterialEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  const [formDados, setFormDados] = useState({
    nome: "", wbs: "", destino: "", dataNecessidade: "",
    observacoes: "", entregaUrgente: false, justificativaUrgencia: "",
  });

  const [dataMinima, setDataMinima] = useState("");
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);

  useEffect(() => {
    const hoje = new Date();
    const timezoneOffset = hoje.getTimezoneOffset() * 60000;
    setDataMinima(new Date(hoje.getTime() - timezoneOffset).toISOString().split("T")[0]);
  }, []);

  // ✨ ATUALIZADO: Buscar dados e ligar o radar em tempo real
  useEffect(() => {
    const buscarEstoqueReal = async () => {
      try {
        const resultado = await apiFetch("/estoque/listar");
        if (resultado.sucesso) {
          const itensComSaldo = resultado.dados
            .filter((item) => item.quantidade_disponivel > 0)
            .map((item) => ({
              idBD: item.id,
              filial_id: item.filial_id || item.filial || item.filial_origem_id,
              desenhoSAP: item.desenho_sap_manual || item.desenho_sap || "-",
              materialDescription: item.descricao_manual || item.descricao || "-",
              numPecaFabricante: item.part_number_manual || item.part_number || "-",
              fornecedor: item.fornecedor || "-",
              qtdFornecida: item.quantidade_disponivel || 0,
              qtdReservada: item.quantidade_reservada || 0,
              nf: item.nf_entrada || "-",
              unidadeMedida: item.unidade_medida_manual || item.unidade_medida || "Unid",
              wbs: item.wbs_element || item.wbs || "-",
              alocacao: item.alocacao || "-",
              isTransferencia: item.is_transferencia || false
            }));

          setEstoqueDisponivel(itensComSaldo);

          // ✨ SINCRONIZA O CARRINHO EM TEMPO REAL: Atualiza a lista da direita se houver mudanças no backend
          setItensSelecionados(prevSelecionados => 
            prevSelecionados.map(selecionado => {
              const itemFresco = itensComSaldo.find(i => i.idBD === selecionado.estoque_id);
              if (itemFresco) {
                const saldoLivreNovo = itemFresco.qtdFornecida - (itemFresco.qtdReservada || 0);
                let novaQtdSelecionada = selecionado.qtdSelecionada;
                
                // Se a quantidade nova livre for menor que o que estava digitado, corrige o input automaticamente
                if (novaQtdSelecionada > saldoLivreNovo) {
                  novaQtdSelecionada = saldoLivreNovo > 0 ? saldoLivreNovo : 1;
                }

                return { 
                  ...selecionado, 
                  qtdFornecida: itemFresco.qtdFornecida, 
                  qtdReservada: itemFresco.qtdReservada,
                  qtdSelecionada: novaQtdSelecionada
                };
              }
              return selecionado;
            })
          );
        }
      } catch (error) { console.error("Falha:", error.message); } 
      finally { setCarregandoEstoque(false); }
    };
    
    buscarEstoqueReal();

    // ✨ CONFIGURAÇÃO DO SOCKET.IO (ESCUTA ATIVA)
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const SOCKET_URL = BACKEND_URL.replace(/\/api\/?$/, ''); 
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('estoque_atualizado', () => {
      console.log('⚡ Tempo Real: Estoque atualizado no servidor!');
      buscarEstoqueReal();
    });

    socket.on('solicitacoes_atualizadas', () => {
      console.log('⚡ Tempo Real: Reservas atualizadas no servidor!');
      buscarEstoqueReal();
    });

    return () => socket.disconnect();
  }, []);

  const removerItem = (idParaRemover) => {
    setItensSelecionados((prev) => prev.filter((item) => item.id !== idParaRemover));
  };

  const atualizarCampo = (id, novoValor) => {
    setItensSelecionados((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          let valorValidado = novoValor === '' ? '' : parseInt(novoValor, 10);
          if (valorValidado !== '') {
            if (isNaN(valorValidado) || valorValidado < 1) valorValidado = 1;
            const saldoLivre = item.qtdFornecida - (item.qtdReservada || 0);
            if (item.qtdFornecida && valorValidado > saldoLivre) {
              valorValidado = saldoLivre > 0 ? saldoLivre : 1;
            }
          }
          return { ...item, qtdSelecionada: valorValidado };
        }
        return item;
      })
    );
  };

  const adicionarItemDoEstoque = (item, index) => {
    if (itensSelecionados.length >= 25) { showAlert("Limite Atingido", "Atingiu o limite.", "warning"); return; }
    if (itensSelecionados.some(i => i.estoque_id === item.idBD)) { showAlert("Item Duplicado", "Material já adicionado.", "info"); return; }
    
    const saldoLivre = item.qtdFornecida - (item.qtdReservada || 0);
    if (saldoLivre <= 0) {
      showAlert("Estoque Reservado", "A quantidade deste item já se encontra 100% reservada.", "warning"); return;
    }
    setItensSelecionados((prev) => [...prev, { id: `manual-${Date.now()}-${index}`, estoque_id: item.idBD || null, ...item, qtdSelecionada: 1 }]);
  };

  const handleEnviar = async () => {
    if (!formDados.nome || !formDados.wbs || !formDados.destino || !formDados.dataNecessidade) { showAlert("Campos Obrigatórios", "Preencha os campos (*).", "warning"); return; }
    if (itensSelecionados.length === 0) { showAlert("Lista Vazia", "Adicione um item.", "warning"); return; }
    if (itensSelecionados.some(i => !i.qtdSelecionada)) { showAlert("Incompleto", "Verifique as quantidades.", "warning"); return; }

    const anexosProcessados = [];
    if (anexos.length > 0) {
      for (const arquivo of anexos) {
        const extensao = arquivo.name.split(".").pop();
        const caminhoNoStorage = `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const { error: erroUpload } = await supabase.storage.from("documentos").upload(caminhoNoStorage, arquivo);
        if (erroUpload) { showAlert("Erro Anexo", `Falha: ${arquivo.name}`, "error"); return; }
        const { data: linkPublico } = supabase.storage.from("documentos").getPublicUrl(caminhoNoStorage);
        anexosProcessados.push({ nome_arquivo: arquivo.name, url_arquivo: linkPublico.publicUrl });
      }
    }

    let observacoesFinais = formDados.observacoes;
    if (formDados.entregaUrgente) observacoesFinais = `[URGÊNCIA: ${formDados.justificativaUrgencia}] ${observacoesFinais}`;

    const payload = { solicitante: { ...formDados, observacoes: observacoesFinais, filial_origem: estoqueAtual }, itens: itensSelecionados, anexos: anexosProcessados };

    try {
      const dados = await apiFetch("/solicitacoes/material", { method: "POST", body: JSON.stringify(payload) });
      if (dados.sucesso || dados.ps) {
        showAlert("Sucesso!", `Solicitação criada: ${dados.ps || dados.ps_id}`, "success");
        setFormDados({ nome: "", wbs: "", destino: "", dataNecessidade: "", observacoes: "", entregaUrgente: false, justificativaUrgencia: "" });
        setItensSelecionados([]); setAnexos([]);
      } else { showAlert("Erro Servidor", dados.erro, "error"); }
    } catch (error) { showAlert("Erro Conexão", "Falha no servidor.", "error"); }
  };

  const listaSegura = Array.isArray(itensSelecionados) ? itensSelecionados : [];

  return (
    <>
      <div className="form-cartao">
        <div className="form-header"><div className="form-header-esquerda"><div className="form-header-icone"><User size={18} /></div><h2>Dados do Solicitante</h2></div></div>
        <div className="form-grid">
          <div className="input-grupo"><label>NOME *</label><input type="text" className="input-campo" placeholder="Seu nome" value={formDados.nome} onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })} /></div>
          <div className="input-grupo"><label>WBS *</label><input type="text" className="input-campo" placeholder="Ex: ABCDE-12345" value={formDados.wbs} onChange={(e) => setFormDados({ ...formDados, wbs: formatarWBS(e.target.value) })} /></div>
          <div className="input-grupo"><label><MapPin size={14} /> FILIAL</label><div className="input-wrapper-fixo"><MapPin size={16} className="icone-dentro-input" /><input type="text" className="input-campo" value={estoqueAtual} readOnly /><span className="badge-fixo">Fixo</span></div></div>
          <div className="input-grupo row-span-2"><label><MapPin size={14} /> DESTINO *</label><textarea className="input-campo" placeholder="Local de destino" value={formDados.destino} onChange={(e) => setFormDados({ ...formDados, destino: e.target.value })}></textarea></div>
          <div className="input-grupo"><label><Calendar size={14} /> DATA *</label><input type="date" className="input-campo" value={formDados.dataNecessidade} min={dataMinima} onChange={(e) => setFormDados({ ...formDados, dataNecessidade: e.target.value })} /></div>
          <div className="input-grupo span-2"><label>OBSERVAÇÕES</label><textarea className="input-campo" rows="2" value={formDados.observacoes} onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })}></textarea></div>
        </div>
        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} />
        <div style={{ padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#f8fafc", marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", width: "100%" }}>
            <input type="checkbox" id="checkbox-urgente" checked={formDados.entregaUrgente} onChange={(e) => setFormDados({ ...formDados, entregaUrgente: e.target.checked, justificativaUrgencia: "" })} style={{ marginTop: "4px", width: "16px", height: "16px" }} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Zap size={16} color={formDados.entregaUrgente ? "#ef4444" : "#475569"} /><label htmlFor="checkbox-urgente" style={{ fontWeight: "600", color: formDados.entregaUrgente ? "#ef4444" : "#0f172a" }}> Entrega Urgente / Atraso </label></div>
              {formDados.entregaUrgente && (<div style={{ marginTop: "16px", width: "100%" }}><label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#ef4444" }}> JUSTIFICATIVA * </label><textarea className="input-campo" placeholder="Motivo..." rows="2" value={formDados.justificativaUrgencia} onChange={(e) => setFormDados({ ...formDados, justificativaUrgencia: e.target.value })} style={{ borderColor: "#fca5a5", backgroundColor: "#fef2f2" }}></textarea></div>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <SeletorEstoqueLateral
          estoque={estoqueDisponivel}
          carregando={carregandoEstoque}
          itensSelecionados={itensSelecionados} 
          onAdicionarItem={adicionarItemDoEstoque}
          onRemoverItem={removerItem}
          onAtualizarQuantidade={atualizarCampo}
        />
      </div>

      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul" onClick={handleEnviar}><Send size={16} /> Enviar Solicitação</button>
      </div>
    </>
  );
}