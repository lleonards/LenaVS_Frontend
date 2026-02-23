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
    backgroundColor: '#000', // Ajuste conforme a cor do seu site
    color: '#fff',
    fontFamily: 'sans-serif'
  }}>
    <p>Carregando LenaVS...</p>
  </div>
);

/* =====================================================
   🔒 COMPONENTE DE PROTEÇÃO DE ROTAS
===================================================== */
// Centralizamos a lógica aqui para evitar travamentos em múltiplos lugares
const AuthGuard = ({ children, isPrivate = true }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isPrivate) {
    // Se for privada e não tiver usuário, vai para login
    return user ? children : <Navigate to="/login" replace />;
  } else {
    // Se for pública (login/register) e já tiver usuário, vai para o editor
    return user ? <Navigate to="/editor" replace /> : children;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* 🔓 Rotas Públicas (Login/Cadastro) */}
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

          {/* 🔒 Rotas Privadas (Editor/Upgrade) */}
          <Route
            path="/editor"
            element={
              <AuthGuard isPrivate={true}>
                <Editor />
              </AuthGuard>
            }
          />

          <Route
            path="/upgrade"
            element={
              <AuthGuard isPrivate={true}>
                <Upgrade />
              </AuthGuard>
            }
          />

          {/* 🏠 Raiz e Fallback */}
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="*" element={<Navigate to="/editor" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
