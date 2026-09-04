import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../../contexts/AlertContext';
import { apiFetch } from '../../services/api';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

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
      // Chama a rota que já criámos no backend
      await apiFetch('/auth/recuperar-senha', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      // Mostra sempre sucesso por segurança (evita que hackers saibam se o e-mail existe)
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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>Recuperar Senha</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginBottom: '32px' }}>
          Introduza o seu e-mail corporativo para receber um link de recuperação.
        </p>

        <form onSubmit={handleRecuperar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@comau.com"
                style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: carregando ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            {carregando ? <Loader2 size={20} className="spin-icon" /> : "Enviar Link"}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/login')} 
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  );
}
