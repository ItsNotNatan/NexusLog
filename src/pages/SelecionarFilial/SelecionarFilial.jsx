import React from 'react';
// Importamos o ficheiro de estilos
import './SelecionarFilial.css';
// Importamos os ícones (Building2 = Edifício, MapPin = Alfinete do mapa, ChevronRight = Seta)
import { Building2, MapPin, ChevronRight } from 'lucide-react';

export default function SelecionarFilial() {
  
  // Aqui criamos uma lista (Array) com os dados de cada filial.
  // Isto facilita muito a manutenção do código!
  const dadosFiliais = [
    {
      id: 'BR02',
      nome: 'BR02 — Santo André',
      cidade: 'Santo André, SP',
      cor: 'azul' // Usamos isto para definir a cor no CSS
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
      
      {/* 1. CABEÇALHO */}
      <header className="cabecalho-filial">
        <div className="icone-topo-container">
          <Building2 size={28} />
        </div>
        <h1 className="titulo-filial">Selecionar Filial</h1>
        <p className="subtitulo-filial">
          Escolha a unidade de origem para iniciar sua operação
        </p>
      </header>

      {/* 2. LISTA DE FILIAIS */}
      <main className="lista-filiais">
        
        {/* O .map() percorre a nossa lista "dadosFiliais" e cria um HTML para cada item */}
        {dadosFiliais.map((filial) => (
          
          <div key={filial.id} className="cartao-filial">
            
            {/* Bloco do ícone à esquerda */}
            <div className={`bloco-icone ${filial.cor === 'azul' ? 'bloco-azul' : 'bloco-roxo'}`}>
              <MapPin size={20} strokeWidth={2.5} />
              <span className="texto-sigla">{filial.id}</span>
            </div>

            {/* Informação central (Nome e Cidade) */}
            <div className="info-filial">
              <h2 className="nome-filial">{filial.nome}</h2>
              <p className="local-filial">{filial.cidade}</p>
            </div>

            {/* Ação à direita (Ponto de status e Seta) */}
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