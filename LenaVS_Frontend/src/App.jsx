import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Editor from './pages/Editor';
import Upgrade from './pages/Upgrade';

const LoadingScreen = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      gap: '14px',
      height: '100vh',
      backgroundColor: '#000',
      color: '#ff8c5a',
      fontFamily: 'Montserrat, sans-serif',
      letterSpacing: '0.02em',
    }}
  >
    <div
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '999px',
        border: '3px solid rgba(255, 140, 90, 0.22)',
        borderTopColor: '#ff8c5a',
        animation: 'lenavs-spin 0.9s linear infinite',
      }}
    />
    <p style={{ margin: 0, color: '#ff8c5a', fontWeight: 600 }}>Carregando LenaVS...</p>
    <style>{`
      @keyframes lenavs-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const AuthGuard = ({ children, isPrivate = true }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isPrivate) {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  }

  return isAuthenticated ? <Navigate to="/editor" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
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

          <Route
            path="/"
            element={
              <AuthGuard>
                <Editor />
              </AuthGuard>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
