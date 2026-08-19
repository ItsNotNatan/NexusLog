import React, { useState, useContext } from 'react';
import { User, FileText, Paperclip, Send, MapPin } from 'lucide-react'; 
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

import { formatarDinheiroTempoReal } from '../../../utils/formatadores';
import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import { supabase } from '../../../supabaseClient';
import { apiFetch } from '../../../services/api';

import { useAlert } from '../../../contexts/AlertContext';
import { AuthContext } from '../../../contexts/AuthContext';

// ✨ FUNÇÃO: Formata o WBS em tempo real
const formatarWBS = (valor) => {
  if (!valor) return '';
  const limpo = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (limpo.length > 5) return `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
  return limpo;
};

export default function SolicitarNotaFiscal() {
  const { showAlert } = useAlert();
  const { estoqueAtual } = useContext(AuthContext); 

  const [formDados, setFormDados] = useState({ nome: '', wbs: '', valorEstimado: '', descricao: '', observacoes: '' });
  const [anexos, setAnexos] = useState([]);

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Atenção", "Por favor, selecione uma filial no topo da página antes de prosseguir.", "warning");
      return;
    }
    if (!formDados.nome || !formDados.wbs || !formDados.descricao) {
      showAlert("Campos Obrigatórios", "Por favor, preencha os campos obrigatórios (*).", "warning");
      return;
    }

    const anexosProcessados = [];
    if (anexos.length > 0) {
      for (const arquivo of anexos) {
        const extensao = arquivo.name.split('.').pop();
        const nomeUnico = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const caminhoNoStorage = `uploads/${nomeUnico}`;

        const { error: erroUpload } = await supabase.storage.from('documentos').upload(caminhoNoStorage, arquivo);

        if (erroUpload) {
          showAlert("Erro no Anexo", `Falha ao anexar o ficheiro: ${arquivo.name}`, "error");
          return; 
        }

        const { data: linkPublico } = supabase.storage.from('documentos').getPublicUrl(caminhoNoStorage);
        anexosProcessados.push({ nome_arquivo: arquivo.name, url_arquivo: linkPublico.publicUrl });
      }
    }

    const payload = {
      solicitante: {
        nome: formDados.nome, wbs: formDados.wbs, valorEstimado: formDados.valorEstimado,
        descricao: formDados.descricao, observacoes: formDados.observacoes,
        tipo: 'Nota Fiscal', filial_origem: estoqueAtual 
      },
      anexos: anexosProcessados 
    };

    try {
      const dados = await apiFetch('/solicitacoes/nota-fiscal', { method: 'POST', body: JSON.stringify(payload) });

      if (dados.sucesso || dados.ps_id) {
        showAlert("Sucesso!", `Solicitação de NF enviada. ID: ${dados.ps_id || dados.ps}`, "success");
        setFormDados({ nome: '', wbs: '', valorEstimado: '', descricao: '', observacoes: '' });
        setAnexos([]);
      } else {
        showAlert("Erro do Servidor", dados.erro, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor. Verifica a tua internet.", "error");
    }
  };

  return (
    <div className="nf-container">
      <div className="nf-grid-superior">
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
              <input type="text" className="input-campo foco-roxo" placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })} />
            </div>
            <div className="input-grupo">
              <label>WBS / CENTRO DE CUSTO *</label>
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="Ex: ABCDE-12345" 
                value={formDados.wbs} 
                // ✨ Formatação em tempo real
                onChange={(e) => setFormDados({ ...formDados, wbs: formatarWBS(e.target.value) })} 
              />
            </div>
            <div className="input-grupo">
              <label>VALOR ESTIMADO (R$)</label>
              <input type="text" className="input-campo foco-roxo" placeholder="R$ 0,00" value={formDados.valorEstimado} onChange={(e) => { const valorFormatado = formatarDinheiroTempoReal(e.target.value); setFormDados({ ...formDados, valorEstimado: valorFormatado }); }} />
            </div>
            <div className="input-grupo">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> FILIAL DE ORIGEM</label>
              <div className="input-wrapper-fixo">
                <MapPin size={16} className="icone-dentro-input" color="#9333ea" />
                <input type="text" className="input-campo" value={estoqueAtual} readOnly />
                <span className="badge-fixo">Fixo</span>
              </div>
            </div>
          </div>
        </div>

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
              <textarea className="input-campo foco-roxo flex-1" placeholder="Descreva o motivo..." style={{ minHeight: '120px' }} value={formDados.descricao} onChange={(e) => setFormDados({ ...formDados, descricao: e.target.value })}></textarea>
            </div>
            <div className="input-grupo mt-4">
              <label>OBSERVAÇÕES</label>
              <input type="text" className="input-campo foco-roxo" placeholder="Info adicional..." value={formDados.observacoes} onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header" style={{ marginBottom: '0px' }}>
          <div className="form-header-esquerda">
            <div className="form-header-icone cinza redondo"><Paperclip size={18} /></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '2px' }}>Anexos</h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>NFs, documentos ou arquivos de suporte</span>
            </div>
          </div>
        </div>
        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} titulo="" />
      </div>

      <BotaoAcaoGlobal texto="Enviar Solicitação de NF" icone={<Send size={16} />} cor="roxo" onClick={handleEnviar} />
    </div>
  );
}