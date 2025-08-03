import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertTriangle, Info, Package, Truck } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import api from '../api';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [blockchainNotifications, setBlockchainNotifications] = useState([]);
  const { notifications: realtimeNotifications, connected } = useSocket();

  useEffect(() => {
    if (isOpen) {
      fetchBlockchainNotifications();
    }
  }, [isOpen]);

  const fetchBlockchainNotifications = async () => {
    try {
      const response = await api.get('/getNotifications?limit=20');
      setBlockchainNotifications(response.data.result || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'created':
        return <Package size={20} />;
      case 'shipped':
        return <Truck size={20} />;
      case 'quality_check':
        return <Check size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getNotificationColor = (severity) => {
    switch (severity) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
      default:
        return '#3b82f6';
    }
  };

  const totalUnread = realtimeNotifications.length + 
    blockchainNotifications.filter(n => !n.acknowledged).length;

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <Bell size={20} />
        {totalUnread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
        {connected && (
          <span style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            width: '12px',
            height: '12px',
            background: '#22c55e',
            borderRadius: '50%',
            border: '2px solid white'
          }} />
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              width: '400px',
              maxHeight: '500px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                color: '#333',
                margin: 0
              }}>
                Notifications
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  color: connected ? '#22c55e' : '#ef4444',
                  fontWeight: '500'
                }}>
                  {connected ? 'Live' : 'Offline'}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '8px'
            }}>
              {/* Real-time notifications */}
              {realtimeNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    padding: '16px',
                    margin: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#333',
                      marginBottom: '4px'
                    }}>
                      {notification.message}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    background: '#3b82f6',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>
                    LIVE
                  </span>
                </motion.div>
              ))}

              {/* Blockchain notifications */}
              {blockchainNotifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '16px',
                    margin: '8px',
                    background: notification.acknowledged ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${getNotificationColor(notification.severity)}20`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    opacity: notification.acknowledged ? 0.6 : 1
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: getNotificationColor(notification.severity),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#333',
                      marginBottom: '4px'
                    }}>
                      {notification.message}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      {notification.location} • {new Date(notification.timestamp).toLocaleString()}
                    </div>
                    {!notification.acknowledged && (
                      <button
                        onClick={() => {/* Implement acknowledge functionality */}}
                        style={{
                          fontSize: '12px',
                          background: 'none',
                          border: `1px solid ${getNotificationColor(notification.severity)}`,
                          color: getNotificationColor(notification.severity),
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {realtimeNotifications.length === 0 && blockchainNotifications.length === 0 && (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  <Bell size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div style={{ fontSize: '14px' }}>No notifications yet</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;