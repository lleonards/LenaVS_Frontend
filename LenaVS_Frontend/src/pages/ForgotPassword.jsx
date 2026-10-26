import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const ForgotPassword = () => {
  const { requestPasswordReset, getSafeAuthMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email) {
      setError('Informe o e-mail da sua conta.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(getSafeAuthMessage(err, 'login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-container">
          <img src="/logo_oficial.png" alt="LenaVS" className="logo-image" />
        </div>

        <h1 className="login-title">Recuperar senha</h1>

        {sent ? (
          <div className="success-message" role="status">
            <MailCheck size={18} style={{ marginRight: 8, verticalAlign: '-3px' }} />
            Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha.
            Confira também a caixa de spam.
          </div>
        ) : (
          <>
            <p className="seo-description">
              Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="auth-spin" style={{ marginRight: 8, verticalAlign: '-4px' }} />
                    Enviando...
                  </>
                ) : (
                  'Enviar link'
                )}
              </button>
            </form>
          </>
        )}

        <div className="form-footer">
          <Link to="/login" className="link-forgot">
            <ArrowLeft size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
