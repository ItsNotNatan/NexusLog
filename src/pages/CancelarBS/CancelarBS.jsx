import React, { useState } from 'react'; // Adicionado useState para controle de dados
import { AlertTriangle, XCircle, Search } from 'lucide-react';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

const listaDeBs = [
  { id: '10976', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', itens: 4, status: 'Em Separação' },
  { id: '10975', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', itens: 2, status: 'Em Separação' },
  { id: '10974', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', itens: 1, status: 'Em Separação' },
  { id: '10972', solicitante: 'JEFERSON', wbs: 'WBS-PRJ-2024-001', itens: 3, status: 'Em Separação' }
];

export default function CancelarBS() {
  const [pesquisa, setPesquisa] = useState('');
  const [bsSelecionada, setBsSelecionada] = useState(null); // Guarda o ID da BS escolhida

  // --- FUNÇÃO DE ENVIO REAL PARA O BACKEND (NODE.JS) ---
  const handleEnviar = async () => {
    if (!bsSelecionada) {
      alert("Por favor, selecione uma BS na lista para prosseguir com o cancelamento.");
      return;
    }

    // Encontra os dados completos da BS que foi selecionada
    const dadosDaBs = listaDeBs.find(b => b.id === bsSelecionada);

    // Monta o Payload seguindo a estrutura que o banco espera
    const payload = {
      solicitante: {
        nome: dadosDaBs.solicitante,
        wbs: dadosDaBs.wbs,
        observacoes: `[CANCELAMENTO] Solicitação automática de cancelamento para a BS #${bsSelecionada}`,
        tipo: 'Cancelado' 
      },
      itens: [] // Como é cancelamento de um boletim inteiro, enviamos os metadados no bloco principal
    };

    try {
      const resposta = await fetch('http://localhost:3001/api/solicitacoes/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        alert(`Sucesso! Solicitação de Cancelamento registrada sob o ID: ${dados.ps_id}`);
        // Reseta a tela
        setBsSelecionada(null);
        setPesquisa('');
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Falha ao conectar com o servidor backend. Verifique se a API está rodando na porta 3001.");
    }
  };

  // --- FILTRO EM TEMPO REAL DA PESQUISA ---
  const listaFiltrada = listaDeBs.filter(bs => 
    bs.id.includes(pesquisa) || 
    bs.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    bs.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

  return (
    <div className="limitador-largura">
      
      {/* AVISO SUPERIOR */}
      <div className="banner-aviso banner-vermelho">
        <AlertTriangle size={24} />
        <div>
          <strong>Cancelamento de BS</strong>
          <p>Selecione os itens e quantidades que retornarão ao estoque. Esta ação não pode ser desfeita.</p>
        </div>
      </div>

      {/* CARTÃO DE PESQUISA */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone vermelho"><XCircle size={18} /></div>
            <h2>Selecionar BS para Cancelar</h2>
          </div>
        </div>
        
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input 
            type="text" 
            className="input-campo foco-vermelho" 
            placeholder="Buscar por nº BS, ID ou solicitante..." 
            style={{ paddingLeft: '40px' }}
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)} // Atualiza o termo digitado
          />
        </div>
        
        {/* LISTA DINÂMICA */}
        <div className="lista-bs-container">
          {listaFiltrada.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '16px' }}>
              Nenhum boletim de saída encontrado para essa busca.
            </p>
          ) : (
            listaFiltrada.map((bs) => (
              <div 
                key={bs.id} 
                // Adiciona dinamicamente uma classe css/borda se o item for o selecionado
                className="item-bs"
                style={{
                  border: bsSelecionada === bs.id ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  backgroundColor: bsSelecionada === bs.id ? '#fef2f2' : '#ffffff'
                }}
                onClick={() => setBsSelecionada(bs.id)} // Seleciona o item ao clicar
              >
                <div className="item-bs-info">
                  <span className="item-bs-titulo" style={{ color: bsSelecionada === bs.id ? '#dc2626' : '#1e293b' }}>
                    BS #{bs.id}
                  </span>
                  <span className="item-bs-detalhes">{bs.solicitante} &middot; {bs.itens} itens &middot; WBS: {bs.wbs}</span>
                </div>
                <span className="badge-separacao">{bs.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- BOTÃO GLOBAL INTEGRADO --- */}
      <BotaoAcaoGlobal 
        texto="Confirmar Cancelamento" 
        icone={<AlertTriangle size={16} />} 
        cor="vermelho" 
        onClick={handleEnviar} 
      />

    </div>
  );
}