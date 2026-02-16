import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User as UserIcon, Sparkles, LogOut } from 'lucide-react';
import { User } from '../types';
import launcherIcon from '../assets/launcher_icon.png';

interface NavbarProps {
  user: User | null;
  onLogout: () => Promise<void> | void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const handleLogout = async () => {
    await onLogout();
    navigate('/', { replace: true });
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300">
        <div
          className={`relative flex items-center justify-between h-16 px-6 rounded-full transition-all duration-300 ${
            scrolled ? 'glass shadow-lg bg-white/80' : 'bg-transparent'
          }`}
        >
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-3 group active:scale-95 transition-transform duration-200">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <img
                  src={launcherIcon}
                  alt="LoueFacile logo"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                />
              </div>

              <span className="font-extrabold text-2xl tracking-tight text-gray-900">
                Loue<span className="text-primary-600">Facile</span>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/" active={isActive('/')} label="Accueil" />
            <NavLink to="/search" active={isActive('/search')} label="Rechercher" />
            <NavLink to="/about" active={isActive('/about')} label="Mission" />
            {user && <NavLink to="/dashboard" active={isActive('/dashboard')} label="Dashboard" />}

            <div className="pl-6 ml-2 border-l border-gray-200 h-6 flex items-center">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link to="/dashboard" className="flex items-center gap-4 group active:scale-95 transition-transform duration-200">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-gray-800 group-hover:text-primary-600 transition-colors">{user.name}</span>
                      {user.hasActivePass ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          <Sparkles size={8} /> PASS ACTIF
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400">Visiteur</span>
                      )}
                    </div>
                    <div className="h-10 w-10 bg-gradient-to-br from-primary-100 to-primary-50 rounded-full flex items-center justify-center text-primary-600 shadow-inner border border-white">
                      <UserIcon size={20} />
                    </div>
                  </Link>
                  <button
                    onClick={() => void handleLogout()}
                    className="h-10 w-10 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center"
                    aria-label="Se deconnecter"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth?mode=login"
                  className="relative overflow-hidden bg-gray-900 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95 group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Se connecter <div className="w-1.5 h-1.5 rounded-full bg-primary-600 group-hover:animate-pulse"></div>
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isOpen}
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100 focus:outline-none active:scale-90 duration-200"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300 origin-top ${
          isOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 h-0'
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-1">
          <Link to="/" className="block px-3 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 active:scale-[0.98] transition-all">
            Accueil
          </Link>
          <Link to="/search" className="block px-3 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 active:scale-[0.98] transition-all">
            Rechercher
          </Link>
          <Link to="/about" className="block px-3 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 active:scale-[0.98] transition-all">
            Notre mission
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="block px-3 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 active:scale-[0.98] transition-all">
                Mon dashboard
              </Link>
              <button
                onClick={() => void handleLogout()}
                className="w-full text-left mt-2 block px-3 py-3 rounded-xl text-base font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 active:scale-[0.98] transition-all"
              >
                Se deconnecter
              </button>
            </>
          ) : (
            <Link
              to="/auth?mode=login"
              className="w-full text-left mt-4 block px-3 py-3 rounded-xl text-base font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md active:scale-[0.98] transition-all"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, active, label }: { to: string; active: boolean; label: string }) => (
  <Link
    to={to}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 ${
      active ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
    }`}
  >
    {label}
  </Link>
);

export default Navbar;

