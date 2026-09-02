import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/api';
import '../LoginLogistica/LoginLogistica.css';

export default function EsqueciSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMensagem, setErroMensagem] = useState('');

  const handleEnviarReset = async (e) => {
    e.preventDefault();
    setErroMensagem('');

    if (!email) {
      setErroMensagem("Por favor, informe o seu e-mail.");
      return;
    }

    setCarregando(true);

    try {
      // Chama a rota do nosso próprio backend Node.js
      const data = await apiFetch('/auth/recuperar-senha', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (!data.sucesso) {
        setErroMensagem(data.erro || "Ocorreu um erro ao processar o pedido.");
      } else {
        setSucesso(true);
      }
    } catch (err) {
      setErroMensagem("Falha na comunicação com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-circle" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <KeyRound size={28} />
          </div>
          <h2>Recuperar Senha</h2>
          <p>Informe o seu e-mail corporativo para solicitar a recuperação.</p>
        </div>

        {sucesso ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ color: '#10b981', margin: '0 0 8px 0' }}>Pedido Enviado!</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>
              Se o e-mail existir no sistema, enviaremos as instruções de recuperação.
            </p>
            <button onClick={() => navigate('/login')} className="login-btn-submit">
              Voltar ao Login
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleEnviarReset}>
            {erroMensagem && <div className="login-error-message">{erroMensagem}</div>}

            <div className="login-input-group">
              <label>E-MAIL CORPORATIVO</label>
              <div className="login-input-wrapper">
                <Mail size={18} className="login-input-icon" />
                <input
                  type="email"
                  placeholder="exemplo@comau.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={carregando}
                />
              </div>
            </div>

            <button type="submit" className="login-btn-submit" disabled={carregando}>
              {carregando ? <Loader2 className="animate-spin" size={20} /> : 'Solicitar Recuperação'}
            </button>
          </form>
        )}

        <div className="login-footer" style={{ borderTop: '1px solid #e2e8f0', marginTop: '24px', paddingTop: '16px' }}>
          <button 
            onClick={() => navigate('/login')} 
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
