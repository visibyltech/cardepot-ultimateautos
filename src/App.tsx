import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ChatbotWidget } from './components/ChatbotWidget';
import { HomePage } from './pages/HomePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { FinancingPage } from './pages/FinancingPage';
import { SaveToOwnPage } from './pages/SaveToOwnPage';
import { SellYourCarPage } from './pages/SellYourCarPage';
import { RequestCarPage } from './pages/RequestCarPage';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AboutPage, ContactPage, PolicyPage } from './pages/InfoPages';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/cars" element={<MarketplacePage />} />
                <Route path="/cars/:slug" element={<VehicleDetailPage />} />
                <Route path="/financing" element={<FinancingPage />} />
                <Route path="/save-to-own" element={<SaveToOwnPage />} />
                <Route path="/sell-your-car" element={<SellYourCarPage />} />
                <Route path="/request-car" element={<RequestCarPage />} />
                <Route path="/dashboard" element={<CustomerDashboardPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/policies/:slug" element={<PolicyPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </main>
            <Footer />
            <ChatbotWidget />
          </div>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
