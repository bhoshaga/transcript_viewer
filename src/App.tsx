import React, { useState, useEffect } from "react";
import { BrowserRouter, useRoutes, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Transcript from "./pages/Transcript";
import "./App.css";
import MainLayout from "./layout/MainLayout";
import { ToastProvider } from "./components/ui/toast";
import { BreadcrumbProvider } from "./lib/BreadcrumbContext";

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
  
  // For login routes, redirect to /transcript if authenticated
  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/')) {
    return <Navigate to="/transcript" replace />;
  }
  
  return children;
};

// Component to wrap the MainLayout with BreadcrumbProvider
const LayoutWithBreadcrumbs = () => (
  <BreadcrumbProvider>
    <MainLayout />
  </BreadcrumbProvider>
);

export default function App() {
  const Router = () =>
    useRoutes([
      {
        path: "/",
        element: <Navigate to={isLoggedIn() ? "/transcript" : "/login"} replace />,
      },
      {
        path: "/login",
        element: <AuthWrapper><Login /></AuthWrapper>,
      },
      {
        element: <LayoutWithBreadcrumbs />,
        children: [
          {
            path: "/transcript",
            element: (
              <RequireAuth>
                <Transcript />
              </RequireAuth>
            ),
          },
        ],
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
