import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAlert } from '../../contexts/AlertContext';
import { apiFetch } from '../../services/api';
import { Lock, Loader2 } from 'lucide-react';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Captura o token da URL
  
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  const navigate = useNavigate();
  const { showAlert, showLoading, closeAlert } = useAlert();

  const handleRedefinir = async (e) => {
    e.preventDefault();

    if (!token) {
      return showAlert("Link Inválido", "O link de recuperação está ausente ou quebrado. Peça um novo e-mail.", "error");
    }

    if (novaSenha.length < 8) {
      return showAlert("Senha Fraca", "A senha deve ter no mínimo 8 caracteres.", "warning");
    }

    if (novaSenha !== confirmarSenha) {
      return showAlert("Atenção", "As senhas não coincidem.", "warning");
    }

    showLoading("A Atualizar...", "A gravar a sua nova senha na base de dados.");
    setCarregando(true);

    try {
      const resposta = await apiFetch('/auth/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ token, novaSenha })
      });

      closeAlert();

      if (resposta.sucesso) {
        showAlert("Senha Atualizada!", "A sua senha foi alterada com sucesso. Já pode iniciar sessão.", "success");
        navigate('/login');
      } else {
        showAlert("Link Expirado", resposta.erro || "O link expirou ou é inválido. Por favor, peça uma nova recuperação.", "error");
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
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <div>
          <h2 style={{ color: '#ef4444' }}>Link Inválido</h2>
          <p style={{ color: '#475569', marginTop: '10px' }}>Este link não possui a chave de segurança necessária.</p>
          <button onClick={() => navigate('/esqueci-senha')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Pedir Novo Link</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>Nova Senha</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginBottom: '32px' }}>
          Crie uma nova senha segura para a sua conta.
        </p>

        <form onSubmit={handleRedefinir} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Confirmar Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: carregando ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
          >
            {carregando ? <Loader2 size={20} className="spin-icon" /> : "Gravar Nova Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
