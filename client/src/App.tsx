import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useThemeStore } from "./stores/useThemeStore.js";
import { StyleguidePage } from "./pages/StyleguidePage.js";
import { Toast } from "./design/components/Toast.js";

export default function App() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary selection:bg-primary/20">
      <Routes>
        <Route path="/styleguide" element={<StyleguidePage />} />
        <Route
          path="/"
          element={
            <div className="p-8 text-center space-y-4">
              <h1 className="text-3xl font-display font-bold">SketchRoom Initializing...</h1>
              <p className="text-text-muted">Scaffolding in progress. Explore the design system at:</p>
              <div>
                <a href="/styleguide" className="text-primary font-bold underline">
                  /styleguide
                </a>
              </div>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </div>
  );
}
