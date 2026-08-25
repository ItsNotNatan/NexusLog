import React, { useState, useContext } from 'react'; 
import { Package, User, Upload, Send, Plus, Trash2, AlertTriangle, FileText, MapPin } from 'lucide-react';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import GerenciadorAnexos from '../../../components/GerenciadorAnexos/GerenciadorAnexos';
import { supabase } from '../../../supabaseClient';
import { AuthContext } from '../../../contexts/AuthContext';
import { apiFetch } from '../../../services/api';
import { useAlert } from '../../../contexts/AlertContext';

// ✨ IMPORTAÇÃO DO FORMATADOR CENTRALIZADO
import { formatarWBS } from '../../../utils/formatadores';

import './Crossdocking.css';

export default function Crossdocking() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useAlert();

  // ✨ Adicionado o campo "destino" ao estado inicial
  const [formDados, setFormDados] = useState({ nome: '', wbs: '', destino: '', observacoes: '', nf: '' });
  const [tipoSaida, setTipoSaida] = useState(null);
  
  const [itensParciais, setItensParciais] = useState([{ id: Date.now(), desenhoSAP: '', quantidade: '' }]);
  const [anexos, setAnexos] = useState([]);

  const adicionarItemParcial = () => setItensParciais([...itensParciais, { id: Date.now(), desenhoSAP: '', quantidade: '' }]);
  
  const removerItemParcial = (id) => {
    if (itensParciais.length > 1) setItensParciais(itensParciais.filter(item => item.id !== id));
    else showAlert("Atenção", "Para Saída Parcial, deve manter pelo menos 1 item na lista.", "warning");
  };
  
  const atualizarItemParcial = (id, campo, valor) => setItensParciais(itensParciais.map(item => item.id === id ? { ...item, [campo]: valor } : item));

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Atenção", "Por favor, selecione uma filial no topo da página antes de prosseguir.", "warning");
      return;
    }
    // ✨ Validação atualizada para exigir o Destino
    if (!formDados.nome || !formDados.wbs || !formDados.destino || !formDados.nf || !tipoSaida) {
      showAlert("Campos Obrigatórios", "Por favor, preencha o Nome, WBS, Destino, Número da NF e selecione o Tipo de Saída.", "warning");
      return;
    }
    if (anexos.length === 0) {
      showAlert("Anexo Obrigatório", "A anexação do documento da Nota Fiscal (PDF ou imagem) é obrigatória para operações de Crossdocking.", "warning");
      return;
    }
    if (tipoSaida === 'parcial') {
      const temItemIncompleto = itensParciais.some(i => !i.desenhoSAP || !i.quantidade);
      if (temItemIncompleto) {
        showAlert("Itens Incompletos", "Preencha o Desenho SAP e a Quantidade em todas as linhas da Saída Parcial.", "warning");
        return;
      }
    }

    const anexosProcessados = [];
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

    const listaItensFinais = tipoSaida === 'total' ? [] : itensParciais.map(i => ({
      desenho_sap_manual: i.desenhoSAP,
      quantidade_solicitada: parseFloat(i.quantidade),
      unidade_medida_manual: 'Unid'
    }));

    const payload = {
      solicitante: {
        nome: formDados.nome, wbs: formDados.wbs, nf: formDados.nf, destino: formDados.destino, 
        observacoes: `[Saída ${tipoSaida === 'total' ? 'Total' : 'Parcial'}] ${formDados.observacoes}`,
        tipo: 'Crossdocking', filial_origem: estoqueAtual 
      },
      itens: listaItensFinais, anexos: anexosProcessados 
    };

    try {
      const dados = await apiFetch('/solicitacoes/crossdocking', { method: 'POST', body: JSON.stringify(payload) });

      if (dados.sucesso || dados.ps) {
        showAlert("Sucesso!", `Solicitação de Crossdocking enviada com sucesso. ID: ${dados.ps}`, "success");
        setFormDados({ nome: '', wbs: '', destino: '', observacoes: '', nf: '' });
        setTipoSaida(null); 
        setItensParciais([{ id: Date.now(), desenhoSAP: '', quantidade: '' }]); 
        setAnexos([]); 
      } else {
        showAlert("Erro do Servidor", dados.erro, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor. Verifica a tua internet.", "error");
    }
  };

  return (
    <div className="limitador-largura">
      <div className="banner-aviso banner-ciano">
        <Package size={24} />
        <div>
          <strong>Crossdocking</strong>
          <p>Saída Total processa toda a NF. Saída Parcial permite informar múltiplos itens (Desenho SAP + Qtd) para serem descontados automaticamente na entrada.</p>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone ciano redondo"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME *</label>
            <input type="text" className="input-campo foco-ciano" placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} />
          </div>
          <div className="input-grupo">
            <label>WBS *</label>
            <input 
              type="text" 
              className="input-campo foco-ciano" 
              placeholder="WBS do projeto" 
              value={formDados.wbs} 
              // ✨ Formatador de WBS em tempo real
              onChange={(e) => setFormDados({...formDados, wbs: formatarWBS(e.target.value)})} 
            />
          </div>
          <div className="input-grupo">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} color="#2563eb" /> NÚMERO DA NOTA FISCAL *</label>
            <input type="text" className="input-campo foco-ciano" placeholder="Ex: 123456" value={formDados.nf} onChange={(e) => setFormDados({...formDados, nf: e.target.value})} />
          </div>
          <div className="input-grupo">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> FILIAL DE ORIGEM</label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" color="#0891b2" />
              <input type="text" className="input-campo" value={estoqueAtual} readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>
          {/* ✨ NOVA CAIXA: DESTINO (Ocupa as duas colunas inteiras) */}
          <div className="input-grupo" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> DESTINO *</label>
            <textarea 
              className="input-campo foco-ciano" 
              placeholder="Local de destino do material..." 
              rows="2" 
              value={formDados.destino} 
              onChange={(e) => setFormDados({...formDados, destino: e.target.value})}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone ciano"><Package size={18} /></div>
            <h2>Dados da Operação</h2>
          </div>
        </div>
        <div className="form-grid coluna-unica">
          <div style={{ marginBottom: '8px' }}>
             <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} titulo="NOTA FISCAL (OBRIGATÓRIO)" />
          </div>
          
          <div className="input-grupo">
            <label>TIPO DE SAÍDA *</label>
            <div className="botoes-toggle-container">
              <button className={`btn-toggle ${tipoSaida === 'parcial' ? 'selecionado' : ''}`} onClick={() => setTipoSaida('parcial')}>Saída Parcial</button>
              <button className={`btn-toggle ${tipoSaida === 'total' ? 'selecionado' : ''}`} onClick={() => setTipoSaida('total')}>Saída Total</button>
            </div>
          </div>

          {tipoSaida === 'parcial' && (
            <div style={{ marginTop: '16px', animation: 'fadeIn 0.2s ease-in-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '75%' }}>
                  <AlertTriangle size={16} /> 
                  Os itens abaixo serão descontados automaticamente pela combinação de NF e Desenho SAP durante a Entrada.
                </span>
                <button onClick={adicionarItemParcial} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', color: '#2563eb', cursor: 'pointer' }}><Plus size={14} /> Adicionar Item</button>
              </div>

              <div className="scroll-tabela-solicitacao" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px 16px', backgroundColor: '#f8fafc' }}>
                <table className="tabela-solicitacao-dados" style={{ minWidth: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ width: '40px', padding: '8px' }}>#</th>
                      <th>DESENHO SAP *</th>
                      <th style={{ width: '150px' }}>QUANTIDADE *</th>
                      <th style={{ width: '50px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensParciais.map((item, index) => (
                      <tr key={item.id}>
                        <td style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500', padding: '8px' }}>{index + 1}</td>
                        <td><input type="text" className="input-campo foco-ciano" style={{ backgroundColor: '#ffffff', fontFamily: 'monospace', fontWeight: '600' }} placeholder="Ex: 12345-A" value={item.desenhoSAP} onChange={(e) => atualizarItemParcial(item.id, 'desenhoSAP', e.target.value)} /></td>
                        <td><input type="number" className="input-campo foco-ciano" style={{ backgroundColor: '#ffffff', color: '#2563eb', fontWeight: 'bold' }} min="1" placeholder="0" value={item.quantidade} onChange={(e) => atualizarItemParcial(item.id, 'quantidade', e.target.value)} /></td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => removerItemParcial(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="input-grupo">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo foco-ciano" placeholder="Informações adicionais..." value={formDados.observacoes} onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})}></textarea>
          </div>
        </div>
      </div>

      <BotaoAcaoGlobal texto="Enviar Crossdocking" icone={<Send size={16} />} cor="ciano" onClick={handleEnviar} />
    </div>
  );
}