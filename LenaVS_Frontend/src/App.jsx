import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Editor from './pages/Editor';
import Upgrade from './pages/Upgrade';

/* =====================================================
   🎨 ESTILO DE CARREGAMENTO
===================================================== */
const LoadingScreen = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#000',
    color: '#fff',
    fontFamily: 'sans-serif'
  }}>
    <p>Carregando LenaVS...</p>
  </div>
);

/* =====================================================
   🔒 COMPONENTE DE PROTEÇÃO DE ROTAS (CORRIGIDO)
===================================================== */
const AuthGuard = ({ children, isPrivate = true }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isPrivate) {
    // 🔒 Rota privada → precisa estar autenticado
    return isAuthenticated
      ? children
      : <Navigate to="/login" replace />;
  } else {
    // 🔓 Rota pública (login/register)
    return isAuthenticated
      ? <Navigate to="/editor" replace />
      : children;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* 🔓 Rotas Públicas */}
          <Route
            path="/login"
            element={
              <AuthGuard isPrivate={false}>
                <Login />
              </AuthGuard>
            }
          />

          <Route
            path="/register"
            element={
              <AuthGuard isPrivate={false}>
                <Register />
              </AuthGuard>
            }
          />

          {/* 🔒 Rotas Privadas */}
          <Route
            path="/editor"
            element={
              <AuthGuard>
                <Editor />
              </AuthGuard>
            }
          />

          <Route
            path="/upgrade"
            element={
              <AuthGuard>
                <Upgrade />
              </AuthGuard>
            }
          />

          {/* 🏠 Raiz Inteligente */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <Editor />
              </AuthGuard>
            }
          />

          {/* 🔄 Fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
