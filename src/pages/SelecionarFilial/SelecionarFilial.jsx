import React from 'react';
// 1. Importamos o useNavigate para poder trocar de tela
import { useNavigate } from 'react-router-dom';
import './SelecionarFilial.css';
import { Building2, MapPin, ChevronRight } from 'lucide-react';

export default function SelecionarFilial() {
  // 2. Inicializamos o navigate
  const navigate = useNavigate();
  
  const dadosFiliais = [
    {
      id: 'BR02',
      nome: 'BR02 — Santo André',
      cidade: 'Santo André, SP',
      cor: 'azul'
    },
    {
      id: 'BR04',
      nome: 'BR04 — Goiana',
      cidade: 'Goiana, PE',
      cor: 'azul'
    },
    {
      id: 'BR06',
      nome: 'BR06 — Betim',
      cidade: 'Betim, MG',
      cor: 'roxo'
    }
  ];

  return (
    <div className="selecionar-filial-container">
      
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
            // 3. Adicionamos o evento de clique AQUI! 
            // Quando clicar no cartão, vai para a tela do Painel Geral
            onClick={() => navigate('/painel')}
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