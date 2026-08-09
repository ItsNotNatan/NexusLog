import React, { useState } from 'react';
import { User, FileText, Paperclip, Send } from 'lucide-react';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

// IMPORTAÇÕES DA NOVA MAGIA (Formatação, Anexos e Banco de Dados)
import { formatarDinheiroTempoReal } from '../../../utils/formatadores';
import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import { supabase } from '../../../supabaseClient';

// 1. IMPORTAÇÃO DA NOSSA FUNÇÃO CENTRALIZADA
import { apiFetch } from '../../../services/api';

// ✨ 1. IMPORTAÇÃO DO CONTEXTO DE ALERTAS
import { useAlert } from '../../../contexts/AlertContext';

export default function SolicitarNotaFiscal() {
  
  // ✨ 2. INICIALIZAÇÃO DO HOOK DE ALERTAS
  const { showAlert } = useAlert();

  // ESTADO PARA CONTROLAR OS DADOS DO FORMULÁRIO
  const [formDados, setFormDados] = useState({
    nome: '',
    wbs: '',
    valorEstimado: '',
    descricao: '',
    observacoes: ''
  });

  // ESTADO: Onde o nosso componente vai guardar os ficheiros
  const [anexos, setAnexos] = useState([]);

  // --- FUNÇÃO DE ENVIO PARA O BACKEND ---
  const handleEnviar = async () => {
    // ✨ 3. ALERTA DE VALIDAÇÃO (Aviso/Warning)
    if (!formDados.nome || !formDados.wbs || !formDados.descricao) {
      showAlert("Campos Obrigatórios", "Por favor, preencha os campos obrigatórios (*).", "warning");
      return;
    }

    // LÓGICA DE UPLOAD DE IMAGENS PARA O SUPABASE STORAGE
    const anexosProcessados = [];
    if (anexos.length > 0) {
      for (const arquivo of anexos) {
        const extensao = arquivo.name.split('.').pop();
        const nomeUnico = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const caminhoNoStorage = `uploads/${nomeUnico}`;

        // Faz o upload para o bucket 'documentos'
        const { error: erroUpload } = await supabase.storage
          .from('documentos')
          .upload(caminhoNoStorage, arquivo);

        if (erroUpload) {
          console.error("Erro ao subir arquivo:", erroUpload);
          // ✨ 4. ALERTA DE ERRO DE UPLOAD
          showAlert("Erro no Anexo", `Falha ao anexar o ficheiro: ${arquivo.name}`, "error");
          return; 
        }

        // Pega o Link Público
        const { data: linkPublico } = supabase.storage
          .from('documentos')
          .getPublicUrl(caminhoNoStorage);

        anexosProcessados.push({
          nome_arquivo: arquivo.name,
          url_arquivo: linkPublico.publicUrl
        });
      }
    }

    // Monta o payload final
    const payload = {
      solicitante: {
        nome: formDados.nome,
        wbs: formDados.wbs,
        valorEstimado: formDados.valorEstimado,
        descricao: formDados.descricao,
        observacoes: formDados.observacoes,
        tipo: 'Nota Fiscal'
      },
      anexos: anexosProcessados 
    };

    try {
      // 2. REFATORAÇÃO DO FETCH
      // Substituímos o código longo pela chamada simples à API centralizada
      const dados = await apiFetch('/solicitacoes/nota-fiscal', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Validamos a regra de negócio do backend
      if (dados.sucesso || dados.ps_id) {
        // ✨ 5. ALERTA DE SUCESSO
        showAlert("Sucesso!", `Solicitação de NF enviada. ID: ${dados.ps_id || dados.ps}`, "success");
        
        // Limpa os campos após o sucesso
        setFormDados({ nome: '', wbs: '', valorEstimado: '', descricao: '', observacoes: '' });
        setAnexos([]); // Limpa a lista de anexos
      } else {
        // ✨ 6. ALERTA DE ERRO DE REGRA DE NEGÓCIO
        showAlert("Erro do Servidor", dados.erro, "error");
      }
    } catch (error) {
      // Erros de rede ou do servidor são geridos e apresentados aqui
      console.error("Erro na requisição:", error.message);
      // ✨ 7. ALERTA DE ERRO DE CONEXÃO
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor. Verifica a tua internet.", "error");
    }
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
            
            {/* CAMPO DE VALOR ESTIMADO (COM FORMATAÇÃO EM TEMPO REAL) */}
            <div className="input-grupo">
              <label>VALOR ESTIMADO (R$)</label>
              <input 
                type="text" 
                className="input-campo foco-roxo" 
                placeholder="R$ 0,00" 
                value={formDados.valorEstimado}
                onChange={(e) => {
                  const valorDigitado = e.target.value;
                  const valorFormatado = formatarDinheiroTempoReal(valorDigitado);
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
        texto="Enviar Solicitação de NF" 
        icone={<Send size={16} />} 
        cor="roxo" 
        onClick={handleEnviar} 
      />
      
    </div>
  );
}