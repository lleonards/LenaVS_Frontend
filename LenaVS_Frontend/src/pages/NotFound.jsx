import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeftCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const homePath = isAuthenticated ? '/editor' : '/login';

  const handleSafeBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(homePath, { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(255,140,90,0.12), transparent 40%), #0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: 'min(620px, 100%)',
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        padding: '32px',
        color: '#fff',
        boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
      }}>
        <span style={{
          display: 'inline-block',
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(255,140,90,0.12)',
          color: '#ffb08d',
          fontWeight: 800,
          marginBottom: 16,
        }}>404 protegido</span>

        <h1 style={{ margin: 0, fontSize: '36px', lineHeight: 1.1 }}>Página não encontrada</h1>
        <p style={{ margin: '14px 0 0', color: '#c9c9c9', lineHeight: 1.7 }}>
          Em vez de cair em uma tela branca com “Not Found”, agora o LenaVS mostra uma rota segura.
          Você pode voltar para a área principal sem perder a navegação.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
          <Link to={homePath} style={{
            background: '#ff8c5a',
            color: '#111',
            padding: '12px 18px',
            borderRadius: 12,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Home size={16} />
            Ir para o início
          </Link>

          <button
            type="button"
            onClick={handleSafeBack}
            style={{
              background: '#262626',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ArrowLeftCircle size={16} />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
