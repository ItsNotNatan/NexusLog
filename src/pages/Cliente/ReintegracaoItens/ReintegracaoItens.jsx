import React, { useState } from 'react';
import { User, RefreshCcw, Search, Send } from 'lucide-react';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import './ReintegracaoItens.css';

// 1. IMPORTAÇÃO DA NOSSA FUNÇÃO CENTRALIZADA
// Trazemos o apiFetch para gerir a comunicação com o servidor de forma inteligente.
import { apiFetch } from '../../../services/api';

const listaDePl = [
  { id: '10976', solicitante: 'TESTE', wbs: 'WBS-PRJ-2024-001', itens: 4, status: 'Em Separação' },
  { id: '10975', solicitante: 'RASDAS', wbs: 'WBS-PRJ-2024-001', itens: 2, status: 'Em Separação' },
  { id: '10974', solicitante: 'DOUGLAS', wbs: 'WBS-PRJ-2024-001', itens: 1, status: 'Em Separação' },
  { id: '10972', solicitante: 'JEFERSON', wbs: 'WBS-PRJ-2024-001', itens: 3, status: 'Em Separação' }
];

export default function ReintegracaoItens() {
  const [nome, setNome] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  const [plSelecionada, setPlSelecionada] = useState(null);

  const handleEnviar = async () => {
    if (!nome || !plSelecionada) {
      alert("Preencha o seu nome e selecione uma PL para reintegrar.");
      return;
    }

    const plDados = listaDePl.find(p => p.id === plSelecionada);

    const payload = {
      solicitante: {
        nome: nome,
        pl_origem: plSelecionada,
        bs_origem: plSelecionada, // Mantido para compatibilidade temporária com o backend antigo
        wbs: plDados.wbs
      }
    };

    try {
      // 2. REFATORAÇÃO DO FETCH
      // Substituímos o fetch nativo pelo apiFetch. Ele já aplica a URL correta, 
      // adiciona os cabeçalhos de JSON e os tokens de segurança.
      const dados = await apiFetch('/solicitacoes/reintegracao', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // A validação de sucesso de rede (resposta.ok) já é feita dentro da apiFetch.
      // Aqui só validamos a lógica de negócio.
      if (dados.sucesso || dados.ps_id || dados.pl_id) {
        alert(`Sucesso! Reintegração solicitada. ID: ${dados.ps_id || dados.pl_id}`);
        setNome('');
        setPlSelecionada(null);
        setPesquisa('');
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      // Qualquer erro de rede ou lançado pela apiFetch cai diretamente aqui.
      console.error("Erro na requisição:", error.message);
      alert("Falha ao conectar com o servidor.");
    }
  };

  const listaFiltrada = listaDePl.filter(pl => 
    pl.id.includes(pesquisa) || 
    pl.solicitante.toLowerCase().includes(pesquisa.toLowerCase()) ||
    pl.wbs.toLowerCase().includes(pesquisa.toLowerCase())
  );

  return (
    <div className="limitador-largura">
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone laranja"><User size={18} /></div>
            <h2>Solicitante</h2>
          </div>
        </div>
        <div className="input-grupo" style={{ maxWidth: '400px' }}>
          <label>NOME *</label>
          <input 
            type="text" 
            className="input-campo foco-laranja" 
            placeholder="Seu nome completo" 
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone laranja"><RefreshCcw size={18} /></div>
            <h2>Selecionar PL de Origem</h2>
          </div>
        </div>
        <div className="pesquisa-wrapper">
          <Search size={18} className="icone-pesquisa" />
          <input 
            type="text" 
            className="input-campo foco-laranja" 
            placeholder="Buscar por nº PL, ID de solicitação ou solicitante..." 
            style={{ paddingLeft: '40px' }} 
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>
        <div className="lista-pl-container">
          {listaFiltrada.map((pl) => (
            <div 
              key={pl.id} 
              className="item-pl"
              style={{
                border: plSelecionada === pl.id ? '2px solid #f97316' : '1px solid #e2e8f0',
                backgroundColor: plSelecionada === pl.id ? '#fff7ed' : '#ffffff'
              }}
              onClick={() => setPlSelecionada(pl.id)}
            >
              <div className="item-pl-info">
                <span className="item-pl-titulo" style={{ color: plSelecionada === pl.id ? '#ea580c' : '#1e293b' }}>
                  PL #{pl.id}
                </span>
                <span className="item-pl-detalhes">{pl.solicitante} &middot; WBS: {pl.wbs} &middot; {pl.itens} itens</span>
              </div>
              <span className="badge-separacao">{pl.status}</span>
            </div>
          ))}
        </div>
      </div>

      <BotaoAcaoGlobal
        texto="Solicitar Reintegração"
        icone={<Send size={16} />}
        cor="laranja"
        onClick={handleEnviar}
      />

    </div>
  );
}