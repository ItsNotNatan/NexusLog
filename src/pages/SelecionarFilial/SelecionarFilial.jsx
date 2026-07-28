import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SelecionarFilial.css';
import { Building2, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SelecionarFilial() {
  // Puxamos a função que atualiza a variável global de filial
  const { setEstoqueAtual } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Pega o destino que foi enviado pela Central de Operações. 
  // Se não houver, assume que o utilizador vai para a raiz '/' por segurança.
  const rotaDestino = location.state?.destinoFinal || '/';
  
  const dadosFiliais = [
    { id: 'BR02', nome: 'BR02 — Santo André', cidade: 'Santo André, SP', cor: 'azul' },
    { id: 'BR04', nome: 'BR04 — Goiana', cidade: 'Goiana, PE', cor: 'azul' },
    { id: 'BR06', nome: 'BR06 — Betim', cidade: 'Betim, MG', cor: 'roxo' }
  ];

  // 🛠️ NOVA FUNÇÃO: Lida com o clique e faz as duas ações necessárias
  const handleSelecionar = (filialId) => {
    setEstoqueAtual(filialId); // 1. Atualiza o cabeçalho e o contexto global
    navigate(rotaDestino);     // 2. Navega para a página desejada
  };

  return (
    <div className="selecionar-filial-container">
      
      {/* Botão de voltar */}
      <div style={{ width: '100%', maxWidth: '42rem' }}>
        <button 
          className="btn-voltar-areas" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} />
          Voltar para Áreas
        </button>
      </div>

      <header className="cabecalho-filial">
        <div className="icone-topo-container">
          <Building2 size={28} />
        </div>
        <h1 className="titulo-filial">Selecionar Filial</h1>
        <p className="subtitulo-filial">
          Escolha a unidade de origem para iniciar sua operação
        </p>
      </header>

      <main className="lista-filiais">
        {dadosFiliais.map((filial) => (
          <div 
            key={filial.id} 
            className="cartao-filial"
            // 👇 AQUI ESTÁ A MÁGICA: Agora chamamos a nossa nova função!
            onClick={() => handleSelecionar(filial.id)}
          >
            <div className={`bloco-icone ${filial.cor === 'azul' ? 'bloco-azul' : 'bloco-roxo'}`}>
              <MapPin size={20} strokeWidth={2.5} />
              <span className="texto-sigla">{filial.id}</span>
            </div>
            <div className="info-filial">
              <h2 className="nome-filial">{filial.nome}</h2>
              <p className="local-filial">{filial.cidade}</p>
            </div>
            <div className="acao-filial">
              <div className={`ponto-status ${filial.cor === 'azul' ? 'ponto-azul' : 'ponto-roxo'}`}></div>
              <ChevronRight className="icone-seta" size={20} />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}