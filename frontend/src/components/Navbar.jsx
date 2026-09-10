import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { Home, Calendar, Bell, PhoneCall, Sun, Moon, LayoutDashboard, Menu, X, Clock, LogOut } from 'lucide-react';
import { MagneticButton } from './reactbits/MagneticButton';
import { useTheme } from '../context/ThemeContext';

export const Navbar = () => {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === '/';
  const isAdmin = location.pathname.startsWith('/admin');

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/#' + id);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleNavClick = (target) => {
    setMobileMenuOpen(false);
    if (target === 'home') {
      if (location.pathname !== '/') {
        navigate('/');
      } else {
        // Clear any type filter hash and scroll to top
        window.history.replaceState(null, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Dispatch a hashchange so PublicFeed resets the filter
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    } else if (target === 'events' || target === 'notices' || target === 'timetables') {
      const hash = `#${target}`;
      if (location.pathname !== '/') {
        navigate('/' + hash);
      } else {
        // Update the hash in URL so PublicFeed useEffect fires
        window.location.hash = hash;
      }
      // Scroll to the announcements feed section
      setTimeout(() => {
        const el = document.getElementById('notices');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else if (target === 'contact') {
      scrollToSection('contact');
    }
  };

  return (

    <header className="bg-[#00a2e8] dark:bg-slate-900 text-white shadow-md sticky top-0 z-50 border-b border-sky-600/40 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Official Banner / Logo Container (Left) */}
          <Link to="/" onClick={() => handleNavClick('home')} className="flex items-center space-x-3 shrink-0 py-2">
            <img
              src="/logo.png"
              alt="Ghanshyamdas Saraf College of Arts & Commerce"
              className="h-12 sm:h-14 md:h-16 w-auto object-contain bg-white rounded-xl px-3 py-1.5 shadow-sm border border-sky-100 hover:shadow-md transition-all"
            />
          </Link>

          {/* Navigation Links: Home, Events, Notices, Contact Us */}
          {!isAdmin && (
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <button
                onClick={() => handleNavClick('home')}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${isHome
                    ? 'bg-white/20 text-white shadow-sm border border-white/30 backdrop-blur-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Home className="w-4 h-4 text-sky-100" />
                <span>Home</span>
              </button>

              <button
                onClick={() => handleNavClick('events')}
                className="px-3.5 py-2 rounded-xl text-sm font-bold text-white/90 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-1.5"
              >
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>Events</span>
              </button>

              <button
                onClick={() => handleNavClick('notices')}
                className="px-3.5 py-2 rounded-xl text-sm font-bold text-white/90 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-1.5"
              >
                <Bell className="w-4 h-4 text-sky-100" />
                <span>Notices</span>
              </button>

              <button
                onClick={() => handleNavClick('timetables')}
                className="px-3.5 py-2 rounded-xl text-sm font-bold text-white/90 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-1.5"
              >
                <Clock className="w-4 h-4 text-emerald-300" />
                <span>Timetables</span>
              </button>

              <button
                onClick={() => handleNavClick('contact')}
                className="px-3.5 py-2 rounded-xl text-sm font-bold text-white/90 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-1.5"
              >
                <PhoneCall className="w-4 h-4 text-emerald-300" />
                <span>Contact Us</span>
              </button>
            </nav>
          )}

          {/* Right Area: Theme Toggle, HOD Portal & User Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Dark/Light Mode Switcher */}
            <MagneticButton onClick={toggleTheme}>
              <div
                aria-label="Toggle theme"
                className="p-2 sm:p-2.5 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-amber-300 transition-all transform active:scale-95 border border-white/20 dark:border-slate-700 shadow-sm flex items-center justify-center group"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 transition-transform group-hover:rotate-45" />
                ) : (
                  <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
                )}
              </div>
            </MagneticButton>

            {/* Desktop HOD Dashboard Link / Profile */}
            {isSignedIn ? (
              <div className="hidden md:flex items-center space-x-2 pl-1 border-l border-white/30">
                <Link
                  to="/admin"
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 shadow-md ${isAdmin
                      ? 'bg-amber-400 text-slate-900 border border-amber-300'
                      : 'bg-white text-sky-900 hover:bg-sky-50'
                    }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-sky-700" />
                  <span>HOD Portal</span>
                </Link>

                <div className="flex items-center justify-center p-0.5 bg-white/20 rounded-full border border-white/30">
                  <UserButton afterSignOutUrl="/admin/login" />
                </div>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="hidden md:flex px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/15 hover:bg-white/25 text-white transition-all border border-white/20 shadow-sm items-center space-x-1.5"
              >
                <LayoutDashboard className="w-4 h-4 text-sky-100" />
                <span>HOD Login</span>
              </Link>
            )}

            {/* Mobile UserButton if signed in */}
            {isSignedIn && (
              <div className="md:hidden flex items-center justify-center p-0.5 bg-white/20 rounded-full border border-white/30">
                <UserButton afterSignOutUrl="/admin/login" />
              </div>
            )}

            {/* Mobile Drawer Button */}
            {!isAdmin && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && !isAdmin && (
        <div className="md:hidden bg-[#0091d1] dark:bg-slate-900 border-t border-sky-400/40 dark:border-slate-800 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => handleNavClick('home')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:bg-white/10 flex items-center space-x-2"
          >
            <Home className="w-4 h-4 text-sky-100" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleNavClick('events')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:bg-white/10 flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4 text-amber-300" />
            <span>Events</span>
          </button>

          <button
            onClick={() => handleNavClick('notices')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:bg-white/10 flex items-center space-x-2"
          >
            <Bell className="w-4 h-4 text-sky-100" />
            <span>Notices</span>
          </button>

          <button
            onClick={() => handleNavClick('timetables')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:bg-white/10 flex items-center space-x-2"
          >
            <Clock className="w-4 h-4 text-emerald-300" />
            <span>Timetables</span>
          </button>

          <button
            onClick={() => handleNavClick('contact')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:bg-white/10 flex items-center space-x-2"
          >
            <PhoneCall className="w-4 h-4 text-emerald-300" />
            <span>Contact Us</span>
          </button>

          <div className="pt-2 border-t border-sky-400/30 dark:border-slate-800">
            {isSignedIn ? (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-400 text-slate-900 flex items-center space-x-2 shadow-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>HOD Portal</span>
              </Link>
            ) : (
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full px-4 py-2.5 rounded-xl font-bold text-sm bg-white/20 hover:bg-white/30 text-white flex items-center space-x-2 border border-white/20"
              >
                <LayoutDashboard className="w-4 h-4 text-sky-100" />
                <span>HOD Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
