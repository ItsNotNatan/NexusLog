import React, { useState } from 'react';
import './FazerSolicitacao.css';
import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle, 
  User, 
  MapPin, 
  Zap,
  Calendar
} from 'lucide-react';

export default function FazerSolicitacao() {
  // Estado para controlar qual cartão está selecionado. 
  // O padrão é 'material' (Material de Estoque)
  const [tipoAtivo, setTipoAtivo] = useState('material');

  // Array com as opções de solicitação
  const tiposSolicitacao = [
    { 
      id: 'material', 
      titulo: 'Material de Estoque', 
      desc: 'Retirada de itens do almoxarifado', 
      icone: <Boxes size={20} /> 
    },
    { 
      id: 'transferencia', 
      titulo: 'Transferência de WBS', 
      desc: 'Mover material para outro projeto', 
      icone: <ArrowLeftRight size={20} /> 
    },
    { 
      id: 'nf', 
      titulo: 'Solicitar Nota Fiscal', 
      desc: 'Emissão de nota fiscal', 
      icone: <FileText size={20} /> 
    },
    { 
      id: 'entrada', 
      titulo: 'Entrada de Material', 
      desc: 'Solicitar entrada no estoque', 
      icone: <PackagePlus size={20} /> 
    },
    { 
      id: 'crossdocking', 
      titulo: 'Crossdocking', 
      desc: 'Saída via nota fiscal', 
      icone: <Truck size={20} /> 
    },
    { 
      id: 'reintegracao', 
      titulo: 'Reintegração de Itens', 
      desc: 'Devolver material ao estoque', 
      icone: <RefreshCcw size={20} /> 
    },
    { 
      id: 'cancelar', 
      titulo: 'Cancelar BS', 
      desc: 'Cancelar boletim emitido', 
      icone: <XCircle size={20} /> 
    }
  ];

  return (
    <div className="solicitacao-wrapper">
      
      {/* 1. CABEÇALHO */}
      <header className="solicitacao-cabecalho">
        <h1>Fazer Solicitação</h1>
        <p>Escolha o tipo de solicitação que deseja realizar</p>
      </header>

      {/* 2. CARTÕES DE TIPOS (Scroll Horizontal) */}
      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => (
          <div 
            key={tipo.id} 
            className={`tipo-cartao ${tipoAtivo === tipo.id ? 'ativo' : ''}`}
            onClick={() => setTipoAtivo(tipo.id)}
          >
            <div className="tipo-icone">
              {tipo.icone}
            </div>
            <div className="tipo-titulo">{tipo.titulo}</div>
            <div className="tipo-desc">{tipo.desc}</div>
          </div>
        ))}
      </div>

      {/* 3. FORMULÁRIO DE DADOS DO SOLICITANTE */}
      <div className="form-cartao">
        
        {/* Cabeçalho do formulário */}
        <div className="form-header">
          <div className="form-header-icone">
            <User size={18} />
          </div>
          <h2>Dados do Solicitante</h2>
        </div>

        {/* Grid de Inputs */}
        <div className="form-grid">
          
          {/* Linha 1 */}
          <div className="input-grupo">
            <label>NOME DO SOLICITANTE *</label>
            <input type="text" className="input-campo" placeholder="Seu nome completo" />
          </div>
          
          <div className="input-grupo">
            <label>WBS / CENTRO DE CUSTO *</label>
            <input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" />
          </div>

          {/* Linha 2 & 3 misturadas */}
          
          {/* Origem (Ocupa a coluna da esquerda) */}
          <div className="input-grupo">
            <label>
              <MapPin size={14} /> FILIAL DE ORIGEM
            </label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" />
              <input type="text" className="input-campo" value="BR04 — Goiana, PE" readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>

          {/* Destino (Ocupa a coluna da direita e estica por duas linhas) */}
          <div className="input-grupo row-span-2">
            <label>
              <MapPin size={14} /> DESTINO *
            </label>
            <textarea className="input-campo" placeholder="Local de destino do material"></textarea>
          </div>

          {/* Data Necessidade (Ocupa a coluna da esquerda, debaixo da Origem) */}
          <div className="input-grupo">
            <label>
              <Calendar size={14} /> DATA DE NECESSIDADE *
            </label>
            <input type="date" className="input-campo" />
            <span className="texto-ajuda">Informe até quando o material é necessário</span>
          </div>

          {/* Linha 4 (Ocupa as duas colunas) */}
          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo" placeholder="Informações adicionais para a equipe de logística" rows="2"></textarea>
          </div>

        </div>

        {/* 4. CAIXA DE ENTREGA URGENTE */}
        <div className="caixa-urgente">
          <input type="checkbox" className="checkbox-custom" id="urgente-check" />
          <div className="urgente-info">
            <label htmlFor="urgente-check" className="urgente-titulo" style={{cursor: 'pointer'}}>
              <Zap size={16} color="#fbbf24" fill="#fbbf24" /> Entrega Urgente
            </label>
            <span className="urgente-desc">
              Marque apenas se a solicitação for crítica e necessitar de aprovação imediata do Administrador.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}