import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import ProductDetails from './pages/ProductDetails';
import CreateProduct from './pages/CreateProduct';
import TrackProduct from './pages/TrackProduct';
import Analytics from './pages/Analytics';
import QualityAssurance from './pages/QualityAssurance';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <p>Loading Supply Chain Pro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <SocketProvider>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/create" element={<CreateProduct />} />
            <Route path="/track" element={<TrackProduct />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/quality/:productId?" element={<QualityAssurance />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#333',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            },
          }}
        />
      </div>
    </SocketProvider>
  );
};
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;