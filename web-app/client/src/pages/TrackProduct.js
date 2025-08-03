import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Search, 
  Package, 
  MapPin, 
  Calendar,
  ArrowRight,
  Truck,
  CheckCircle,
  Clock
} from 'lucide-react';
import api from '../api';

const TrackProduct = () => {
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const storedHistory = localStorage.getItem('productSearchHistory');
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
      console.error("Failed to parse search history from localStorage:", error);
      return [];
    }
  });

  const handleSearch = async (productIdToSearch) => {
    if (!productIdToSearch.trim()) {
      toast.error('Please enter a product ID');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/getProduct?id=${productIdToSearch}`);
      setProduct(response.data.result);
      
      // Add to search history
      if (!searchHistory.includes(productIdToSearch)) {
        const newHistory = [productIdToSearch, ...searchHistory.slice(0,4)];
        setSearchHistory(newHistory);
        localStorage.setItem('productSearchHistory', JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (id) => { setSearchId(id); handleSearch(id); };

  const getStatusIcon = (index, total) => {
    if (index === total - 1) return <MapPin size={20} className="text-blue-500" />;
    return <CheckCircle size={20} className="text-green-500" />;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
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
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 className="page-title">Track Product</h1>
        <p className="page-subtitle">
          Enter a product ID to trace its complete journey through the supply chain
        </p>
      </div>

      {/* Search Section */}
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto 40px' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchId); }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Product ID</label>
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="input"
                placeholder="Enter product ID (e.g., PROD-1640995200000-123)"
                style={{ marginBottom: 0 }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                height: '56px',
                minWidth: '120px',
                justifyContent: 'center'
              }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '20px', height: '20px' }} />
              ) : (
                <>
                  <Search size={20} />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Search */}
        {searchHistory.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <label className="form-label">Recent Searches</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {searchHistory.map((id, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(id)}
                  className="btn-secondary"
                  style={{ 
                    fontSize: '14px', 
                    padding: '8px 16px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    border: '1px solid rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Information */}
      {product && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid-2" style={{ marginBottom: '40px' }}>
            {/* Product Details */}
            <div className="card">
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#333', 
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Package size={24} />
                Product Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div className="form-label">Product Name</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                    {product.name}
                  </div>
                </div>
                
                <div className="form-row">
                  <div>
                    <div className="form-label">Product ID</div>
                    <div style={{ fontFamily: 'monospace', color: '#667eea', fontWeight: '600' }}>
                      {product.id}
                    </div>
                  </div>
                  <div>
                    <div className="form-label">Category</div>
                    <div>{product.category}</div>
                  </div>
                </div>
                
                <div className="form-row">
                  <div>
                    <div className="form-label">Barcode</div>
                    <div style={{ fontFamily: 'monospace' }}>{product.barcode}</div>
                  </div>
                  <div>
                    <div className="form-label">Unit Price</div>
                    <div style={{ fontWeight: '600', color: '#22c55e' }}>{product.unitPrice}</div>
                  </div>
                </div>
                
                <div>
                  <div className="form-label">Place of Origin</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} className="text-gray-500" />
                    {product.placeOfOrigin}
                  </div>
                </div>
                
                <div className="form-row">
                  <div>
                    <div className="form-label">Production Date</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} className="text-gray-500" />
                      {new Date(product.productionDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="form-label">Expiration Date</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} className="text-gray-500" />
                      {new Date(product.expirationDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="form-label">Quantity</div>
                  <div>
                    {product.unitQuantity} {product.unitQuantityType}
                    {product.batchQuantity && ` (Batch: ${product.batchQuantity})`}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="card">
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#333', 
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Truck size={24} />
                Current Status
              </h3>
              
              <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                color: 'white',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <MapPin size={24} />
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Current Location</div>
                    <div style={{ opacity: 0.9 }}>{product.locationData.current.location}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={20} />
                  <div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Arrived</div>
                    <div>{new Date(product.locationData.current.arrivalDate).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/product/${product.id}`)}
                className="btn-primary"
                style={{ 
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                View Full History
                <ArrowRight size={20} />
              </button>
            </div>
          </div>

          {/* Supply Chain Timeline */}
          {product.locationData.previous.length > 0 && (
            <div className="card">
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#333', 
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={24} />
                Supply Chain Journey
              </h3>
              
              <div className="timeline">
                {/* Current location */}
                <div className="timeline-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <MapPin size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {product.locationData.current.location}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        Current Location • {new Date(product.locationData.current.arrivalDate).toLocaleString()}
                      </div>
                    </div>
                    <div className="status-badge status-info">Current</div>
                  </div>
                </div>

                {/* Previous locations */}
                {product.locationData.previous.map((location, index) => (
                  <div key={index} className="timeline-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <CheckCircle size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                          {location.location}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {new Date(location.arrivalDate).toLocaleString()}
                        </div>
                      </div>
                      <div className="status-badge status-success">Completed</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!product && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Search size={40} />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#333', marginBottom: '12px' }}>
            Search for a Product
          </h3>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Enter a product ID above to view its complete supply chain journey
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default TrackProduct;
