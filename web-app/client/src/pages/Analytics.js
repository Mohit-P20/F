import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  MapPin,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/getAnalytics');
      setAnalyticsData(response.data.result);
      setLastUpdated(new Date());
      toast.success('Analytics data updated');
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analyticsData) {
    return (
      <div className="page-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div className="spinner" />
        <p style={{ color: 'white', fontSize: '1.1rem' }}>Loading analytics data...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <h2>No Analytics Data Available</h2>
          <p>Unable to load analytics data from the blockchain.</p>
          <button onClick={fetchAnalyticsData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Process data for charts
  const categoryData = Object.entries(analyticsData.categoryStats || {}).map(([name, count], index) => {
    const colors = ['#667eea', '#764ba2', '#4ade80', '#fbbf24', '#ef4444', '#8b5cf6', '#06b6d4'];
    const total = Object.values(analyticsData.categoryStats).reduce((sum, val) => sum + val, 0);
    return {
      name,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
      count,
      color: colors[index % colors.length]
    };
  });

  const locationData = Object.entries(analyticsData.locationStats || {}).map(([location, products]) => {
    const total = Object.values(analyticsData.locationStats).reduce((sum, val) => sum + val, 0);
    return {
      location,
      products,
      percentage: total > 0 ? Math.round((products / total) * 100) : 0
    };
  }).sort((a, b) => b.products - a.products).slice(0, 5);

  const productionData = analyticsData.monthlyTrends || [];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
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
      <motion.div variants={itemVariants}>
        <h1 className="page-title">Supply Chain Analytics</h1>
        <p className="page-subtitle">
          Comprehensive insights and metrics for your blockchain supply chain network
        </p>
        {lastUpdated && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={fetchAnalyticsData}
              disabled={loading}
              className="btn-secondary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </button>
          </div>
        )}
      </motion.div>

      {/* Time Range Selector */}
      <motion.div 
        className="card" 
        variants={itemVariants}
        style={{ marginBottom: '40px', textAlign: 'center' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { value: '24h', label: 'Last 24 Hours' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' }
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={timeRange === range.value ? 'btn-primary' : 'btn-secondary'}
              style={{ minWidth: '120px' }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={itemVariants} style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: 'white', 
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Key Performance Indicators
        </h2>
        <div className="grid-3">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Package size={30} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#333', marginBottom: '8px' }}>
              {analyticsData.totalProducts.toLocaleString()}
            </div>
            <div style={{ color: '#666', fontWeight: '500' }}>Total Products</div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #4ade80, #22c55e)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <TrendingUp size={30} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#333', marginBottom: '8px' }}>
              {analyticsData.activeShipments}
            </div>
            <div style={{ color: '#666', fontWeight: '500' }}>Active Shipments</div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <CheckCircle size={30} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#333', marginBottom: '8px' }}>
              {analyticsData.completedDeliveries.toLocaleString()}
            </div>
            <div style={{ color: '#666', fontWeight: '500' }}>Completed Deliveries</div>
          </div>
        </div>
      </motion.div>

      {/* Charts Section */}
      <div className="grid-2" style={{ marginBottom: '40px' }}>
        {/* Production Trends */}
        <motion.div className="card" variants={itemVariants}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BarChart3 size={24} />
            Production & Shipment Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="products" 
                stroke="#667eea" 
                strokeWidth={3}
                dot={{ fill: '#667eea', strokeWidth: 2, r: 6 }}
                name="Products Created"
              />
              <Line 
                type="monotone" 
                dataKey="shipments" 
                stroke="#764ba2" 
                strokeWidth={3}
                dot={{ fill: '#764ba2', strokeWidth: 2, r: 6 }}
                name="Shipments"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Distribution */}
        <motion.div className="card" variants={itemVariants}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Package size={24} />
            Product Categories
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <motion.div variants={itemVariants} style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: 'white', 
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Performance Metrics
        </h2>
        <div className="grid-3">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Clock size={24} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
              {analyticsData.averageDeliveryTime} days
            </div>
            <div style={{ color: '#666', fontWeight: '500' }}>Average Delivery Time</div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #4ade80, #22c55e)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <CheckCircle size={24} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
              {analyticsData.onTimeDeliveryRate}%
            </div>
            <div style={{ color: '#666', fontWeight: '500' }}>On-Time Delivery</div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <TrendingUp size={24} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
              {analyticsData.qualityScore}%
            </div>
            <div style={{ color: '#666', fontWeight: '500' }}>Quality Score</div>
          </div>
        </div>
      </motion.div>

      {/* Geographic Distribution */}
      <motion.div className="card" variants={itemVariants}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          color: '#333', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <MapPin size={24} />
          Geographic Distribution
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {locationData.map((location, index) => (
            <div 
              key={index}
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
                background: `linear-gradient(135deg, ${categoryData[index % categoryData.length]?.color || '#667eea'}, ${categoryData[index % categoryData.length]?.color || '#764ba2'})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700'
              }}>
                {location.percentage}%
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {location.location}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {location.products.toLocaleString()} products
                </div>
              </div>
              <div style={{
                width: '100px',
                height: '8px',
                background: '#e2e8f0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${location.percentage}%`,
                  height: '100%',
                  background: `linear-gradient(135deg, ${categoryData[index % categoryData.length]?.color || '#667eea'}, ${categoryData[index % categoryData.length]?.color || '#764ba2'})`,
                  borderRadius: '4px'
                }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Analytics;