import React, { useState, useEffect } from "react";
import { BrowserRouter, useRoutes, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Transcript from "./pages/Transcript";
import "./App.css";
import MainLayout from "./layout/MainLayout";
import { ToastProvider } from "./components/ui/toast";
import { BreadcrumbProvider } from "./lib/BreadcrumbContext";
import { AIProvider } from "./lib/AIContext";
import { TranscriptProvider } from "./lib/TranscriptContext";

// Helper to check if user is logged in
const isLoggedIn = () => {
  return !!localStorage.getItem("username");
};

// Component to protect routes
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Component to handle authentication redirects
const AuthWrapper = ({ children }: { children: JSX.Element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();
  
  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      setIsAuthenticated(isLoggedIn());
    };
    
    checkAuth();
    
    // Listen for storage events (if user logs in/out in another tab)
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);
  
  // Show nothing during the initial auth check to prevent flashing
  if (isAuthenticated === null) {
    return null;
  }
  
  // For login routes, redirect to home if authenticated
  if (isAuthenticated && (location.pathname === '/login')) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Component to wrap the MainLayout with providers
const LayoutWithProviders = () => (
  <BreadcrumbProvider>
    <AIProvider>
      <TranscriptProvider>
        <MainLayout />
      </TranscriptProvider>
    </AIProvider>
  </BreadcrumbProvider>
);

// Implement logout handler
const LogoutHandler = () => {
  useEffect(() => {
    // Clear authentication
    localStorage.removeItem("username");
    // Redirect will be handled by AuthWrapper
  }, []);
  
  return <Navigate to="/login" replace />;
};

export default function App() {
  const Router = () =>
    useRoutes([
      {
        path: "/login",
        element: <AuthWrapper><Login /></AuthWrapper>,
      },
      {
        path: "/logout",
        element: <LogoutHandler />,
      },
      // Redirect old transcript path to root
      {
        path: "/transcript",
        element: <Navigate to="/" replace />
      },
      {
        element: <LayoutWithProviders />,
        children: [
          {
            path: "/",
            element: (
              <RequireAuth>
                <Transcript />
              </RequireAuth>
            ),
          },
          {
            path: "/t/:id",
            element: (
              <RequireAuth>
                <Transcript />
              </RequireAuth>
            ),
          },
        ],
      },
      // Fallback - redirect to root
      {
        path: "*",
        element: <Navigate to={isLoggedIn() ? "/" : "/login"} replace />,
      },
    ]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </ToastProvider>
  );
}

