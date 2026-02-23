import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Editor from './pages/Editor';
import Upgrade from './pages/Upgrade';

/* =====================================================
   🔒 ROTA PROTEGIDA
===================================================== */

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={centerStyle}>
        Carregando...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

/* =====================================================
   🚫 ROTA PÚBLICA (BLOQUEIA SE JÁ ESTIVER LOGADO)
===================================================== */

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={centerStyle}>
        Carregando...
      </div>
    );
  }

  return user ? <Navigate to="/editor" replace /> : children;
};

/* =====================================================
   🔁 REDIRECIONAMENTO DA RAIZ
===================================================== */

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={centerStyle}>
        Carregando...
      </div>
    );
  }

  return user ? <Navigate to="/editor" replace /> : <Navigate to="/login" replace />;
};

const centerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  color: '#fff',
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* 🔓 Públicas protegidas contra usuário logado */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* 🔒 Editor */}
          <Route
            path="/editor"
            element={
              <PrivateRoute>
                <Editor />
              </PrivateRoute>
            }
          />

          {/* 🔒 Upgrade */}
          <Route
            path="/upgrade"
            element={
              <PrivateRoute>
                <Upgrade />
              </PrivateRoute>
            }
          />

          {/* Raiz */}
          <Route path="/" element={<RootRedirect />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
