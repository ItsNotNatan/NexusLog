import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import '../LoginLogistica/LoginLogistica.css'; // Reutilizamos os estilos do login

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        setErroMensagem(error.message || "Ocorreu um erro ao enviar o e-mail.");
      } else {
        setSucesso(true);
      }
    } catch (err) {
      setErroMensagem("Falha na comunicação com o servidor de autenticação.");
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
          <p>Informe o seu e-mail e enviaremos um link seguro para criar uma nova senha.</p>
        </div>

        {sucesso ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ color: '#10b981', margin: '0 0 8px 0' }}>E-mail Enviado!</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>
              Verifique a sua caixa de entrada (e a pasta de Spam) para redefinir a sua senha.
            </p>
            <button 
              onClick={() => navigate('/login')} 
              className="login-btn-submit"
            >
              Voltar ao Login
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleEnviarReset}>
            {erroMensagem && (
              <div className="login-error-message">
                {erroMensagem}
              </div>
            )}

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
              {carregando ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Link de Recuperação'}
            </button>
          </form>
        )}

        <div className="login-footer">
          <button 
            onClick={() => navigate('/login')} 
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto', marginTop: '16px' }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      </div>
    </div>
  );
}