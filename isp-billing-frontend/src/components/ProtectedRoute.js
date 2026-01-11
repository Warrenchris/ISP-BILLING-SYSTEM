import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LinearProgress, Box } from '@mui/material';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to dashboard or customized unauthorized page
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
