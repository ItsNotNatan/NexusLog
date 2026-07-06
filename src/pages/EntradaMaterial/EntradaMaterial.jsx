import React, { useState } from 'react';
import { Package, User, Plus, Send, Trash2, Paperclip, X } from 'lucide-react';
import CarregarArquivo from '../../components/CarregarArquivo/CarregarArquivo';

export default function EntradaMaterial() {
  // 1. ESTADO: Dados gerais do formulário
  const [formDados, setFormDados] = useState({
    nome: '',
    wbs: '',
    observacoes: ''
  });

  // 2. ESTADO: Tabela dinâmica de itens (começa com 1 linha vazia)
  // Adicionei os campos extras para bater com o cabeçalho da sua tabela
  const [itens, setItens] = useState([
    { 
      id: Date.now(), 
      desenhoSAP: '', 
      partNumber: '', 
      descricao: '', 
      qtd: '', 
      unid: 'Unid', 
      fornecedor: '', 
      referencia: '',
      wbs: '',
      alocacao: ''
    }
  ]);

  // 3. ESTADO: Ficheiros anexados
  const [anexos, setAnexos] = useState([]);

  // --- FUNÇÕES DE MANIPULAÇÃO ---

  const adicionarItem = () => {
    setItens([
      ...itens,
      { 
        id: Date.now(), 
        desenhoSAP: '', 
        partNumber: '', 
        descricao: '', 
        qtd: '', 
        unid: 'Unid', 
        fornecedor: '', 
        referencia: '',
        wbs: '',
        alocacao: '' 
      }
    ]);
  };

  const removerItem = (id) => {
    if (itens.length > 1) {
      setItens(itens.filter(item => item.id !== id));
    } else {
      alert("A solicitação precisa ter pelo menos um item.");
    }
  };

  const atualizarItem = (id, campo, valor) => {
    setItens(itens.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const handleAnexar = (arquivo) => {
    setAnexos([...anexos, arquivo]);
  };

  const removerAnexo = (indexRemover) => {
    setAnexos(anexos.filter((_, index) => index !== indexRemover));
  };

  // --- ENVIO PARA O BACKEND ---
  const handleEnviar = async () => {
    // Validação básica
    if (!formDados.nome || !formDados.wbs) {
      alert("Preencha o Nome e o WBS do solicitante.");
      return;
    }

    const itensIncompletos = itens.some(i => !i.partNumber || !i.descricao || !i.qtd);
    if (itensIncompletos) {
      alert("Preencha os campos obrigatórios (Part Number, Descrição e Qtd) em todas as linhas.");
      return;
    }

    // Prepara o pacote de dados para enviar ao Node.js
    const payload = {
      solicitante: formDados,
      itens: itens.map(i => ({
        ...i,
        qtdSelecionada: i.qtd // Padronizando o nome da variável pro backend entender
      }))
    };

    try {
      // Faz a requisição POST para o seu servidor backend
      const resposta = await fetch('http://localhost:3001/api/solicitacoes/nova', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        alert(`Sucesso! Solicitação de Entrada enviada. ID: ${dados.ps_id}`);
        // Limpa o formulário
        setFormDados({ nome: '', wbs: '', observacoes: '' });
        setItens([{ id: Date.now(), desenhoSAP: '', partNumber: '', descricao: '', qtd: '', unid: 'Unid', fornecedor: '', referencia: '', wbs: '', alocacao: '' }]);
        setAnexos([]);
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Falha ao conectar com o servidor. Verifique se o backend está rodando na porta 3001.");
    }
  };

  return (
    <div className="entrada-container">
      
      {/* --- AVISO SUPERIOR --- */}
      <div className="banner-aviso banner-verde">
        <Package size={24} />
        <div>
          <strong>Entrada de Material</strong>
          <p>Preencha os dados dos itens a receber. A <strong>alocação física</strong> no armazém será definida pela equipe de Logística após a aprovação.</p>
        </div>
      </div>

      {/* --- BLOCO 1: DADOS DO SOLICITANTE --- */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone verde-claro"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME *</label>
            <input 
              type="text" 
              className="input-campo foco-verde" 
              placeholder="Seu nome completo" 
              value={formDados.nome}
              onChange={(e) => setFormDados({...formDados, nome: e.target.value})}
            />
          </div>
          <div className="input-grupo">
            <label>WBS *</label>
            <input 
              type="text" 
              className="input-campo foco-verde" 
              placeholder="Ex: WBS-PRJ-2024-001" 
              value={formDados.wbs}
              onChange={(e) => setFormDados({...formDados, wbs: e.target.value})}
            />
          </div>
          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES</label>
            <textarea 
              className="input-campo foco-verde" 
              placeholder="Informações adicionais para a conferência..."
              value={formDados.observacoes}
              onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})}
            ></textarea>
          </div>
        </div>
      </div>

      {/* --- BLOCO 2: ITENS DINÂMICOS (AGORA USANDO TABLE) --- */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone verde-quadrado"><Package size={18} /></div>
            <h2>Itens para Entrada</h2>
          </div>
          <button className="btn-adicionar-item" onClick={adicionarItem}>
            <Plus size={16} /> Adicionar Item
          </button>
        </div>
        
        <div className="scroll-tabela-solicitacao">
          <table className="tabela-solicitacao-dados">
            <thead>
              <tr>
                <th>AÇÕES</th>
                <th>MATERIAL DESCRIPTION</th>
                <th>Nº PEÇA FABRICANTE</th>
                <th>QTD. SOLICITADA</th>
                <th>DESENHO SAP</th>
                <th>FORNECEDOR</th>
                <th>REFERÊNCIA</th>
                <th>UNIDADE</th>
                <th>WBS</th>
                <th>ALOCAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => removerItem(item.id)} className="btn-deletar-linha">
                      <Trash2 size={16} />
                    </button>
                  </td>
                  <td style={{ minWidth: '220px' }}>
                    <input className="input-editavel-tabela texto-preto" value={item.descricao} onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)} placeholder="Descrição do item" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela badge-partnumber" value={item.partNumber} onChange={(e) => atualizarItem(item.id, 'partNumber', e.target.value)} placeholder="PN" />
                  </td>
                  <td className="qtd-solicitada-destaque">
                    <input type="number" className="input-inline-tabela" value={item.qtd} onChange={(e) => atualizarItem(item.id, 'qtd', e.target.value)} placeholder="0" min="1" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela texto-cinza-claro" value={item.desenhoSAP} onChange={(e) => atualizarItem(item.id, 'desenhoSAP', e.target.value)} placeholder="SAP" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela texto-cinza-escuro" value={item.fornecedor} onChange={(e) => atualizarItem(item.id, 'fornecedor', e.target.value)} placeholder="Fornecedor" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela texto-cinza" value={item.referencia} onChange={(e) => atualizarItem(item.id, 'referencia', e.target.value)} placeholder="Ref" />
                  </td>
                  <td>
                    <select className="input-editavel-tabela texto-cinza" style={{ width: '80px', appearance: 'auto', padding: '4px' }} value={item.unid} onChange={(e) => atualizarItem(item.id, 'unid', e.target.value)}>
                      <option value="Unid">Unid</option>
                      <option value="Kg">Kg</option>
                      <option value="Metro">Metro</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Litro">Litro</option>
                    </select>
                  </td>
                  <td>
                    <input className="input-editavel-tabela link-azul-fake" value={item.wbs} onChange={(e) => atualizarItem(item.id, 'wbs', e.target.value)} placeholder="WBS" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela link-azul-fake" value={item.alocacao} onChange={(e) => atualizarItem(item.id, 'alocacao', e.target.value)} placeholder="Alocação" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- BLOCO 3: ANEXOS --- */}
      <div className="form-cartao">
        <div className="input-grupo">
          <label>ANEXOS (OPCIONAL - Notas Fiscais, Manuais, Fotos)</label>
          
          <div style={{ marginTop: '8px' }}>
            <CarregarArquivo 
              variante="botao"
              accept=".pdf, .jpg, .png, .xlsx"
              label="Anexar Arquivo"
              icone={<Paperclip size={16} />}
              onFileSelect={handleAnexar}
            />
          </div>

          {/* LISTA DE ARQUIVOS ANEXADOS */}
          {anexos.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {anexos.map((arquivo, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: 'fit-content', minWidth: '300px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{arquivo.name}</span>
                  <button onClick={() => removerAnexo(index)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* --- BLOCO 4: AÇÃO FINAL --- */}
      <div className="form-acoes-final mt-4">
        {/* Adicionei o onClick chamando o handleEnviar */}
        <button className="btn-enviar-azul" style={{ backgroundColor: '#10b981' }} onClick={handleEnviar}>
          <Send size={16} /> Solicitar Entrada de Material
        </button>
      </div>
      
    </div>
  );
}