import React, { useState } from 'react';
import './TransferenciaWBS.css';
import { Search, Send, Trash2, Box } from 'lucide-react'; 

import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import { supabase } from '../../../supabaseClient';

// 👇 DADOS MOCKADOS: Removida a propriedade 'un'
const itensDisponiveis = [
  { id: 1, sap: 'TLXXX-0000030944', pn: 'BLW-ES', desc: 'BLOQUEADOR PARA VÁLVULA DE ESFERA', nf: '7446', wbs: 'BRBCBBB20', qtd: 43, alocacao: '200-E-006-0054' },
  { id: 2, sap: 'TMC000000009467', pn: '19 30 006 0446', desc: 'BASE PARA TOMADA HC 2 PEGS M25', nf: 'AR-8927', wbs: 'WBS-PRJ-2024-001', qtd: 2, alocacao: '002-B-004' },
  { id: 3, sap: 'TLXXX-000002345', pn: '09 16 024 3101', desc: 'INSERTO FEMEA 24POLOS PE', nf: 'AR-8927', wbs: 'WBS-PRJ-2024-001', qtd: 17, alocacao: '002-B-004' },
];

export default function TransferenciaWBS() {
  const [formDados, setFormDados] = useState({
    nome: '',
    wbsDestino: '',
    justificativa: '',
    entregaUrgente: false
  });

  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [anexos, setAnexos] = useState([]);

  const adicionarItem = (item) => {
    if (!itensSelecionados.find(i => i.id === item.id)) {
      setItensSelecionados([...itensSelecionados, { ...item, qtdTransferencia: 1 }]);
    }
  };

  const removerItem = (id) => {
    setItensSelecionados(itensSelecionados.filter(i => i.id !== id));
  };

  const atualizarQuantidade = (id, novaQtd) => {
    const qtdFormatada = Math.max(1, parseInt(novaQtd) || 1);
    setItensSelecionados(itensSelecionados.map(i => 
      i.id === id ? { ...i, qtdTransferencia: qtdFormatada } : i
    ));
  };

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

    const payload = {
      solicitante: {
        nome: formDados.nome,
        wbs: formDados.wbsDestino,
        observacoes: formDados.justificativa,
        entregaUrgente: formDados.entregaUrgente,
        tipo: 'Transferencia WBS' 
      },
      itens: itensSelecionados.map(item => ({
        numPecaFabricante: item.pn,
        materialDescription: item.desc,
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

        <div className="coluna-cartao">
          <div className="coluna-esquerda-header">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Estoque Disponível</h3>
              <span className="badge-contador-simples">116 itens</span> 
            </div>

            <div className="pesquisa-itens-wrapper">
              <Search size={16} className="icone-busca-itens" />
              <input type="text" placeholder="Buscar por SAP, PN, Descrição..." />
            </div>
          </div>

          <div className="lista-itens-scroll">
            {itensDisponiveis.map(item => (
              <div 
                key={item.id} 
                className="item-lista" 
                onClick={() => adicionarItem(item)}
                style={{ cursor: 'pointer', padding: '16px 20px' }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <span className="badge-sap">{item.sap}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="item-lista-pn" style={{ margin: 0 }}>{item.pn}</span>
                  <span className="badge-nf">NF: {item.nf}</span>
                </div>
                
                <div className="item-lista-desc" style={{ marginBottom: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                  {item.desc}
                </div>
                
                <div style={{ fontSize: '0.875rem', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#10b981', fontWeight: '500' }}>
                    {/* 👇 Removido o item.un aqui */}
                    Saldo: <strong style={{ fontWeight: '700' }}>{item.qtd}</strong>
                  </span>
                  <span style={{ color: '#2563eb', fontFamily: 'monospace' }}>
                    {item.alocacao}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="coluna-cartao">
          <div className="coluna-direita-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
              <Box size={20} color="#2563eb" /> Itens Selecionados
            </div>
            <span className="badge-contador-simples">{itensSelecionados.length}/25</span>
          </div>

          {itensSelecionados.length === 0 ? (
            <div className="estado-vazio-itens" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            </div>
          ) : (
            <div className="lista-itens-scroll">
              {itensSelecionados.map(item => (
                <div key={`selecionado-${item.id}`} className="item-lista" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '6px' }}><span className="badge-sap" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>{item.sap}</span></div>
                    <div className="item-lista-pn" style={{ marginBottom: '4px' }}>{item.pn}</div>
                    <div className="item-lista-desc">{item.desc}</div>
                    
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>QTD:</label>
                      <input 
                        type="number" 
                        min="1"
                        max={item.qtd}
                        value={item.qtdTransferencia}
                        onChange={(e) => atualizarQuantidade(item.id, e.target.value)}
                        style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', color: '#1e293b', fontSize: '0.875rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ {item.qtd} (Saldo)</span>
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