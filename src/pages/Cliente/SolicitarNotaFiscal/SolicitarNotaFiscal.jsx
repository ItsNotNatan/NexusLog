// =================================================================
// ARQUIVO: src/pages/Cliente/SolicitarNotaFiscal/SolicitarNotaFiscal.jsx
// DESCRIÇÃO: Ecrã de Solicitação de Nota Fiscal com Proteção Anti-Duplo Clique
// =================================================================
import React, { useState, useContext } from 'react';
import { User, FileText, Paperclip, Send, MapPin } from 'lucide-react'; 
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import { formatarWBS } from '../../../utils/formatadores';
import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import { apiFetch, enviarArquivos } from '../../../services/api';
import { useAlert } from '../../../contexts/AlertContext';
import { AuthContext } from '../../../contexts/AuthContext';

export default function SolicitarNotaFiscal() {
  const { showAlert } = useAlert();
  const { estoqueAtual } = useContext(AuthContext); 

  // ✨ ESTADO DE SEGURANÇA 1: Trava contra múltiplos cliques (Race Condition)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✨ CAMPO DESTINO ADICIONADO AO ESTADO INICIAL
  const [formDados, setFormDados] = useState({ nome: '', wbs: '', destino: '', descricao: '', observacoes: '' });
  const [anexos, setAnexos] = useState([]);

  const handleEnviar = async () => {
    // ✨ BLOQUEIO DE SEGURANÇA: Se já está a enviar, descarta cliques adicionais
    if (isSubmitting) {
      console.warn("Bloqueado: Tentativa de duplo clique interceptada.");
      return; 
    }

    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Atenção", "Por favor, selecione uma filial no topo da página antes de prosseguir.", "warning");
      return;
    }
    
    // ✨ VALIDAÇÃO ATUALIZADA PARA OBRIGAR O DESTINO
    if (!formDados.nome || !formDados.wbs || !formDados.destino || !formDados.descricao) {
      showAlert("Campos Obrigatórios", "Por favor, preencha os campos obrigatórios (*).", "warning");
      return;
    }

    // ✨ FECHA A TRANCA
    setIsSubmitting(true);

    try {
      const anexosProcessados = [];
      if (anexos.length > 0) {
        try {
          anexosProcessados.push(...await enviarArquivos(anexos));
        } catch (erroUpload) {
          showAlert("Erro no Anexo", erroUpload.message || "Falha ao anexar os ficheiros.", "error");
          setIsSubmitting(false); // Solta a trava se falhar o upload
          return;
        }
      }

      const payload = {
        solicitante: {
          nome: formDados.nome, 
          wbs: formDados.wbs, 
          destino: formDados.destino, // ✨ ENVIADO PARA O SERVIDOR
          descricao: formDados.descricao, 
          observacoes: formDados.observacoes,
          tipo: 'Nota Fiscal', 
          filial_origem: estoqueAtual 
        },
        anexos: anexosProcessados 
      };

      const dados = await apiFetch('/solicitacoes/nota-fiscal', { method: 'POST', body: JSON.stringify(payload) });

      if (dados.sucesso || dados.ps_id) {
        showAlert("Sucesso!", `Solicitação de NF enviada. ID: ${dados.ps_id || dados.ps}`, "success");
        setFormDados({ nome: '', wbs: '', destino: '', descricao: '', observacoes: '' });
        setAnexos([]);
      } else {
        showAlert("Erro do Servidor", dados.erro, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor. Verifica a tua internet.", "error");
    } finally {
      // ✨ LIBERTA A TRANCA: quer dê sucesso ou erro, volta a libertar o botão
      setIsSubmitting(false);
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
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="Seu nome completo" 
                value={formDados.nome} 
                onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })} 
                disabled={isSubmitting}
              />
            </div>
            
            <div className="input-grupo">
              <label>WBS / CENTRO DE CUSTO *</label>
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="Ex: ABCDE-12345" 
                value={formDados.wbs} 
                onChange={(e) => setFormDados({ ...formDados, wbs: formatarWBS(e.target.value) })} 
                disabled={isSubmitting}
              />
            </div>

            {/* ✨ NOVO INPUT DE DESTINO NA NOTA FISCAL */}
            <div className="input-grupo">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> DESTINO *</label>
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="Local de entrega / destino" 
                value={formDados.destino} 
                onChange={(e) => setFormDados({ ...formDados, destino: e.target.value })} 
                disabled={isSubmitting}
              />
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
              <textarea 
                className="input-campo foco-roxo flex-1" 
                placeholder="Descreva o motivo..." 
                style={{ minHeight: '120px' }} 
                value={formDados.descricao} 
                onChange={(e) => setFormDados({ ...formDados, descricao: e.target.value })}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
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

      <BotaoAcaoGlobal 
        texto={isSubmitting ? "A processar..." : "Enviar Solicitação de NF"} 
        icone={<Send size={16} />} 
        cor="roxo" 
        onClick={handleEnviar} 
        carregando={isSubmitting} // ✨ O botão reage à trava
      />
    </div>
  );
}
