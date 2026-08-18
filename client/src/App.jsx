import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { Footer } from './components/common/Footer';

import { Home } from './pages/Home';
import { EventDetails } from './pages/EventDetails';
import { Checkout } from './pages/Checkout';
import { MyTickets } from './pages/MyTickets';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { CheckInScanner } from './pages/CheckInScanner';
import { CreateEvent } from './pages/CreateEvent';

// Guard para rotas autenticadas de participantes (impede organizadores de comprar/ver meus ingressos)
const AttendeeRoute = ({ children }) => {
  const { isAuthenticated, isOrganizer, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isOrganizer) return <Navigate to="/organizer/dashboard" replace />;
  return children;
};

// Guard para rotas autenticadas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Guard para rotas do organizador
const OrganizerRoute = ({ children }) => {
  const { isOrganizer, loading } = useAuth();
  if (loading) return null;
  return isOrganizer ? children : <Navigate to="/" replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 font-sans">
            <div>
              <Navbar />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <Routes>
                  {/* Rotas Públicas */}
                  <Route path="/" element={<Home />} />
                  <Route path="/events/:id" element={<EventDetails />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Rotas Protegidas (Participante) */}
                  <Route
                    path="/checkout"
                    element={
                      <AttendeeRoute>
                        <Checkout />
                      </AttendeeRoute>
                    }
                  />
                  <Route
                    path="/my-tickets"
                    element={
                      <AttendeeRoute>
                        <MyTickets />
                      </AttendeeRoute>
                    }
                  />

                  {/* Rotas Protegidas (Organizador) */}
                  <Route
                    path="/organizer/dashboard"
                    element={
                      <OrganizerRoute>
                        <OrganizerDashboard />
                      </OrganizerRoute>
                    }
                  />
                  <Route
                    path="/organizer/scanner"
                    element={
                      <OrganizerRoute>
                        <CheckInScanner />
                      </OrganizerRoute>
                    }
                  />
                  <Route
                    path="/organizer/create-event"
                    element={
                      <OrganizerRoute>
                        <CreateEvent />
                      </OrganizerRoute>
                    }
                  />

                  {/* Redirecionamento padrão */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>

            <Footer />
            <BottomNav />
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};
