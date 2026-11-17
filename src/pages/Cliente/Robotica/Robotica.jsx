// =================================================================
// ARQUIVO: src/pages/Cliente/Robotica/Robotica.jsx
// DESCRIÇÃO: Formulário de Robótica (Conectado à API)
// =================================================================
import React, { useState, useContext } from 'react';
import { User, FileText, Paperclip, Send, MapPin, Cpu } from 'lucide-react'; 
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import { formatarWBS } from '../../../utils/formatadores';
import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import { useAlert } from '../../../contexts/AlertContext';
import { AuthContext } from '../../../contexts/AuthContext';
import { apiFetch, enviarArquivos } from '../../../services/api';

export default function Robotica() {
  const { showAlert } = useAlert();
  const { estoqueAtual } = useContext(AuthContext); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  // ✨ Trocado 'observacoes' por 'linhas'
  const [formDados, setFormDados] = useState({ nome: '', wbs: '', destino: '', descricao: '', linhas: '' });
  const [anexos, setAnexos] = useState([]);

  const handleEnviar = async () => {
    if (isSubmitting) return;

    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Atenção", "Por favor, selecione uma filial no topo da página antes de prosseguir.", "warning");
      return;
    }
    
    if (!formDados.nome || !formDados.wbs || !formDados.destino || !formDados.descricao) {
      showAlert("Campos Obrigatórios", "Por favor, preencha os campos obrigatórios (*).", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      let anexosSalvos = [];
      if (anexos.length > 0) {
        anexosSalvos = await enviarArquivos(anexos);
      }

      const payload = {
        solicitante: {
          nome: formDados.nome,
          wbs: formDados.wbs,
          destino: formDados.destino,
          // ✨ Enviamos o valor das linhas para o campo observacoes do BD
          observacoes: formDados.linhas ? String(formDados.linhas) : '',
          filial_origem: estoqueAtual
        },
        itens: [
          {
            descricao: formDados.descricao,
            quantidade: 1
          }
        ],
        anexos: anexosSalvos
      };

      const resultado = await apiFetch('/solicitacoes/robotica', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (resultado.sucesso) {
        showAlert("Sucesso!", `Solicitação de Robótica enviada! (PS: ${resultado.ps})`, "success");
        setFormDados({ nome: '', wbs: '', destino: '', descricao: '', linhas: '' });
        setAnexos([]);
      } else {
        throw new Error(resultado.erro || 'Falha ao processar solicitação.');
      }
    } catch (erro) {
      console.error("Erro ao enviar solicitação:", erro);
      showAlert("Erro", erro.message || "Não foi possível enviar a solicitação. Tente novamente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="nf-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', backgroundColor: '#fdf2f8', padding: '16px', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
        <Cpu size={32} color="#ec4899" />
        <div>
          <h2 style={{ margin: 0, color: '#be185d', fontSize: '1.25rem' }}>Módulo de Robótica</h2>
          <p style={{ margin: 0, color: '#9d174d', fontSize: '0.875rem' }}>Solicitações de equipamentos de robótica</p>
        </div>
      </div>

      <div className="nf-grid-superior">
        <div className="form-cartao" style={{ marginBottom: 0 }}>
          <div className="form-header">
            <div className="form-header-esquerda">
              <div className="form-header-icone" style={{ backgroundColor: '#fce7f3', color: '#db2777' }}><User size={18} /></div>
              <h2>Dados do Solicitante</h2>
            </div>
          </div>
          <div className="form-grid coluna-unica">
            <div className="input-grupo">
              <label>NOME *</label>
              <input type="text" className="input-campo" style={{ outlineColor: '#ec4899' }} placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })} disabled={isSubmitting} />
            </div>
            
            <div className="input-grupo">
              <label>WBS / CENTRO DE CUSTO *</label>
              <input type="text" className="input-campo" style={{ outlineColor: '#ec4899' }} placeholder="Ex: ABCDE-12345" value={formDados.wbs} onChange={(e) => setFormDados({ ...formDados, wbs: formatarWBS(e.target.value) })} disabled={isSubmitting} />
            </div>

            <div className="input-grupo">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> DESTINO *</label>
              <input type="text" className="input-campo" style={{ outlineColor: '#ec4899' }} placeholder="Local de entrega / destino" value={formDados.destino} onChange={(e) => setFormDados({ ...formDados, destino: e.target.value })} disabled={isSubmitting} />
            </div>

            <div className="input-grupo">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> FILIAL DE ORIGEM</label>
              <div className="input-wrapper-fixo">
                <MapPin size={16} className="icone-dentro-input" color="#db2777" />
                <input type="text" className="input-campo" value={estoqueAtual} readOnly />
                <span className="badge-fixo">Fixo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-cartao flex-coluna" style={{ marginBottom: 0 }}>
          <div className="form-header">
            <div className="form-header-esquerda">
              <div className="form-header-icone" style={{ backgroundColor: '#fce7f3', color: '#db2777' }}><FileText size={18} /></div>
              <h2>Detalhes do Pedido</h2>
            </div>
          </div>
          <div className="form-grid coluna-unica flex-1">
            <div className="input-grupo flex-1">
              <label>DESCRIÇÃO / MOTIVO *</label>
              <textarea className="input-campo flex-1" style={{ outlineColor: '#ec4899', minHeight: '120px' }} placeholder="Descreva o motivo..." value={formDados.descricao} onChange={(e) => setFormDados({ ...formDados, descricao: e.target.value })} disabled={isSubmitting}></textarea>
            </div>
            
            {/* ✨ CAMPO LINHAS COM REGEX PARA ACEITAR APENAS NÚMEROS INTEIROS POSITIVOS */}
            <div className="input-grupo mt-4">
              <label>LINHAS</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="input-campo" 
                style={{ outlineColor: '#ec4899' }} 
                placeholder="Apenas números inteiros..." 
                value={formDados.linhas} 
                onChange={(e) => {
                  const apenasNumeros = e.target.value.replace(/\D/g, '');
                  setFormDados({ ...formDados, linhas: apenasNumeros });
                }} 
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
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Documentos ou arquivos de suporte</span>
            </div>
          </div>
        </div>
        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} titulo="" />
      </div>

      <BotaoAcaoGlobal 
        texto={isSubmitting ? "A enviar..." : "Enviar Solicitação de Robótica"} 
        icone={<Send size={16} />} 
        cor="roxo" 
        onClick={handleEnviar} 
        carregando={isSubmitting}
      />
    </div>
  );
}
