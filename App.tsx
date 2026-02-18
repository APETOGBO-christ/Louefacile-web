import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import ListingDetail from './pages/ListingDetail';
import About from './pages/About';
import Legal from './pages/Legal';
import Privacy from './pages/Privacy';
import ReportAbuse from './pages/ReportAbuse';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { User } from './types';
import { consumeAuthCallbackFromUrl, getCurrentUser, logoutUser, subscribeToAuthChanges } from './services/authService';
import { activateSearchPass } from './services/listingService';
import launcherIcon from './assets/launcher_icon.png';

const Footer = () => (
  <footer className="bg-gray-900 text-white pt-16 pb-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img src={launcherIcon} alt="LoueFacile logo" className="h-10 w-10 rounded-lg object-cover border border-white/20" />
            <h2 className="text-2xl font-bold">LoueFacile</h2>
          </div>
          <p className="text-gray-400 max-w-sm leading-relaxed">
            La premiere plateforme qui securise votre recherche de logement. Fini les intermediaires douteux, place a la transparence et a la confiance.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-4 text-gray-200">Navigation</h3>
          <ul className="space-y-2 text-gray-400">
            <li>
              <Link to="/" className="hover:text-white transition-colors">
                Accueil
              </Link>
            </li>
            <li>
              <Link to="/search" className="hover:text-white transition-colors">
                Rechercher
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors">
                Comment ca marche
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-4 text-gray-200">Legal</h3>
          <ul className="space-y-2 text-gray-400">
            <li>
              <Link to="/legal" className="hover:text-white transition-colors">
                CGU
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Politique de confidentialite
              </Link>
            </li>
            <li>
              <Link to="/report-abuse" className="hover:text-white transition-colors">
                Signaler un abus
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} LoueFacile. Tous droits reserves.
      </div>
    </div>
  </footer>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      await consumeAuthCallbackFromUrl();
      const currentUser = await getCurrentUser();
      if (!isMounted) {
        return;
      }

      setUser(currentUser);
      setIsAuthLoading(false);
    };

    void hydrateSession();

    const subscription = subscribeToAuthChanges((nextUser) => {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleUnlockPass = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!user) {
      return { ok: false, error: 'Connexion requise.' };
    }

    const activation = await activateSearchPass();
    if (!activation.ok) {
      return { ok: false, error: activation.error || "Impossible d'activer le pass." };
    }

    const refreshedUser = await getCurrentUser();
    if (refreshedUser) {
      setUser(refreshedUser);
    }

    return { ok: true };
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen font-sans text-gray-900 bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search user={user} />} />
            <Route path="/about" element={<About />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/report-abuse" element={<ReportAbuse />} />
            <Route path="/auth" element={<Auth user={user} onAuthSuccess={handleAuthSuccess} />} />
            <Route
              path="/dashboard"
              element={
                isAuthLoading ? (
                  <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-semibold">Chargement du compte...</div>
                ) : user ? (
                  <Dashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to={`/auth?mode=login&redirect=${encodeURIComponent('/dashboard')}`} replace />
                )
              }
            />
            <Route path="/listing/:id" element={<ListingDetail user={user} onUnlock={handleUnlockPass} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
