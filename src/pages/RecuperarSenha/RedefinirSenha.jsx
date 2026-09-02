import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/api';
import '../LoginLogistica/LoginLogistica.css';

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMensagem, setErroMensagem] = useState('');
  const [tokenRecuperacao, setTokenRecuperacao] = useState(null);

  // Apanha o token do URL que virá no link do e-mail (ex: /redefinir-senha?token=abc)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setTokenRecuperacao(token);
    } else {
      setErroMensagem("Link inválido ou expirado. Solicite uma nova recuperação.");
    }
  }, []);

  const handleRedefinir = async (e) => {
    e.preventDefault();
    setErroMensagem('');

    if (!tokenRecuperacao) {
      setErroMensagem("Token de segurança ausente. Use o link do e-mail.");
      return;
    }

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
      const data = await apiFetch('/auth/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ token: tokenRecuperacao, novaSenha: senha })
      });

      if (!data.sucesso) {
        setErroMensagem(data.erro || "Ocorreu um erro ao atualizar a senha.");
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
          <p>Insira a sua nova senha de acesso.</p>
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
                  disabled={carregando || !tokenRecuperacao}
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
                  disabled={carregando || !tokenRecuperacao}
                />
              </div>
            </div>

            <button type="submit" className="login-btn-submit" disabled={carregando || !tokenRecuperacao}>
              {carregando ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
