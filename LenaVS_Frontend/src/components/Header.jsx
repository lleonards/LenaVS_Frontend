import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, FolderOpen, LogOut } from 'lucide-react';
import './Header.css';

const Header = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="header">
      
      {/* 🔥 LOGO LOCAL (PASTA PUBLIC) */}
      <div className="header-logo">
        <img 
          src="/logo_oficial.png" 
          alt="LenaVS Logo" 
          className="logo-img"
        />
      </div>

      <div className="header-nav">
        <button className="header-btn" onClick={() => setShowHelp(!showHelp)}>
          <HelpCircle size={20} />
          Ajuda
        </button>

        <button className="header-btn" onClick={() => setShowProjects(!showProjects)}>
          <FolderOpen size={20} />
          Projetos
        </button>

        <button className="header-btn logout" onClick={handleLogout}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
