import React, { useState, useEffect, useContext } from 'react';
import './TransferenciaWBS.css';
import { Send, Trash2, Box } from 'lucide-react'; 

import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import SeletorEstoqueLateral from '../../../components/SeletorEstoqueLateral/SeletorEstoqueLateral';
import { supabase } from '../../../supabaseClient';
import { AuthContext } from '../../../contexts/AuthContext';
import { apiFetch } from '../../../services/api';

// ✨ 1. IMPORTAÇÃO DO CONTEXTO DE ALERTAS
import { useAlert } from '../../../contexts/AlertContext'; 

export default function TransferenciaWBS() {
  const { estoqueAtual } = useContext(AuthContext);

  // ✨ 2. INICIALIZAÇÃO DO HOOK DE ALERTAS
  const { showAlert } = useAlert();

  const [formDados, setFormDados] = useState({
    nome: '',
    wbsDestino: '',
    justificativa: '',
    entregaUrgente: false
  });

  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [estoqueReal, setEstoqueReal] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);

  useEffect(() => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      setEstoqueReal([]);
      setCarregandoEstoque(false);
      return;
    }

    const carregarEstoque = async () => {
      try {
        setCarregandoEstoque(true);
        const resultado = await apiFetch(`/estoque/listar?filial_id=${estoqueAtual}`);

        if (resultado.sucesso) {
          const itensComSaldo = resultado.dados.filter(item => item.quantidade_disponivel > 0);
          setEstoqueReal(itensComSaldo);
        } else {
          console.error("Erro ao buscar estoque:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha de conexão ao buscar estoque:", error.message);
      } finally {
        setCarregandoEstoque(false);
      }
    };

    carregarEstoque();
  }, [estoqueAtual]); 

  const getQuantidadeJaSelecionada = (idItem) => {
    const itemNoCarrinho = itensSelecionados.find(i => i.id === idItem);
    return itemNoCarrinho ? itemNoCarrinho.qtdTransferencia : 0;
  };

  const getSaldoRestante = (item) => {
    return item.quantidade_disponivel - getQuantidadeJaSelecionada(item.id);
  };

  const adicionarItem = (itemOriginal) => {
    if (getSaldoRestante(itemOriginal) > 0 && !itensSelecionados.find(i => i.id === itemOriginal.id)) {
      setItensSelecionados([
        ...itensSelecionados, 
        { ...itemOriginal, qtdTransferencia: 1 }
      ]);
    }
  };

  const removerItem = (id) => {
    setItensSelecionados(itensSelecionados.filter(i => i.id !== id));
  };

  const atualizarQuantidade = (idOriginal, novaQtd) => {
    const itemEstoque = estoqueReal.find(i => i.id === idOriginal);
    if (!itemEstoque) return;

    let qtdFormatada = parseInt(novaQtd) || 1;
    
    if (qtdFormatada > itemEstoque.quantidade_disponivel) {
      qtdFormatada = itemEstoque.quantidade_disponivel;
    }
    if (qtdFormatada < 1) {
      qtdFormatada = 1;
    }

    setItensSelecionados(itensSelecionados.map(i => 
      i.id === idOriginal ? { ...i, qtdTransferencia: qtdFormatada } : i
    ));
  };

  const handleEnviar = async () => {
    // ✨ 3. SUBSTITUIÇÃO DOS ALERTAS NATIVOS PELO SHOWALERT
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Atenção", "Por favor, selecione uma filial de origem específica (ex: BR02) no topo da página antes de solicitar uma transferência.", "warning");
      return;
    }

    if (!formDados.nome || !formDados.wbsDestino) {
      showAlert("Campos Obrigatórios", "Preencha o Nome do Solicitante e o WBS de Destino.", "warning");
      return;
    }

    if (itensSelecionados.length === 0) {
      showAlert("Carrinho Vazio", "Selecione pelo menos um item para transferir.", "warning");
      return;
    }

    const anexosProcessados = [];
    if (anexos.length > 0) {
      for (const arquivo of anexos) {
        const extensao = arquivo.name.split('.').pop();
        const nomeUnico = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const caminhoNoStorage = `uploads/${nomeUnico}`;

        const { error: erroUpload } = await supabase.storage
          .from('documentos')
          .upload(caminhoNoStorage, arquivo);

        if (erroUpload) {
          console.error("Erro ao subir arquivo:", erroUpload);
          showAlert("Falha no Anexo", `Não foi possível anexar o ficheiro: ${arquivo.name}`, "error");
          return; 
        }

        const { data: linkPublico } = supabase.storage
          .from('documentos')
          .getPublicUrl(caminhoNoStorage);

        anexosProcessados.push({
          nome_arquivo: arquivo.name,
          url_arquivo: linkPublico.publicUrl
        });
      }
    }

    const payload = {
      solicitante: {
        nome: formDados.nome,
        wbs: formDados.wbsDestino,
        observacoes: formDados.justificativa,
        entregaUrgente: formDados.entregaUrgente,
        tipo: 'Transferencia WBS',
        filial_origem: estoqueAtual 
      },
      itens: itensSelecionados.map(item => ({
        estoque_id: item.id,
        desenhoSAP: item.desenho_sap || item.desenhoSAP || '-', 
        numPecaFabricante: item.part_number || item.numPecaFabricante || '-',
        materialDescription: item.descricao || item.materialDescription || '-',
        qtd: item.qtdTransferencia,
        wbsOrigem: item.wbs || item.wbs_element || '-',
        alocacao: item.alocacao || '-'
      })),
      anexos: anexosProcessados 
    };

    try {
      const dados = await apiFetch('/solicitacoes/transferencia', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps) {
        // ✨ ALERTA DE SUCESSO!
        showAlert("Sucesso!", `Transferência solicitada com sucesso. PS Gerada: ${dados.ps}`, "success");
        
        setFormDados({ nome: '', wbsDestino: '', justificativa: '', entregaUrgente: false });
        setItensSelecionados([]);
        setAnexos([]); 
      } else {
        // ✨ ALERTA DE ERRO DO SERVIDOR!
        showAlert("Erro do Servidor", dados.erro, "error");
      }
    } catch (error) {
      console.error("Erro na requisição:", error.message);
      // ✨ ALERTA DE ERRO DE CONEXÃO!
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor. Verifica a tua internet.", "error");
    }
  };

  return (
    <>
      <div className="form-cartao">
        <div className="form-grid">
          <div className="input-grupo">
            <label>SOLICITANTE *</label>
            <input 
              type="text" 
              className="input-campo" 
              placeholder="Seu nome"
              value={formDados.nome}
              onChange={(e) => setFormDados({...formDados, nome: e.target.value})}
            />
          </div>

          <div className="input-grupo">
            <label>WBS DE DESTINO *</label>
            <input 
              type="text" 
              className="input-campo" 
              placeholder="WBS do projeto destino"
              value={formDados.wbsDestino}
              onChange={(e) => setFormDados({...formDados, wbsDestino: e.target.value})}
            />
          </div>

          <div className="input-grupo span-2">
            <label>JUSTIFICATIVA</label>
            <textarea 
              className="input-campo" 
              placeholder="Motivo da transferência..." 
              rows="2"
              value={formDados.justificativa}
              onChange={(e) => setFormDados({...formDados, justificativa: e.target.value})}
            ></textarea>
          </div>
        </div>

        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} />
      </div>

      <div className="transferencia-grid-inferior">

        <SeletorEstoqueLateral 
          estoque={estoqueReal}
          carregando={carregandoEstoque}
          onAdicionarItem={adicionarItem}
          itensSelecionados={itensSelecionados} 
          bloquearTransferidos={true} 
        />

        <div className="coluna-cartao">
          <div className="coluna-direita-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
              <Box size={20} color="#2563eb" /> Itens Selecionados
            </div>
            <span className="badge-contador-simples">{itensSelecionados.length} itens</span>
          </div>

          {itensSelecionados.length === 0 ? (
            <div className="estado-vazio-itens" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              Clique num item do estoque para adicionar à transferência.
            </div>
          ) : (
            <div className="lista-itens-scroll">
              {itensSelecionados.map(item => (
                <div key={`selecionado-${item.id}`} className="item-lista" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '6px' }}>
                      <span className="badge-sap" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                        {item.desenho_sap || item.desenhoSAP || 'S/ SAP'}
                      </span>
                    </div>
                    <div className="item-lista-pn" style={{ marginBottom: '4px' }}>{item.part_number || item.numPecaFabricante}</div>
                    <div className="item-lista-desc">{item.descricao || item.materialDescription}</div>
                    
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>QTD:</label>
                      <input 
                        type="number" 
                        min="1"
                        max={item.quantidade_disponivel}
                        value={item.qtdTransferencia}
                        onChange={(e) => atualizarQuantidade(item.id, e.target.value)}
                        style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', color: '#1e293b', fontSize: '0.875rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ {item.quantidade_disponivel} (Total Original)</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => removerItem(item.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}
                    title="Remover item"
                  >
                    <Trash2 size={18} />
                  </button>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul" onClick={handleEnviar}>
          <Send size={16} /> Confirmar Transferência
        </button>
      </div>
    </>
  );
}