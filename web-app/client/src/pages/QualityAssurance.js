import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  CheckCircle, 
  AlertTriangle, 
  Star,
  FileText,
  MapPin,
  Calendar,
  User,
  ArrowLeft,
  Plus,
  Search
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const QualityAssurance = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [qualityRecords, setQualityRecords] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchProductId, setSearchProductId] = useState(productId || '');
  const [formData, setFormData] = useState({
    inspector: '',
    score: '',
    notes: '',
    location: '',
    testResults: '',
    certificationType: '',
    inspectionStandard: '',
    batchId: ''
  });

  useEffect(() => {
    if (searchProductId) {
      fetchQualityRecords();
    }
  }, [searchProductId]);

  const fetchQualityRecords = async () => {
    if (!searchProductId.trim()) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/getQualityRecords?productId=${searchProductId}`);
      setQualityRecords(response.data.result || []);
    } catch (error) {
      console.error('Error fetching quality records:', error);
      toast.error('Failed to load quality records');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQualityRecord = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('quality')) {
      toast.error('You do not have permission to add quality records');
      return;
    }

    try {
      setLoading(true);
      await api.post('/addQualityRecord', {
        productId: searchProductId,
        ...formData,
        score: parseInt(formData.score)
      });
      
      toast.success('Quality record added successfully!');
      setShowAddForm(false);
      setFormData({
        inspector: '',
        score: '',
        notes: '',
        location: '',
        testResults: '',
        certificationType: '',
        inspectionStandard: '',
        batchId: ''
      });
      fetchQualityRecords();
    } catch (error) {
      console.error('Error adding quality record:', error);
      toast.error('Failed to add quality record');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#fbbf24';
    return '#ef4444';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return <CheckCircle size={24} />;
    if (score >= 70) return <Star size={24} />;
    return <AlertTriangle size={24} />;
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
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        {productId && (
          <button 
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
        )}
        <h1 className="page-title">Quality Assurance</h1>
        <p className="page-subtitle">
          Track and manage quality inspections throughout the supply chain
        </p>
      </div>

      {/* Search Section */}
      <div className="card" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Product ID</label>
            <input
              type="text"
              value={searchProductId}
              onChange={(e) => setSearchProductId(e.target.value)}
              className="input"
              placeholder="Enter product ID to view quality records"
              style={{ marginBottom: 0 }}
            />
          </div>
          <button
            onClick={fetchQualityRecords}
            disabled={loading || !searchProductId.trim()}
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
            <Search size={20} />
            Search
          </button>
          {hasPermission('quality') && searchProductId && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-secondary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                height: '56px'
              }}
            >
              <Plus size={20} />
              Add Record
            </button>
          )}
        </div>
      </div>

      {/* Add Quality Record Form */}
      {showAddForm && hasPermission('quality') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card"
          style={{ marginBottom: '40px' }}
        >
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '24px'
          }}>
            Add Quality Inspection Record
          </h3>
          
          <form onSubmit={handleAddQualityRecord}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Inspector Name *</label>
                <input
                  type="text"
                  value={formData.inspector}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspector: e.target.value }))}
                  className="input"
                  placeholder="Inspector name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quality Score (0-100) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                  className="input"
                  placeholder="Quality score"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Inspection Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="input"
                  placeholder="Inspection location"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Certification Type</label>
                <select
                  value={formData.certificationType}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificationType: e.target.value }))}
                  className="input"
                >
                  <option value="">Select certification</option>
                  <option value="HACCP">HACCP</option>
                  <option value="ISO 22000">ISO 22000</option>
                  <option value="FDA">FDA</option>
                  <option value="USDA">USDA</option>
                  <option value="Organic">Organic</option>
                  <option value="Fair Trade">Fair Trade</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Inspection Standard</label>
                <input
                  type="text"
                  value={formData.inspectionStandard}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspectionStandard: e.target.value }))}
                  className="input"
                  placeholder="e.g., ISO 9001, BRC"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Batch ID</label>
                <input
                  type="text"
                  value={formData.batchId}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchId: e.target.value }))}
                  className="input"
                  placeholder="Batch identifier"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Inspection Notes *</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input"
                rows="3"
                placeholder="Detailed inspection notes..."
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Test Results</label>
              <textarea
                value={formData.testResults}
                onChange={(e) => setFormData(prev => ({ ...prev, testResults: e.target.value }))}
                className="input"
                rows="3"
                placeholder="Detailed test results and measurements..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? (
                  <div className="spinner" style={{ width: '20px', height: '20px' }} />
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Add Quality Record
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Quality Records */}
      {searchProductId && (
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
            <FileText size={24} />
            Quality Inspection Records
            {qualityRecords.length > 0 && (
              <span style={{
                background: '#667eea',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {qualityRecords.length}
              </span>
            )}
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" />
            </div>
          ) : qualityRecords.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {qualityRecords.map((record, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    padding: '24px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: `2px solid ${getScoreColor(record.score)}20`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: getScoreColor(record.score),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      {getScoreIcon(record.score)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: getScoreColor(record.score) }}>
                            {record.score}/100
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: '600' }}>
                            Quality Score
                          </div>
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            Inspector: {record.inspector}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={14} />
                              {new Date(record.timestamp).toLocaleString()}
                            </span>
                            {record.location && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={14} />
                                {record.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                          Inspection Notes:
                        </div>
                        <div style={{ color: '#666', lineHeight: '1.5' }}>
                          {record.notes}
                        </div>
                      </div>

                      {record.testResults && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                            Test Results:
                          </div>
                          <div style={{ color: '#666', lineHeight: '1.5' }}>
                            {record.testResults}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {record.certificationType && (
                          <div style={{
                            background: 'white',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#667eea'
                          }}>
                            {record.certificationType}
                          </div>
                        )}
                        {record.inspectionStandard && (
                          <div style={{
                            background: 'white',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#764ba2'
                          }}>
                            {record.inspectionStandard}
                          </div>
                        )}
                        {record.batchId && (
                          <div style={{
                            background: 'white',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#22c55e'
                          }}>
                            Batch: {record.batchId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : searchProductId ? (
            <div style={{ textAlign: 'center', padding: '60px 40px' }}>
              <FileText size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                No Quality Records Found
              </h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                No quality inspection records exist for this product yet.
              </p>
              {hasPermission('quality') && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                >
                  <Plus size={20} />
                  Add First Quality Record
                </button>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 40px' }}>
              <Search size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                Search for Quality Records
              </h3>
              <p style={{ color: '#666' }}>
                Enter a product ID above to view its quality inspection history.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default QualityAssurance;