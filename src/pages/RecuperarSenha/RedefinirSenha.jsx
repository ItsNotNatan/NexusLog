import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import '../LoginLogistica/LoginLogistica.css';

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMensagem, setErroMensagem] = useState('');

  // Verifica se a página foi acedida pelo link do e-mail
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Tudo ok, o utilizador clicou no link válido!
      }
    });
  }, []);

  const handleRedefinir = async (e) => {
    e.preventDefault();
    setErroMensagem('');

    if (senha.length < 6) {
      setErroMensagem("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErroMensagem("As senhas não coincidem. Tente novamente.");
      return;
    }

    setCarregando(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) {
        setErroMensagem(error.message || "Ocorreu um erro ao atualizar a senha.");
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
          <div className="login-logo-circle" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <KeyRound size={28} />
          </div>
          <h2>Criar Nova Senha</h2>
          <p>A sua identidade foi confirmada. Introduza a sua nova senha de acesso.</p>
        </div>

        {sucesso ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ color: '#10b981', margin: '0 0 8px 0' }}>Senha Atualizada!</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>
              A sua senha foi alterada com sucesso. Já pode entrar no sistema.
            </p>
            <button onClick={() => navigate('/login')} className="login-btn-submit">
              Entrar no Sistema
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleRedefinir}>
            {erroMensagem && <div className="login-error-message">{erroMensagem}</div>}

            <div className="login-input-group">
              <label>NOVA SENHA</label>
              <div className="login-input-wrapper">
                <Lock size={18} className="login-input-icon" />
                <input
                  type="password"
                  placeholder="No mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={carregando}
                />
              </div>
            </div>

            <div className="login-input-group">
              <label>CONFIRMAR NOVA SENHA</label>
              <div className="login-input-wrapper">
                <Lock size={18} className="login-input-icon" />
                <input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  disabled={carregando}
                />
              </div>
            </div>

            <button type="submit" className="login-btn-submit" disabled={carregando}>
              {carregando ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
