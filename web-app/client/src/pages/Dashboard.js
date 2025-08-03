import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  Shield, 
  Users, 
  Search,
  Plus,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api';

const Dashboard = () => {
  const { hasPermission } = useAuth();
  const { notifications, connected } = useSocket();
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeShipments: 0,
    verifiedSuppliers: 0,
    completedDeliveries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/getAnalytics');
      const data = response.data.result;
      setStats({
        totalProducts: data.totalProducts,
        activeShipments: data.activeShipments,
        verifiedSuppliers: Object.keys(data.locationStats || {}).length,
        completedDeliveries: data.completedDeliveries
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use real-time notifications as recent activity
  const recentActivity = notifications.slice(0, 5).map((notif, index) => ({
    id: notif.id,
    type: notif.type,
    product: notif.data?.name || `Product ${notif.data?.productId}`,
    location: notif.data?.location || notif.data?.newLocation || 'Unknown',
    time: new Date(notif.timestamp).toLocaleString(),
    status: 'success'
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div className="hero" variants={itemVariants}>
        <h1>Supply Chain Transparency</h1>
        <p>
          Track, trace, and verify your products through every step of the supply chain 
          with blockchain-powered transparency and security.
        </p>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px 16px',
            borderRadius: '20px',
            color: 'white'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              {connected ? 'Real-time Connected' : 'Offline'}
            </span>
          </div>
          {notifications.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '8px 16px',
              borderRadius: '20px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {notifications.length} live updates
            </div>
          )}
        </div>
        <div className="hero-buttons">
          <Link to="/track" className="btn-primary">
            <Search size={20} />
            Track Product
          </Link>
          {hasPermission('create') && (
            <Link to="/create" className="btn-secondary">
              <Plus size={20} />
              Add Product
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div className="stats-section" variants={itemVariants}>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalProducts.toLocaleString()}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.activeShipments}</div>
            <div className="stat-label">Active Shipments</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.verifiedSuppliers}</div>
            <div className="stat-label">Verified Suppliers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.completedDeliveries.toLocaleString()}</div>
            <div className="stat-label">Completed Deliveries</div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid-2" style={{ marginTop: '60px' }}>
        {/* Recent Activity */}
        <motion.div className="card" variants={itemVariants}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: '700', color: '#333' }}>
            Live Activity Feed
          </h3>
          {recentActivity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: activity.status === 'success' 
                      ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                      : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    {activity.status === 'success' ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {activity.product}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {activity.location} • {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Clock size={24} />
              </div>
              <div style={{ fontSize: '14px' }}>
                {connected ? 'Waiting for live updates...' : 'Connect to see live activity'}
              </div>
            </div>
          )}
        </motion.div>

        {/* Analytics Chart */}
        <motion.div className="card" variants={itemVariants}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: '700', color: '#333' }}>
            {loading ? 'Loading Analytics...' : 'Supply Chain Overview'}
          </h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <BarChart3 size={48} style={{ color: '#667eea', marginBottom: '16px' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                Analytics Available
              </h4>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                View detailed analytics and insights about your supply chain performance.
              </p>
              <Link to="/analytics" className="btn-primary">
                View Full Analytics
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Features Section */}
      <motion.div className="features-section" variants={itemVariants}>
        <h2 className="features-title">Blockchain-Powered Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={40} />
            </div>
            <h3 className="feature-title">Immutable Records</h3>
            <p className="feature-description">
              Every transaction is recorded on the blockchain, ensuring data integrity 
              and preventing tampering throughout the supply chain.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Package size={40} />
            </div>
            <h3 className="feature-title">Real-time Tracking</h3>
            <p className="feature-description">
              Track products from origin to destination with real-time updates 
              and location data powered by IoT sensors.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Users size={40} />
            </div>
            <h3 className="feature-title">Multi-party Verification</h3>
            <p className="feature-description">
              Multiple stakeholders can verify and validate product information, 
              ensuring transparency and trust across the network.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        className="card" 
        variants={itemVariants}
        style={{ marginTop: '40px', textAlign: 'center' }}
      >
        <h3 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: '700', color: '#333' }}>
          Quick Actions
        </h3>
        <div className="grid-3">
          <Link to="/create" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Plus size={20} />
            Create Product
          </Link>
          <Link to="/track" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Search size={20} />
            Track Product
          </Link>
          {hasPermission('quality') ? (
            <Link to="/quality" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <FileText size={20} />
              Quality Assurance
            </Link>
          ) : (
            <Link to="/analytics" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <BarChart3 size={20} />
              View Analytics
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;