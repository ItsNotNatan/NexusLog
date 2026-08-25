// =================================================================
// ARQUIVO: src/pages/Cliente/FazerSolicitacao/MaterialEstoque.jsx
// DESCRIÇÃO: Ecrã para solicitar material do estoque com TEMPO REAL e Verificação de WBS (Prefixo)
// =================================================================
import React, { useState, useEffect, useContext } from "react";
import { User, MapPin, Calendar, Send, Zap, AlertTriangle, Upload, X } from "lucide-react";

import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';

import GerenciadorAnexos from "../../../components/GerenciadorAnexos/GerenciadorAnexos";
import SeletorEstoqueLateral from "../../../components/SeletorEstoqueLateral/SeletorEstoqueLateral";
import CarregarArquivo from "../../../components/CarregarArquivo/CarregarArquivo"; 
import { supabase } from "../../../supabaseClient";
import { apiFetch } from '../../../services/api';
import { io } from 'socket.io-client';

// ✨ FUNÇÃO: Força maiúsculas e permite que o utilizador coloque o hífen onde quiser
const formatarWBS = (valor) => {
  if (!valor) return '';
  // Transforma em maiúsculas e aceita apenas letras, números e hífens
  return valor.toUpperCase().replace(/[^A-Z0-9-]/g, '');
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
  const [anexoAutorizacao, setAnexoAutorizacao] = useState(null); 
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);

  useEffect(() => {
    const hoje = new Date();
    const timezoneOffset = hoje.getTimezoneOffset() * 60000;
    setDataMinima(new Date(hoje.getTime() - timezoneOffset).toISOString().split("T")[0]);
  }, []);

  // ✨ NOVA LÓGICA DE DIVERGÊNCIA: Compara apenas o que está antes do primeiro hífen "-"
  const prefixoWbsPrincipal = formDados.wbs.split('-')[0].trim().toUpperCase();
  
  const temWbsDivergente = itensSelecionados.some(item => {
    const itemWbs = (item.wbs || item.wbs_element || '').trim().toUpperCase();
    
    // Se o item não tem WBS definido, ignora a divergência
    if (itemWbs === '' || itemWbs === '-') return false;
    
    const prefixoItemWbs = itemWbs.split('-')[0].trim().toUpperCase();
    
    // Só acusa divergência se o form tiver WBS e os prefixos forem efetivamente diferentes
    return prefixoWbsPrincipal !== '' && prefixoItemWbs !== prefixoWbsPrincipal;
  });

  // Limpa o anexo se a divergência for resolvida (ex: cliente remove o item divergente)
  useEffect(() => {
    if (!temWbsDivergente && anexoAutorizacao) {
      setAnexoAutorizacao(null);
    }
  }, [temWbsDivergente, anexoAutorizacao]);

  // Buscar dados e ligar o radar em tempo real
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

          // Sincroniza o carrinho
          setItensSelecionados(prevSelecionados => 
            prevSelecionados.map(selecionado => {
              const itemFresco = itensComSaldo.find(i => i.idBD === selecionado.estoque_id);
              if (itemFresco) {
                const saldoLivreNovo = itemFresco.qtdFornecida - (itemFresco.qtdReservada || 0);
                let novaQtdSelecionada = selecionado.qtdSelecionada;
                
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

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const SOCKET_URL = BACKEND_URL.replace(/\/api\/?$/, ''); 
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('estoque_atualizado', () => { buscarEstoqueReal(); });
    socket.on('solicitacoes_atualizadas', () => { buscarEstoqueReal(); });

    return () => socket.disconnect();
  }, [estoqueAtual]);

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

    // Trava de Segurança da Autorização WBS
    if (temWbsDivergente && !anexoAutorizacao) {
      showAlert("Autorização Pendente", "Como existe divergência no prefixo da WBS nos itens, é obrigatório anexar a autorização do responsável no banner amarelo.", "warning");
      return;
    }

    const anexosProcessados = [];
    
    try {
      // 1. Sobe os anexos normais
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

      // 2. Sobe o anexo de autorização WBS com uma tag especial no nome
      if (temWbsDivergente && anexoAutorizacao) {
        const extensao = anexoAutorizacao.name.split('.').pop();
        const caminhoNoStorage = `uploads/auth-wbs-${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const { error: erroUploadAuth } = await supabase.storage.from('documentos').upload(caminhoNoStorage, anexoAutorizacao);

        if (erroUploadAuth) {
          showAlert("Erro de Autorização", `Falha ao anexar o documento de autorização.`, "error");
          return;
        }
        const { data: linkAuth } = supabase.storage.from('documentos').getPublicUrl(caminhoNoStorage);
        anexosProcessados.push({ nome_arquivo: `[AUTORIZAÇÃO WBS] ${anexoAutorizacao.name}`, url_arquivo: linkAuth.publicUrl });
      }

      let observacoesFinais = formDados.observacoes;
      if (formDados.entregaUrgente) observacoesFinais = `[URGÊNCIA: ${formDados.justificativaUrgencia}] ${observacoesFinais}`;

      const payload = { solicitante: { ...formDados, observacoes: observacoesFinais, filial_origem: estoqueAtual }, itens: itensSelecionados, anexos: anexosProcessados };

      const dados = await apiFetch("/solicitacoes/material", { method: "POST", body: JSON.stringify(payload) });
      if (dados.sucesso || dados.ps) {
        showAlert("Sucesso!", `Solicitação criada: ${dados.ps || dados.ps_id}`, "success");
        setFormDados({ nome: "", wbs: "", destino: "", dataNecessidade: "", observacoes: "", entregaUrgente: false, justificativaUrgencia: "" });
        setItensSelecionados([]); 
        setAnexos([]);
        setAnexoAutorizacao(null);
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
        
        <div style={{ 
          padding: "20px", border: formDados.entregaUrgente ? "2px dashed #dc2626" : "1px solid #cbd5e1", 
          borderRadius: "8px", backgroundColor: formDados.entregaUrgente ? "#fef2f2" : "#f8fafc", 
          marginTop: "20px", transition: "all 0.3s ease" 
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", width: "100%" }}>
            <input 
              type="checkbox" id="checkbox-urgente" checked={formDados.entregaUrgente} 
              onChange={(e) => setFormDados({ ...formDados, entregaUrgente: e.target.checked, justificativaUrgencia: "" })} 
              style={{ marginTop: "4px", width: "20px", height: "20px", cursor: "pointer", accentColor: "#dc2626" }} 
            />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {formDados.entregaUrgente ? <AlertTriangle size={20} color="#dc2626" /> : <Zap size={18} color="#475569" />}
                <label 
                  htmlFor="checkbox-urgente" 
                  style={{ 
                    fontWeight: formDados.entregaUrgente ? "900" : "600", color: formDados.entregaUrgente ? "#991b1b" : "#0f172a", 
                    cursor: "pointer", fontSize: formDados.entregaUrgente ? "1.1rem" : "0.9rem", textTransform: formDados.entregaUrgente ? "uppercase" : "none"
                  }}
                > 
                  {formDados.entregaUrgente ? "Sinalizar Falha de Planejamento (URGÊNCIA)" : "Entrega Urgente / Atraso"} 
                </label>
              </div>
              {!formDados.entregaUrgente && (
                <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}> 
                  Marque apenas se houver uma urgência real ou atraso na obra.
                </span>
              )}
              {formDados.entregaUrgente && (
                <div style={{ marginTop: "16px", width: "100%", animation: "fadeIn 0.3s ease" }}>
                  <div style={{ backgroundColor: "#fee2e2", borderLeft: "4px solid #dc2626", padding: "12px 16px", marginBottom: "20px", borderRadius: "0 4px 4px 0" }}>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#7f1d1d", fontWeight: "600", lineHeight: "1.5" }}>
                      ATENÇÃO: A marcação de urgência fura a fila padrão de processamento logístico e será tratada como uma quebra do fluxo normal. Este registo será diretamente reportado aos Administradores.
                    </p>
                  </div>
                  <label style={{ fontSize: "0.80rem", fontWeight: "800", color: "#991b1b", marginBottom: "8px", display: "block" }}> 
                    JUSTIFIQUE A FALHA DE PLANEJAMENTO * 
                  </label>
                  <textarea 
                    className="input-campo" 
                    placeholder="Por que você não conseguiu se planejar a tempo? Justifique detalhadamente o motivo da falha e o impacto direto caso o material não seja entregue." 
                    rows="4" value={formDados.justificativaUrgencia} onChange={(e) => setFormDados({ ...formDados, justificativaUrgencia: e.target.value })} 
                    style={{ borderColor: "#ef4444", backgroundColor: "#ffffff", color: "#450a0a", outlineColor: "#dc2626", boxShadow: "inset 0 1px 3px rgba(220,38,38,0.1)", fontWeight: "500" }}
                  ></textarea>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✨ BANNER DE WBS DIVERGENTE COM LÓGICA DE PREFIXO */}
      {temWbsDivergente && (
        <div style={{ 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fde68a', 
          borderRadius: '8px', 
          padding: '16px', 
          marginTop: '24px',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px' }}>
            <AlertTriangle size={20} />
            <strong style={{ fontSize: '1rem' }}>Atenção: WBS Divergente</strong>
          </div>
          <p style={{ color: '#78350f', fontSize: '0.875rem', marginBottom: '16px', marginTop: 0 }}>
            Um ou mais itens pertencem a um macro-projeto (prefixo) diferente da WBS informada. É necessário anexar a autorização do responsável.
          </p>
          
          {!anexoAutorizacao ? (
            <div style={{ 
              border: '1px dashed #fcd34d', 
              borderRadius: '8px', 
              backgroundColor: '#fffbeb',
              transition: 'all 0.2s',
              overflow: 'hidden'
            }}>
              <CarregarArquivo 
                variante="area" 
                accept=".pdf, .jpg, .png, .jpeg, .msg" 
                label="Anexar autorização do responsável (obrigatório)" 
                icone={<Upload size={20} color="#f59e0b" />} 
                onFileSelect={(file) => setAnexoAutorizacao(file)} 
              />
            </div>
          ) : (
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', 
              border: '1px solid #fcd34d' 
            }}>
              <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>
                {anexoAutorizacao.name}
              </span>
              <button 
                onClick={() => setAnexoAutorizacao(null)} 
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                title="Remover autorização"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <SeletorEstoqueLateral
          estoque={estoqueDisponivel}
          carregando={carregandoEstoque}
          itensSelecionados={listaSegura} 
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