import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const serverUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';
    const newSocket = io(serverUrl);

    newSocket.on('connect', () => {
      console.log('Connected to real-time server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from real-time server');
      setConnected(false);
    });

    newSocket.on('supplyChainUpdate', (update) => {
      console.log('Real-time update received:', update);
      
      // Add to notifications
      const notification = {
        id: Date.now(),
        type: update.type,
        message: getUpdateMessage(update),
        timestamp: update.timestamp,
        data: update.data
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
      
      // Show toast notification
      toast.success(notification.message, {
        duration: 5000,
        icon: getUpdateIcon(update.type)
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const getUpdateMessage = (update) => {
    switch (update.type) {
      case 'productCreated':
        return `New product "${update.data.name}" created at ${update.data.location}`;
      case 'productShipped':
        return `Product shipped to ${update.data.newLocation}`;
      case 'qualityRecordAdded':
        return `Quality check completed for product. Score: ${update.data.score}/100`;
      default:
        return 'Supply chain update received';
    }
  };

  const getUpdateIcon = (type) => {
    switch (type) {
      case 'productCreated':
        return '📦';
      case 'productShipped':
        return '🚚';
      case 'qualityRecordAdded':
        return '✅';
      default:
        return '🔔';
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    socket,
    connected,
    notifications,
    clearNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};