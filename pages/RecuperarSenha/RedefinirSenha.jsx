import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import { useAlert } from '../../contexts/AlertContext';
import { apiFetch } from '../../services/api';

// ✨ O Segredo: Importamos o CSS do Login para ficar 100% igual!
import '../LoginLogistica/LoginLogistica.css';
import logoComau from '../../assets/logo-comau.png';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  const navigate = useNavigate();
  const { showAlert, showLoading, closeAlert } = useAlert();

  const handleRedefinir = async (e) => {
    e.preventDefault();

    if (!token) return showAlert("Link Inválido", "O link de recuperação está ausente ou quebrado.", "error");
    if (novaSenha.length < 8) return showAlert("Senha Fraca", "A senha deve ter no mínimo 8 caracteres.", "warning");
    if (novaSenha !== confirmarSenha) return showAlert("Atenção", "As senhas não coincidem.", "warning");

    showLoading("A Atualizar...", "A gravar a sua nova senha...");
    setCarregando(true);

    try {
      const resposta = await apiFetch('/auth/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ token, novaSenha })
      });

      closeAlert();
      if (resposta.sucesso) {
        showAlert("Senha Atualizada!", "A sua senha foi alterada com sucesso.", "success");
        navigate('/login');
      } else {
        showAlert("Link Expirado", resposta.erro || "O link expirou ou é inválido.", "error");
      }
    } catch (error) {
      closeAlert();
      showAlert("Erro", "Falha de comunicação com o servidor.", "error");
    } finally {
      setCarregando(false);
    }
  };

  if (!token) {
    return (
      <div className="login-page-wrapper">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-logo-seccao">
            <img src={logoComau} alt="Logo COMAU" className="login-logo-img" />
            <h2 style={{ color: '#ef4444' }}>Link Inválido</h2>
            <p style={{ marginTop: '8px' }}>Este link não possui a chave de segurança necessária.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <BotaoAcaoGlobal texto="Pedir Novo Link" cor="azul" onClick={() => navigate('/esqueci-senha')} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      <div className="login-card">

        <button
          onClick={() => navigate('/login')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: 'none',
            border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '24px',
            fontSize: '0.875rem', fontWeight: '600', padding: 0, transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.color = '#334155'}
          onMouseOut={(e) => e.target.style.color = '#64748b'}
        >
          <ArrowLeft size={18} />
          Voltar ao Login
        </button>

        <div className="login-logo-seccao">
          <img src={logoComau} alt="Logo COMAU" className="login-logo-img" />
          <h2>Nova Senha</h2>
          <p style={{ marginTop: '8px' }}>Crie uma nova senha segura para a sua conta.</p>
        </div>

        <form className="login-form" onSubmit={handleRedefinir}>
          <div className="input-grupo">
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px', display: 'block' }}>
              NOVA SENHA
            </label>
            <div className="input-login-wrapper">
              <Lock className="input-login-icone" size={18} />
              <input 
                type="password" 
                className="input-login-campo" 
                placeholder="Mínimo 8 caracteres" 
                required 
                value={novaSenha} 
                onChange={(e) => setNovaSenha(e.target.value)} 
              />
            </div>
          </div>

          <div className="input-grupo" style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px', display: 'block' }}>
              CONFIRMAR NOVA SENHA
            </label>
            <div className="input-login-wrapper">
              <Lock className="input-login-icone" size={18} />
              <input 
                type="password" 
                className="input-login-campo" 
                placeholder="Repita a senha" 
                required 
                value={confirmarSenha} 
                onChange={(e) => setConfirmarSenha(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <BotaoAcaoGlobal 
              texto="Gravar Nova Senha" 
              icone={<Lock size={18} />} 
              cor="verde" 
              onClick={handleRedefinir} 
              carregando={carregando} 
            />
          </div>
        </form>
        
      </div>
    </div>
  );
}
