import React from 'react';

export default function Header({ activeTab, setActiveTab, username, profile, isAdmin, onOpenProfile }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner shrink-0">
            <span className="text-2xl">🦁</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-selu-gold via-yellow-200 to-white leading-tight truncate">Mane Dish Hub</h1>
            <p className="text-white/50 text-[10px] sm:text-xs hidden sm:block truncate">Southeastern Louisiana University • {today}</p>
            <p className="text-white/50 text-[10px] sm:hidden font-medium tracking-wide uppercase">SLU Dining</p>
          </div>
        </div>

        {/* Desktop tabs */}
        <nav className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={`nav-tab ${activeTab === 'menu' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
          >
            🍽️ Menu
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`nav-tab ${activeTab === 'photos' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
          >
            📸 Photo Wall
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`nav-tab ${activeTab === 'news' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
          >
            📰 News
          </button>
        </nav>

        {/* Profile button */}
        <button
          onClick={onOpenProfile}
          className={`flex items-center gap-2.5 glass rounded-xl px-3 py-2 sm:px-4 transition-all duration-300 flex-shrink-0 border-white/10 hover:bg-white/5 ${isAdmin ? 'hover:border-selu-gold/60 shadow-[0_0_15px_rgba(200,169,81,0.1)]' : 'hover:border-emerald-400/40'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/20 ${isAdmin ? 'bg-gradient-to-br from-selu-gold to-yellow-600 shadow-[0_0_10px_rgba(200,169,81,0.5)]' : 'bg-gradient-to-br from-selu-green to-emerald-500 shadow-[0_0_10px_rgba(0,163,108,0.3)]'}`}>
            {isAdmin ? '👑' : (username ? username[0].toUpperCase() : '?')}
          </div>
          <div className="hidden sm:block text-left">
            <div className="flex flex-col">
              <span className={`text-sm font-bold max-w-[120px] truncate leading-tight ${isAdmin ? 'text-selu-gold' : 'text-white'}`}>{username || '...'}</span>
              <div className="flex items-center gap-1 mt-0.5">
                {isAdmin && <span className="text-[9px] bg-selu-gold/20 text-selu-gold px-1.5 py-0.5 rounded border border-selu-gold/30 font-bold uppercase tracking-wider">Admin</span>}
                {!isAdmin && profile?.verified && <span className="badge-verified scale-90 origin-left">✓ Verified</span>}
                {!isAdmin && profile?.pendingRequest && <span className="badge-pending scale-90 origin-left">⏳ Pending</span>}
              </div>
            </div>
          </div>
          <svg className="w-4 h-4 text-white/30 hidden sm:block flex-shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </header>
  );
}
