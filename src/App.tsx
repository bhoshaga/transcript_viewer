import React from "react";
import { BrowserRouter, useRoutes, Navigate } from "react-router-dom";
import Transcript from "./pages/Transcript";
import "./App.css";
import MainLayout from "./layout/MainLayout";
import { ToastProvider } from "./components/ui/toast";
import { BreadcrumbProvider } from "./lib/BreadcrumbContext";
import { AIProvider } from "./lib/AIContext";
import { TranscriptProvider } from "./lib/TranscriptContext";
import { getEnv } from "./lib/useEnv";

// Check if auth token is available
const isAuthenticated = (): boolean => {
  const { AUTH_TOKEN } = getEnv();
  return !!AUTH_TOKEN;
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

export default function App() {
  const Router = () =>
    useRoutes([
      {
        element: <LayoutWithProviders />,
        children: [
          {
            path: "/",
            element: isAuthenticated() ? <Transcript /> : <div>No auth token configured</div>,
          },
          {
            path: "/t/:id",
            element: isAuthenticated() ? <Transcript /> : <div>No auth token configured</div>,
          },
        ],
      },
      // Fallback - redirect to root
      {
        path: "*",
        element: <Navigate to="/" replace />,
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
