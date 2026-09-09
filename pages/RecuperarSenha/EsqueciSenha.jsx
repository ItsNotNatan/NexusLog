import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import { useAlert } from '../../contexts/AlertContext';
import { apiFetch } from '../../services/api';

// ✨ O Segredo: Importamos o CSS do Login para ficar 100% igual!
import '../LoginLogistica/LoginLogistica.css';
import logoComau from '../../assets/logo-comau.png';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleRecuperar = async (e) => {
    e.preventDefault();
    if (!email) {
      return showAlert("Atenção", "Por favor, introduza o seu e-mail corporativo.", "warning");
    }

    setCarregando(true);
    try {
      await apiFetch('/auth/recuperar-senha', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      showAlert(
        "E-mail Enviado!", 
        "Se este e-mail estiver registado no sistema, receberá um link para redefinir a sua senha em poucos minutos.", 
        "success"
      );
      navigate('/login');
    } catch (error) {
      showAlert("Erro", "Não foi possível processar o pedido. Tente novamente mais tarde.", "error");
    } finally {
      setCarregando(false);
    }
  };

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
          <h2>Recuperar Senha</h2>
          <p style={{ marginTop: '8px' }}>Introduza o seu e-mail corporativo para receber um link de recuperação.</p>
        </div>

        <form className="login-form" onSubmit={handleRecuperar}>
          <div className="input-grupo">
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px', display: 'block' }}>
              EMAIL CORPORATIVO
            </label>
            <div className="input-login-wrapper">
              <Mail className="input-login-icone" size={18} />
              <input 
                type="email" 
                className="input-login-campo" 
                placeholder="nome.sobrenome@comau.com" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <BotaoAcaoGlobal 
              texto="Enviar Link de Recuperação" 
              icone={<Mail size={18} />} 
              cor="azul" 
              onClick={handleRecuperar} 
              carregando={carregando} 
            />
          </div>
        </form>
        
      </div>
    </div>
  );
}
