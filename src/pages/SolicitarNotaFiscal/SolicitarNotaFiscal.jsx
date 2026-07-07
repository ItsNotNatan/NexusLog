import React, { useState } from 'react';
import { User, FileText, Paperclip, Send } from 'lucide-react';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

// IMPORTANTE: Ajusta o caminho se guardaste o formatarDinheiro noutro lugar
import { formatarDinheiro } from '../../utils/formatadores'; 

export default function SolicitarNotaFiscal() {
  
  // 1. ESTADO PARA CONTROLAR OS DADOS DO FORMULÁRIO
  const [formDados, setFormDados] = useState({
    nome: '',
    wbs: '',
    valorEstimado: '',
    descricao: '',
    observacoes: ''
  });

  // Função para lidar com a submissão
  const handleEnviar = () => {
    // Validação simples
    if (!formDados.nome || !formDados.wbs || !formDados.descricao) {
      alert('Por favor, preencha os campos obrigatórios (*).');
      return;
    }
    
    // Aqui no futuro enviarás o formDados para o Backend
    alert(`Enviando Solicitação de Nota Fiscal...\nValor: ${formDados.valorEstimado}`);
  };

  return (
    <div className="nf-container">
      <div className="nf-grid-superior">
        
        {/* CARTÃO: DADOS DO SOLICITANTE */}
        <div className="form-cartao" style={{ marginBottom: 0 }}>
          <div className="form-header">
            <div className="form-header-esquerda">
              <div className="form-header-icone roxo-claro"><User size={18} /></div>
              <h2>Dados do Solicitante</h2>
            </div>
          </div>
          <div className="form-grid coluna-unica">
            <div className="input-grupo">
              <label>NOME *</label>
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="Seu nome completo" 
                value={formDados.nome}
                onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })}
              />
            </div>
            <div className="input-grupo">
              <label>WBS / CENTRO DE CUSTO *</label>
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="Ex: WBS-PRJ-2024-001" 
                value={formDados.wbs}
                onChange={(e) => setFormDados({ ...formDados, wbs: e.target.value })}
              />
            </div>
            
            {/* CAMPO DE VALOR ESTIMADO (COM FORMATAÇÃO) */}
            <div className="input-grupo">
              <label>VALOR ESTIMADO (R$)</label>
              <input 
                type="text" // Alterado para text para suportar o R$
                className="input-campo foco-roxo" 
                placeholder="R$ 0,00" 
                value={formDados.valorEstimado}
                onChange={(e) => setFormDados({ ...formDados, valorEstimado: e.target.value })}
                onBlur={(e) => {
                  // Quando o utilizador clica fora do campo, a função formata o que foi digitado!
                  const valorFormatado = formatarDinheiro(e.target.value);
                  setFormDados({ ...formDados, valorEstimado: valorFormatado });
                }}
              />
            </div>
          </div>
        </div>

        {/* CARTÃO: DETALHES DA NOTA FISCAL */}
        <div className="form-cartao flex-coluna" style={{ marginBottom: 0 }}>
          <div className="form-header">
            <div className="form-header-esquerda">
              <div className="form-header-icone roxo-claro"><FileText size={18} /></div>
              <h2>Detalhes da Nota Fiscal</h2>
            </div>
          </div>
          <div className="form-grid coluna-unica flex-1">
            <div className="input-grupo flex-1">
              <label>DESCRIÇÃO / MOTIVO *</label>
              <textarea 
                className="input-campo foco-roxo flex-1" 
                placeholder="Descreva o motivo..." 
                style={{ minHeight: '120px' }}
                value={formDados.descricao}
                onChange={(e) => setFormDados({ ...formDados, descricao: e.target.value })}
              ></textarea>
            </div>
            <div className="input-grupo mt-4">
              <label>OBSERVAÇÕES</label>
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="Info adicional..." 
                value={formDados.observacoes}
                onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARTÃO: ANEXOS */}
      <div className="form-cartao">
        <div className="form-header" style={{ marginBottom: '16px' }}>
          <div className="form-header-esquerda">
            <div className="form-header-icone cinza redondo"><Paperclip size={18} /></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '2px' }}>Anexos</h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>NFs, documentos ou arquivos de suporte</span>
            </div>
          </div>
        </div>
        <div className="dropzone branca">
          + Clique para adicionar arquivo
        </div>
      </div>

      {/* --- BOTÃO GLOBAL AQUI --- */}
      <BotaoAcaoGlobal 
        texto="Enviar Solicitação de NF" 
        icone={<Send size={16} />} 
        cor="roxo" 
        onClick={handleEnviar} 
      />
      
    </div>
  );
}