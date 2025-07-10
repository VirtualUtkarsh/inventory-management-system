import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InventoryPage from './pages/InventoryPage';
import InsetPage from './pages/InsetPage';
import OutsetPage from './pages/OutsetPage';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes with Layout (includes Navigation) */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/" element={<InventoryPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/insets" element={<InsetPage />} />
            <Route path="/outsets" element={<OutsetPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
