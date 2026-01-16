import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import ItineraryPage from './pages/ItineraryPage';
import SettingsPage from './pages/SettingsPage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/">
      <ThemeProvider>
        <Routes>
          {/* MVP - no authentication, all routes public */}
          <Route path="/" element={<App />} />
          <Route path="/journey/:id/itinerary" element={<ItineraryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<App />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
