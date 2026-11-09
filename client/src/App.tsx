import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useThemeStore } from "./stores/useThemeStore.js";
import { LandingPage } from "./pages/LandingPage.js";
import { GamePage } from "./pages/GamePage.js";
import { StyleguidePage } from "./pages/StyleguidePage.js";
import { Toast } from "./design/components/Toast.js";
import { TooltipProvider } from "./design/components/Tooltip.js";

export default function App() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-surface-0 text-text-primary selection:bg-primary/20">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/room/:code" element={<GamePage />} />
          <Route path="/styleguide" element={<StyleguidePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast />
      </div>
    </TooltipProvider>
  );
}
