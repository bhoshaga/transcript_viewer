import React, { useEffect } from "react";
import { BrowserRouter, useRoutes, Navigate } from "react-router-dom";
import Transcript from "./pages/Transcript";
import Login from "./pages/Login";
import "./App.css";
import MainLayout from "./layout/MainLayout";
import { ToastProvider } from "./components/ui/toast";
import { BreadcrumbProvider } from "./lib/BreadcrumbContext";
import { AIProvider } from "./lib/AIContext";
import { TranscriptProvider } from "./lib/TranscriptContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { setAuthToken } from "./lib/graphql/client";

// Sync auth token to GraphQL client
function AuthTokenSync({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();

  // Set token synchronously during render so it's available before child effects run
  setAuthToken(token);

  return <>{children}</>;
}

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

function AppRoutes() {
  return useRoutes([
    {
      path: "/login",
      element: <Login />,
    },
    {
      // Public shared meeting route - no auth required
      element: <LayoutWithProviders />,
      children: [
        {
          path: "/s/:shareKey",
          element: <Transcript />,
        },
      ],
    },
    {
      element: (
        <ProtectedRoute>
          <LayoutWithProviders />
        </ProtectedRoute>
      ),
      children: [
        {
          path: "/",
          element: <Transcript />,
        },
        {
          path: "/t/:id",
          element: <Transcript />,
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/" replace />,
    },
  ]);
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthTokenSync>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthTokenSync>
      </AuthProvider>
    </ToastProvider>
  );
}
