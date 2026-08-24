import React, { useState, useEffect, useContext } from 'react';
import './TransferenciaWBS.css';
import { Send, Box, MapPin, X } from 'lucide-react'; 

import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import SeletorEstoqueLateral from '../../../components/SeletorEstoqueLateral/SeletorEstoqueLateral';
import { supabase } from '../../../supabaseClient';
import { AuthContext } from '../../../contexts/AuthContext';
import { apiFetch } from '../../../services/api';
import { useAlert } from '../../../contexts/AlertContext'; 

export default function TransferenciaWBS() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [formDados, setFormDados] = useState({ nome: '', wbsDestino: '', justificativa: '', entregaUrgente: false });
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [estoqueReal, setEstoqueReal] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);

  useEffect(() => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      setEstoqueReal([]); setCarregandoEstoque(false); return;
    }
    const carregarEstoque = async () => {
      try {
        setCarregandoEstoque(true);
        const resultado = await apiFetch(`/estoque/listar?filial_id=${estoqueAtual}`);
        if (resultado.sucesso) {
          const itensComSaldo = resultado.dados.filter(item => item.quantidade_disponivel > 0);
          setEstoqueReal(itensComSaldo);
        }
      } catch (error) { console.error("Falha ao buscar estoque:", error.message); } 
      finally { setCarregandoEstoque(false); }
    };
    carregarEstoque();
  }, [estoqueAtual]); 

  const adicionarItem = (itemOriginal) => {
    if (itensSelecionados.length >= 25) { showAlert("Limite Atingido", "Limite máximo de 25 itens.", "warning"); return; }
    
    // ✨ VERIFICA SE O ITEM TEM SALDO LIVRE ANTES DE DEIXAR ADICIONAR
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
    
    // ✨ O MÁXIMO PERMITIDO É APENAS O SALDO LIVRE (Saldo - Reservado)
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

    const anexosProcessados = [];
    if (anexos.length > 0) {
      for (const arquivo of anexos) {
        const extensao = arquivo.name.split('.').pop();
        const caminhoNoStorage = `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const { error: erroUpload } = await supabase.storage.from('documentos').upload(caminhoNoStorage, arquivo);
        if (erroUpload) { showAlert("Falha no Anexo", `Erro: ${arquivo.name}`, "error"); return; }
        const { data: linkPublico } = supabase.storage.from('documentos').getPublicUrl(caminhoNoStorage);
        anexosProcessados.push({ nome_arquivo: arquivo.name, url_arquivo: linkPublico.publicUrl });
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
          <div className="input-grupo"><label>SOLICITANTE *</label><input type="text" className="input-campo" placeholder="Seu nome" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} /></div>
          <div className="input-grupo"><label>WBS DE DESTINO *</label><input type="text" className="input-campo" placeholder="WBS do projeto destino" value={formDados.wbsDestino} onChange={(e) => setFormDados({...formDados, wbsDestino: e.target.value})} /></div>
          <div className="input-grupo"><label><MapPin size={14} /> FILIAL DE ORIGEM</label><div className="input-wrapper-fixo"><MapPin size={16} className="icone-dentro-input" color="#2563eb" /><input type="text" className="input-campo" value={estoqueAtual} readOnly /><span className="badge-fixo">Fixo</span></div></div>
          <div className="input-grupo span-2"><label>JUSTIFICATIVA</label><textarea className="input-campo" placeholder="Motivo da transferência..." rows="2" value={formDados.justificativa} onChange={(e) => setFormDados({...formDados, justificativa: e.target.value})}></textarea></div>
        </div>
        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px minmax(0, 1fr)", gap: "24px", marginTop: "24px", alignItems: "start" }}>
        <SeletorEstoqueLateral estoque={estoqueReal} carregando={carregandoEstoque} onAdicionarItem={adicionarItem} itensSelecionados={itensSelecionados} bloquearTransferidos={true} />

        <div className="painel-lista" style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div className="painel-lista-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", color: "#0f172a", fontSize: "1.1rem" }}><Box size={20} color="#2563eb" /> Itens Selecionados</div>
            <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '16px' }}>{itensSelecionados.length} / 25</span>
          </div>

          {itensSelecionados.length === 0 ? (
            <div className="estado-vazio-itens" style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}><Box size={48} strokeWidth={1} style={{ opacity: 0.3, margin: "0 auto 16px auto", display: "block" }} /><p>Clique nos itens do estoque à esquerda.</p></div>
          ) : (
            <div className="scroll-tabela-solicitacao" style={{ overflowX: "auto" }}>
              <table className="tabela-solicitacao-dados" style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#2563eb", fontWeight: "700" }}>DESENHO SAP</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>PART NUMBER</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>DESCRIÇÃO</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>NF ENTRADA</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>ALOCAÇÃO</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>WBS ITEM</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#10b981", fontWeight: "700" }}>SALDO</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#f59e0b", fontWeight: "700" }}>RESERVADO</th>
                    <th style={{ padding: "16px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>QTD</th>
                    <th style={{ padding: "16px", width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {itensSelecionados.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "16px", backgroundColor: "#f8fafc", color: "#2563eb", fontWeight: "600", fontFamily: "monospace", fontSize: "0.85rem" }}>{item.desenho_sap || item.desenhoSAP || "-"}</td>
                      <td style={{ padding: "16px", fontWeight: "700", color: "#334155", fontFamily: "monospace", fontSize: "0.85rem" }}>{item.part_number || item.numPecaFabricante || "-"}</td>
                      <td style={{ padding: "16px", color: "#475569", fontSize: "0.85rem", minWidth: "200px" }}>{item.descricao || item.materialDescription || "-"}</td>
                      <td style={{ padding: "16px", color: "#64748b", fontFamily: "monospace", fontSize: "0.85rem" }}>{item.nf_entrada || item.nf || "-"}</td>
                      <td style={{ padding: "16px", color: "#2563eb", fontFamily: "monospace", fontSize: "0.85rem" }}>{item.alocacao || "-"}</td>
                      <td style={{ padding: "16px", color: "#64748b", fontFamily: "monospace", fontSize: "0.85rem" }}>{item.wbs_element || item.wbs || "-"}</td>
                      <td style={{ padding: "16px", color: "#10b981", fontWeight: "600", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{item.quantidade_disponivel || 0} <span style={{ fontSize: "0.75rem", fontWeight: "normal" }}>{item.unidade_medida || item.unidadeMedida || 'Unid'}</span></td>
                      
                      {/* ✨ AQUI ESTÁ A QUANTIDADE RESERVADA VISÍVEL! */}
                      <td style={{ padding: "16px", color: "#f59e0b", fontWeight: "600", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {item.quantidade_reservada || 0} <span style={{ fontSize: "0.75rem", fontWeight: "normal" }}>{item.unidade_medida || item.unidadeMedida || 'Unid'}</span>
                      </td>
                      
                      <td style={{ padding: "16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input type="number" min="1" max={(item.quantidade_disponivel || 0) - (item.quantidade_reservada || 0)} value={item.qtdTransferencia !== undefined ? item.qtdTransferencia : 1} onChange={(e) => atualizarQuantidade(item.id, e.target.value)} style={{ width: "60px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 8px", outline: "none", color: "#0f172a", textAlign: "center", backgroundColor: "#f8fafc", fontWeight: "600" }} />
                          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{item.unidade_medida || item.unidadeMedida || 'Unid'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", padding: "16px" }}><button onClick={() => removerItem(item.id)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="form-acoes-final mt-4"><button className="btn-enviar-azul" onClick={handleEnviar}><Send size={16} /> Confirmar Transferência</button></div>
    </>
  );
}