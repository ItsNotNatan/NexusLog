import React, { useState, useEffect, useContext } from 'react';
import './TransferenciaWBS.css';
import { Send, MapPin } from 'lucide-react'; 

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
    if (!estoqueAtual || estoqueAtual === 'TODOS') { setEstoqueReal([]); setCarregandoEstoque(false); return; }
    const carregarEstoque = async () => {
      try {
        setCarregandoEstoque(true);
        const resultado = await apiFetch(`/estoque/listar?filial_id=${estoqueAtual}`);
        if (resultado.sucesso) {
          setEstoqueReal(resultado.dados.filter(item => item.quantidade_disponivel > 0));
        }
      } catch (error) { console.error("Falha ao buscar estoque:", error.message); } 
      finally { setCarregandoEstoque(false); }
    };
    carregarEstoque();
  }, [estoqueAtual]); 

  const adicionarItem = (itemOriginal) => {
    if (itensSelecionados.length >= 25) { showAlert("Limite Atingido", "Limite máximo de 25 itens.", "warning"); return; }
    const saldoLivre = itemOriginal.quantidade_disponivel - (itemOriginal.quantidade_reservada || 0);
    if (saldoLivre <= 0) { showAlert("Estoque Reservado", "100% reservado para outras solicitações.", "warning"); return; }

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
    if (!estoqueAtual || estoqueAtual === 'TODOS') { showAlert("Atenção", "Selecione a filial.", "warning"); return; }
    if (!formDados.nome || !formDados.wbsDestino) { showAlert("Campos", "Preencha Nome e WBS.", "warning"); return; }
    if (itensSelecionados.length === 0) { showAlert("Vazio", "Selecione um item.", "warning"); return; }

    const anexosProcessados = [];
    if (anexos.length > 0) {
      for (const arquivo of anexos) {
        const extensao = arquivo.name.split('.').pop();
        const caminhoNoStorage = `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const { error: erroUpload } = await supabase.storage.from('documentos').upload(caminhoNoStorage, arquivo);
        if (erroUpload) { showAlert("Falha", `Erro anexo: ${arquivo.name}`, "error"); return; }
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
        showAlert("Sucesso!", `Transferência PS: ${dados.ps}`, "success");
        setFormDados({ nome: '', wbsDestino: '', justificativa: '', entregaUrgente: false });
        setItensSelecionados([]); setAnexos([]); 
      } else { showAlert("Erro", dados.erro, "error"); }
    } catch (error) { showAlert("Falha", "Erro servidor.", "error"); }
  };

  return (
    <>
      <div className="form-cartao">
        <div className="form-grid">
          <div className="input-grupo"><label>SOLICITANTE *</label><input type="text" className="input-campo" placeholder="Seu nome" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} /></div>
          <div className="input-grupo"><label>WBS DE DESTINO *</label><input type="text" className="input-campo" placeholder="WBS do projeto destino" value={formDados.wbsDestino} onChange={(e) => setFormDados({...formDados, wbsDestino: e.target.value})} /></div>
          <div className="input-grupo"><label><MapPin size={14} /> FILIAL ORIGEM</label><div className="input-wrapper-fixo"><MapPin size={16} className="icone-dentro-input" color="#2563eb" /><input type="text" className="input-campo" value={estoqueAtual} readOnly /><span className="badge-fixo">Fixo</span></div></div>
          <div className="input-grupo span-2"><label>JUSTIFICATIVA</label><textarea className="input-campo" placeholder="Motivo..." rows="2" value={formDados.justificativa} onChange={(e) => setFormDados({...formDados, justificativa: e.target.value})}></textarea></div>
        </div>
        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} />
      </div>

      {/* ✨ O SELETOR FAZ TODO O TRABALHO PESADO! */}
      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <SeletorEstoqueLateral 
          estoque={estoqueReal} 
          carregando={carregandoEstoque} 
          itensSelecionados={itensSelecionados} 
          bloquearTransferidos={true} 
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