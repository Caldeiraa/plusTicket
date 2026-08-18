import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Conectar ao servidor Socket.IO na porta do backend (3000)
    const socketInstance = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket.IO conectado:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.IO desconectado');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinEventRoom = (eventId) => {
    if (socket && eventId) {
      socket.emit('join:event', eventId);
      console.log(`[Socket] Entrando na sala do evento: event:${eventId}`);
    }
  };

  const leaveEventRoom = (eventId) => {
    if (socket && eventId) {
      socket.emit('leave:event', eventId);
      console.log(`[Socket] Saindo da sala do evento: event:${eventId}`);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinEventRoom, leaveEventRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
};
