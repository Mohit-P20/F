import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  Search, 
  Plus, 
  BarChart3, 
  Menu, 
  X,
  Shield,
  Home,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/track', label: 'Track Product', icon: Search },
    { path: '/create', label: 'Create Product', icon: Plus, permission: 'create' },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  const filteredNavItems = navItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <motion.nav 
      className="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">
            <Shield size={32} />
          </div>
          <div className="brand-text">
            <span className="brand-name">Supply Chain Pro</span>
            <span className="brand-tagline">Blockchain Transparency</span>
          </div>
        </Link>

        <div className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`navbar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          {/* User section */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginLeft: '20px',
            paddingLeft: '20px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <NotificationCenter />
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontSize: '14px'
            }}>
              <User size={16} />
              <span>{user?.username}</span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                {user?.role}
              </span>
            </div>
            
            <button
              onClick={logout}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <button 
          className="navbar-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;