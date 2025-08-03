import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Tag,
  Save,
  ArrowLeft
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';

const CreateProduct = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    barcode: '',
    placeOfOrigin: '',
    productionDate: '',
    expirationDate: '',
    unitQuantity: '',
    unitQuantityType: 'kg',
    batchQuantity: '',
    unitPrice: '',
    category: '',
    variety: '',
    misc: '',
    currentLocation: '',
    arrivalDate: ''
  });

  const categories = [
    'Fruits', 'Vegetables', 'Dairy', 'Meat', 'Seafood', 
    'Grains', 'Beverages', 'Processed Foods', 'Other'
  ];

  const unitTypes = ['kg', 'g', 'lbs', 'oz', 'liters', 'ml', 'pieces'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateProductId = () => { // Use uuidv4 for robust ID generation
    return `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
   };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('create')) {
      toast.error('You do not have permission to create products');
      return;
    }
    
    setLoading(true);

    try {
      // Generate ID if not provided
      const productId = formData.id || generateProductId();
      
      // Prepare product data
      const productData = {
        ...formData,
        id: productId,
        componentProductIds: [],
        locationData: {
          current: {
            location: formData.currentLocation,
            arrivalDate: formData.arrivalDate || new Date().toISOString()
          },
          previous: []
        }
      };

      // Remove form-specific fields
      delete productData.currentLocation;
      delete productData.arrivalDate;

      const response = await api.post('/createProduct', productData);
      
      toast.success('Product created successfully!');
      navigate(`/product/${productId}`);
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
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
      <div style={{ marginBottom: '40px' }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="page-title">Create New Product</h1>
        <p className="page-subtitle">
          Add a new product to the blockchain supply chain with complete traceability
        </p>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={{ marginBottom: '40px' }}>
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
              Basic Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Product ID (Optional)</label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Auto-generated if empty"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., Organic Apples"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Barcode *</label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Product barcode"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Variety</label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleInputChange}
                className="input"
                placeholder="e.g., Gala, Fuji"
              />
            </div>
          </div>

          {/* Location & Dates */}
          <div style={{ marginBottom: '40px' }}>
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
              Location & Dates
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Place of Origin *</label>
                <input
                  type="text"
                  name="placeOfOrigin"
                  value={formData.placeOfOrigin}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., Farm Valley, CA"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Current Location *</label>
                <input
                  type="text"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Current location"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Production Date *</label>
                <input
                  type="datetime-local"
                  name="productionDate"
                  value={formData.productionDate}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Expiration Date *</label>
                <input
                  type="datetime-local"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Quantity & Pricing */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: '#333', 
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <DollarSign size={24} />
              Quantity & Pricing
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Unit Quantity *</label>
                <input
                  type="number"
                  name="unitQuantity"
                  value={formData.unitQuantity}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., 500"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Unit Type *</label>
                <select
                  name="unitQuantityType"
                  value={formData.unitQuantityType}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  {unitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Batch Quantity</label>
                <input
                  type="number"
                  name="batchQuantity"
                  value={formData.batchQuantity}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Number of units in batch"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Unit Price *</label>
                <input
                  type="text"
                  name="unitPrice"
                  value={formData.unitPrice}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., $5.99"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: '#333', 
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Tag size={24} />
              Additional Information
            </h3>
            
            <div className="form-group">
              <label className="form-label">Miscellaneous Notes</label>
              <textarea
                name="misc"
                value={formData.misc}
                onChange={handleInputChange}
                className="input"
                rows="4"
                placeholder="Any additional information about the product..."
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                margin: '0 auto',
                minWidth: '200px',
                justifyContent: 'center'
              }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '20px', height: '20px' }} />
              ) : (
                <>
                  <Save size={20} />
                  Create Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default CreateProduct;
