import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  Heart,
  Menu,
  PlusCircle,
  Search,
  ShieldCheck,
  User as UserIcon,
  X,
  Home,
  LayoutGrid,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_LOGO_PATH } from '../lib/format';

export function Navbar() {
  const { user, isAdmin, wishlist, unreadNotificationsCount, loginWithGoogle, logout } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/cars?q=${encodeURIComponent(q)}` : '/cars');
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Browse Cars', to: '/cars' },
    { label: 'Financing', to: '/financing' },
    { label: 'Save to Own', to: '/save-to-own' },
    { label: 'Sell Your Car', to: '/sell-your-car' },
    { label: 'Request Car', to: '/request-car' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B0D10] text-white border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg"
          >
            <img
              src={OFFICIAL_LOGO_PATH}
              alt="Car Depot by Ultimate Autos"
              className="h-9 sm:h-11 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display font-bold text-sm tracking-tight text-white whitespace-nowrap">
                CAR DEPOT
              </span>
              <span className="text-[10px] tracking-wider text-slate-400 whitespace-nowrap">
                BY ULTIMATE AUTOS
              </span>
            </div>
          </Link>

          {/* Search Bar (Desktop + Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-md hidden md:flex items-center bg-slate-900 border border-slate-700/80 rounded-lg overflow-hidden focus-within:border-red-500 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search make, model, year (e.g. Camry 2022)..."
              aria-label="Search vehicles"
              className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                  isActive(link.to)
                    ? 'text-white underline decoration-red-500 decoration-2 underline-offset-8'
                    : 'text-slate-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/dashboard?tab=wishlist"
              aria-label="Wishlist"
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-mono-num font-semibold px-1 rounded">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 whitespace-nowrap shrink-0 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-red-500" />
                Admin
              </Link>
            )}

            {user ? (
              <Link
                to="/dashboard"
                className="relative hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg border border-slate-700 whitespace-nowrap shrink-0 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-slate-300" />
                <span className="max-w-[100px] truncate">
                  {user.displayName?.split(' ')[0] || 'Account'}
                </span>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-mono-num px-1 rounded">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 whitespace-nowrap shrink-0 transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Login / Register
              </button>
            )}

            <Link
              to="/sell-your-car"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg whitespace-nowrap shrink-0 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Sell Your Car
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#12161C] border-t border-slate-800 px-4 py-4 space-y-4">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
            >
              <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search make, model, year..."
                className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-red-600 text-xs font-semibold text-white shrink-0"
              >
                Go
              </button>
            </form>

            <nav className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-sm font-medium text-slate-200 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-sm font-medium text-slate-200 hover:text-white"
              >
                About Us
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-sm font-medium text-slate-200 hover:text-white"
              >
                Contact Us
              </Link>
            </nav>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 px-3 bg-slate-800 text-white text-sm font-semibold rounded-lg"
                  >
                    My Dashboard
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-2.5 px-3 bg-red-600 text-white text-sm font-semibold rounded-lg"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2.5 px-3 border border-slate-700 text-slate-300 text-sm rounded-lg"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    loginWithGoogle();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-4 bg-red-600 text-white text-sm font-semibold rounded-lg"
                >
                  Login / Register with Google
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Thumb-Zone Bar (strictly compact <= 56px) */}
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
              isActive('/') ? 'text-red-600' : 'text-slate-600'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            Home
          </Link>
          <Link
            to="/cars"
            className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
              isActive('/cars') ? 'text-red-600' : 'text-slate-600'
            }`}
          >
            <LayoutGrid className="w-5 h-5 mb-0.5" />
            Browse
          </Link>
          <Link
            to="/sell-your-car"
            className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
              isActive('/sell-your-car') ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            <PlusCircle className="w-5 h-5 mb-0.5 text-red-600" />
            Sell Car
          </Link>
          <Link
            to="/financing"
            className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
              isActive('/financing') ? 'text-red-600' : 'text-slate-600'
            }`}
          >
            <Car className="w-5 h-5 mb-0.5" />
            Finance
          </Link>
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
              isActive('/dashboard') ? 'text-red-600' : 'text-slate-600'
            }`}
          >
            <UserIcon className="w-5 h-5 mb-0.5" />
            Account
          </Link>
        </div>
      </nav>
    </>
  );
}
