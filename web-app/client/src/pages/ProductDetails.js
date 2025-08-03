import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Package, 
  MapPin, 
  Calendar,
  Truck,
  Plus,
  CheckCircle,
  Clock,
  DollarSign,
  Tag,
  BarChart3,
  FileText
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [product, setProduct] = useState(null);
  const [productHistory, setProductHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShipForm, setShowShipForm] = useState(false);
  const [shipData, setShipData] = useState({
    newLocation: '',
    arrivalDate: ''
  });

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const [productResponse, historyResponse] = await Promise.all([
        api.get(`/getProduct?id=${id}`),
        api.get(`/getProductWithHistory?id=${id}`)
      ]);
      
      setProduct(productResponse.data.result);
      setProductHistory(historyResponse.data.result);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/track');
    } finally {
      setLoading(false);
    }
  };

  const handleShipProduct = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('ship')) {
      toast.error('You do not have permission to ship products');
      return;
    }
    
    try {
      await api.post('/shipProduct', {
        productId: id,
        newLocation: shipData.newLocation,
        arrivalDate: shipData.arrivalDate || new Date().toISOString()
      });
      
      toast.success('Product shipped successfully!');
      setShowShipForm(false);
      setShipData({ newLocation: '', arrivalDate: '' });
      fetchProductData(); // Refresh data
    } catch (error) {
      console.error('Error shipping product:', error);
      toast.error('Failed to ship product');
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <h2>Product Not Found</h2>
          <p>The product with ID "{id}" could not be found.</p>
          <button onClick={() => navigate('/track')} className="btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

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
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="page-title">{product.name}</h1>
        <p className="page-subtitle">
          Complete product information and supply chain history
        </p>
      </div>

      {/* Product Overview */}
      <div className="grid-2" style={{ marginBottom: '40px' }}>
        {/* Basic Information */}
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
            Product Information
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-row">
              <div>
                <div className="form-label">Product ID</div>
                <div style={{ 
                  fontFamily: 'monospace', 
                  color: '#667eea', 
                  fontWeight: '600',
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  {product.id}
                </div>
              </div>
              <div>
                <div className="form-label">Barcode</div>
                <div style={{ fontFamily: 'monospace' }}>{product.barcode}</div>
              </div>
            </div>
            
            <div className="form-row">
              <div>
                <div className="form-label">Category</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={16} />
                  {product.category}
                </div>
              </div>
              <div>
                <div className="form-label">Variety</div>
                <div>{product.variety || 'N/A'}</div>
              </div>
            </div>
            
            <div>
              <div className="form-label">Place of Origin</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} />
                {product.placeOfOrigin}
              </div>
            </div>
            
            <div className="form-row">
              <div>
                <div className="form-label">Production Date</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} />
                  {new Date(product.productionDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="form-label">Expiration Date</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} />
                  {new Date(product.expirationDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div>
                <div className="form-label">Quantity</div>
                <div>{product.unitQuantity} {product.unitQuantityType}</div>
              </div>
              <div>
                <div className="form-label">Unit Price</div>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <DollarSign size={16} />
                  {product.unitPrice}
                </div>
              </div>
            </div>
            
            {product.batchQuantity && (
              <div>
                <div className="form-label">Batch Quantity</div>
                <div>{product.batchQuantity} units</div>
              </div>
            )}
          </div>
        </div>

        {/* Current Status & Actions */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <MapPin size={24} />
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Current Location</div>
                <div style={{ opacity: 0.9, fontSize: '1rem' }}>
                  {product.locationData.current.location}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={20} />
              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Arrived</div>
                <div style={{ fontSize: '0.95rem' }}>
                  {new Date(product.locationData.current.arrivalDate).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Ship Product Button */}
          {hasPermission('ship') && (
            <button
              onClick={() => setShowShipForm(!showShipForm)}
              className="btn-primary"
              style={{ 
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: showShipForm ? '20px' : '0'
              }}
            >
              <Plus size={20} />
              Ship to New Location
            </button>
          )}
          
          <button
            onClick={() => navigate(`/quality/${id}`)}
            className="btn-secondary"
            style={{ 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px'
            }}
          >
            <FileText size={20} />
            Quality Records
          </button>

          {/* Ship Form */}
          {showShipForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleShipProduct}
              style={{ 
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div className="form-group">
                <label className="form-label">New Location</label>
                <input
                  type="text"
                  value={shipData.newLocation}
                  onChange={(e) => setShipData(prev => ({ ...prev, newLocation: e.target.value }))}
                  className="input"
                  placeholder="Enter destination"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Arrival Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={shipData.arrivalDate}
                  onChange={(e) => setShipData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Ship Product
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowShipForm(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </div>

      {/* Supply Chain History */}
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
          <BarChart3 size={24} />
          Supply Chain Journey
        </h3>
        
        <div className="timeline">
          {/* Current location */}
          <div className="timeline-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <MapPin size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#333', marginBottom: '4px', fontSize: '1.1rem' }}>
                  {product.locationData.current.location}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  Arrived: {new Date(product.locationData.current.arrivalDate).toLocaleString()}
                </div>
                <div className="status-badge status-info">Current Location</div>
              </div>
            </div>
          </div>

          {/* Previous locations */}
          {product.locationData.previous.length > 0 ? (
            product.locationData.previous.map((location, index) => (
              <div key={index} className="timeline-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <CheckCircle size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#333', marginBottom: '4px', fontSize: '1.1rem' }}>
                      {location.location}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      {new Date(location.arrivalDate).toLocaleString()}
                    </div>
                    <div className="status-badge status-success">Completed</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="timeline-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <CheckCircle size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', color: '#333', marginBottom: '4px', fontSize: '1.1rem' }}>
                    {product.placeOfOrigin}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    Origin: {new Date(product.productionDate).toLocaleString()}
                  </div>
                  <div className="status-badge status-success">Origin</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Component Products */}
      {productHistory && productHistory.componentProducts && productHistory.componentProducts.length > 0 && (
        <div className="card" style={{ marginTop: '40px' }}>
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
            Component Products
          </h3>
          
          <div className="grid-3">
            {productHistory.componentProducts.map((component, index) => (
              <div 
                key={index}
                className="card"
                style={{ 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(`/product/${component.id}`)}
              >
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  {component.name}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  ID: {component.id}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Origin: {component.placeOfOrigin}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Information */}
      {product.misc && (
        <div className="card" style={{ marginTop: '40px' }}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '16px'
          }}>
            Additional Information
          </h3>
          <p style={{ color: '#666', lineHeight: '1.6' }}>{product.misc}</p>
        </div>
      )}
    </motion.div>
  );
};

export default ProductDetails;