import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const PENDING_RECOVERY_KEY = 'lenavs-password-recovery';
const MIN_PASSWORD_LENGTH = 6;

const clearPendingRecoveryFlag = () => {
  try {
    window.localStorage.removeItem(PENDING_RECOVERY_KEY);
  } catch {
    // storage bloqueado no modo privado
  }
};

const ResetPassword = () => {
  const { session, updatePassword, getSafeAuthMessage } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const hasSession = Boolean(session?.access_token);

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => navigate('/login', { replace: true }), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [done, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updatePassword(password);
      clearPendingRecoveryFlag();
      setDone(true);
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

        <h1 className="login-title">Nova senha</h1>

        {done ? (
          <div className="success-message" role="status">
            Senha atualizada. Você será levado ao login.
          </div>
        ) : !hasSession ? (
          <>
            <div className="error-message">
              Seu link de recuperação expirou ou já foi usado. Peça um novo link.
            </div>
            <div className="form-footer">
              <Link to="/forgot-password" className="link-forgot">
                Pedir novo link
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="seo-description">
              Escolha uma nova senha para acessar sua conta.
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="password">Nova senha</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="········"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar nova senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="········"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="auth-spin" style={{ marginRight: 8, verticalAlign: '-4px' }} />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
