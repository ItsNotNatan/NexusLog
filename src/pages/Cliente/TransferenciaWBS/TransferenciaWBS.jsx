import React, { useState, useEffect } from 'react';
import './TransferenciaWBS.css';
import { Search, Send, Trash2, Box, Loader2 } from 'lucide-react'; 

import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import { supabase } from '../../../supabaseClient';

export default function TransferenciaWBS() {
  // --- 1. ESTADOS DO FORMULÁRIO E ITENS ---
  const [formDados, setFormDados] = useState({
    nome: '',
    wbsDestino: '',
    justificativa: '',
    entregaUrgente: false
  });

  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [anexos, setAnexos] = useState([]);

  // --- 2. NOVOS ESTADOS PARA O ESTOQUE REAL ---
  const [estoqueReal, setEstoqueReal] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // --- 3. BUSCAR DADOS REAIS DO BACKEND ---
  useEffect(() => {
    const carregarEstoque = async () => {
      try {
        setCarregandoEstoque(true);
        const resposta = await fetch('http://localhost:3001/api/estoque/listar');
        const resultado = await resposta.json();

        if (resposta.ok && resultado.sucesso) {
          // Filtra apenas itens que tenham saldo maior que zero
          const itensComSaldo = resultado.dados.filter(item => item.quantidade_disponivel > 0);
          setEstoqueReal(itensComSaldo);
        } else {
          console.error("Erro ao buscar estoque:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha de conexão ao buscar estoque:", error);
      } finally {
        setCarregandoEstoque(false);
      }
    };

    carregarEstoque();
  }, []);

  // --- 4. FUNÇÕES DE CÁLCULO DE SALDO ---
  
  // Verifica quanto de um item já foi colocado no carrinho de transferência
  const getQuantidadeJaSelecionada = (idItem) => {
    const itemNoCarrinho = itensSelecionados.find(i => i.id === idItem);
    return itemNoCarrinho ? itemNoCarrinho.qtdTransferencia : 0;
  };

  // Calcula o saldo restante que deve aparecer na tela
  const getSaldoRestante = (item) => {
    return item.quantidade_disponivel - getQuantidadeJaSelecionada(item.id);
  };

  // --- 5. AÇÕES DO CARRINHO ---
  const adicionarItem = (itemOriginal) => {
    // Só adiciona se o saldo restante for maior que zero e se ainda não estiver na lista
    if (getSaldoRestante(itemOriginal) > 0 && !itensSelecionados.find(i => i.id === itemOriginal.id)) {
      setItensSelecionados([
        ...itensSelecionados, 
        { ...itemOriginal, qtdTransferencia: 1 } // Começa sempre com 1 unidade
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
    
    // Trava de segurança: impede que digitem uma quantidade maior que o estoque total
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

  // --- 6. FILTRO DE PESQUISA DO ESTOQUE ---
  const estoqueFiltrado = estoqueReal.filter((item) => {
    const termo = termoBusca.toLowerCase();
    return (
      (item.part_number && item.part_number.toLowerCase().includes(termo)) ||
      (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
      (item.desenho_sap && item.desenho_sap.toLowerCase().includes(termo)) ||
      (item.nf_entrada && item.nf_entrada.toLowerCase().includes(termo))
    );
  });

  // --- 7. ENVIO PARA O BACKEND ---
  const handleEnviar = async () => {
    if (!formDados.nome || !formDados.wbsDestino) {
      alert("Preencha o Nome do Solicitante e o WBS de Destino.");
      return;
    }

    if (itensSelecionados.length === 0) {
      alert("Selecione pelo menos um item para transferir.");
      return;
    }

    const anexosProcessados = [];
    // ... (Lógica de upload do Supabase mantida idêntica à tua original)
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
          alert(`Falha ao anexar o ficheiro: ${arquivo.name}`);
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

    // Mapeamos com base nas chaves reais do banco de dados (estoque)
    const payload = {
      solicitante: {
        nome: formDados.nome,
        wbs: formDados.wbsDestino,
        observacoes: formDados.justificativa,
        entregaUrgente: formDados.entregaUrgente,
        tipo: 'Transferencia WBS' 
      },
      itens: itensSelecionados.map(item => ({
        estoque_id: item.id,
        numPecaFabricante: item.part_number,
        materialDescription: item.descricao,
        qtd: item.qtdTransferencia,
        wbsOrigem: item.wbs,
        alocacao: item.alocacao 
      })),
      anexos: anexosProcessados 
    };

    try {
      const resposta = await fetch('http://localhost:3001/api/solicitacoes/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        alert(`Sucesso! Transferência solicitada. ID: ${dados.ps_id}`);
        setFormDados({ nome: '', wbsDestino: '', justificativa: '', entregaUrgente: false });
        setItensSelecionados([]);
        setAnexos([]); 
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Falha ao conectar com o servidor.");
    }
  };

  return (
    <>
      {/* Formulário Superior Mantido Igual */}
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

        {/* COLUNA ESQUERDA: ESTOQUE DISPONÍVEL */}
        <div className="coluna-cartao">
          <div className="coluna-esquerda-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Estoque Disponível</h3>
              <span className="badge-contador-simples">{estoqueFiltrado.length} itens</span> 
            </div>

            <div className="pesquisa-itens-wrapper">
              <Search size={16} className="icone-busca-itens" />
              <input 
                type="text" 
                placeholder="Buscar por SAP, PN, Descrição..." 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="lista-itens-scroll">
            {carregandoEstoque ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                Carregando estoque do servidor...
              </div>
            ) : estoqueFiltrado.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Nenhum material encontrado.
              </div>
            ) : (
              estoqueFiltrado.map(item => {
                const saldoAtual = getSaldoRestante(item);
                const semSaldo = saldoAtual <= 0;

                return (
                  <div 
                    key={item.id} 
                    className="item-lista" 
                    onClick={() => !semSaldo && adicionarItem(item)}
                    style={{ 
                      cursor: semSaldo ? 'not-allowed' : 'pointer', 
                      padding: '16px 20px',
                      opacity: semSaldo ? 0.5 : 1 // Deixa o item meio transparente se não tiver saldo
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <span className="badge-sap">{item.desenho_sap || 'S/ SAP'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="item-lista-pn" style={{ margin: 0 }}>{item.part_number}</span>
                      <span className="badge-nf">NF: {item.nf_entrada || '—'}</span>
                    </div>
                    
                    <div className="item-lista-desc" style={{ marginBottom: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                      {item.descricao}
                    </div>
                    
                    <div style={{ fontSize: '0.875rem', display: 'flex', gap: '8px' }}>
                      <span style={{ color: semSaldo ? '#ef4444' : '#10b981', fontWeight: '500' }}>
                        Saldo Disponível: <strong style={{ fontWeight: '700' }}>{saldoAtual}</strong>
                      </span>
                      <span style={{ color: '#2563eb', fontFamily: 'monospace' }}>
                        Alocação: {item.alocacao || 'Pendente'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: ITENS SELECIONADOS */}
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
                    <div style={{ marginBottom: '6px' }}><span className="badge-sap" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>{item.desenho_sap}</span></div>
                    <div className="item-lista-pn" style={{ marginBottom: '4px' }}>{item.part_number}</div>
                    <div className="item-lista-desc">{item.descricao}</div>
                    
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