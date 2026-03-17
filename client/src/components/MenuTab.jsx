import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MenuItemCard from './MenuItemCard';

// Mane Dish hours (Central Time) — update if schedule changes
const MEAL_PERIODS = [
  { name: 'Breakfast',           open: '7:00',  close: '9:30'  },
  { name: 'Continental Breakfast', open: '9:30',  close: '10:30' },
  { name: 'Lunch',               open: '10:30', close: '14:00' },
  { name: 'Lite Lunch',          open: '14:00', close: '16:00' },
  { name: 'Dinner',              open: '16:00', close: '19:30' },
];

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getDiningStatus() {
  const now = new Date();
  // Central Time offset: CST = UTC-6, CDT = UTC-5
  // Use Intl to get current CT hour/minute
  const ct = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(now);
  const [hStr, mStr] = ct.split(':');
  const current = parseInt(hStr) * 60 + parseInt(mStr);

  for (const period of MEAL_PERIODS) {
    const open  = toMinutes(period.open);
    const close = toMinutes(period.close);
    if (current >= open && current < close) {
      const minsLeft = close - current;
      const hoursLeft = Math.floor(minsLeft / 60);
      const minsRem  = minsLeft % 60;
      const closes = period.close.replace(':', ':').replace(/^(\d):/, '0$1:');
      return {
        isOpen: true,
        period: period.name,
        closesAt: closes.length === 4 ? '0' + closes : closes,
        timeLeft: hoursLeft > 0
          ? `${hoursLeft}h ${minsRem}m left`
          : `${minsLeft}m left`,
      };
    }
  }

  // Find next opening
  const next = MEAL_PERIODS.find(p => toMinutes(p.open) > current);
  if (next) {
    const minsUntil = toMinutes(next.open) - current;
    const h = Math.floor(minsUntil / 60), m = minsUntil % 60;
    return {
      isOpen: false,
      period: null,
      nextPeriod: next.name,
      opensIn: h > 0 ? `${h}h ${m}m` : `${m}m`,
      opensAt: next.open,
    };
  }

  return { isOpen: false, period: null, closed: true };
}

function DiningStatusBanner() {
  const [status, setStatus] = useState(getDiningStatus);

  useEffect(() => {
    const interval = setInterval(() => setStatus(getDiningStatus()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (status.isOpen) {
    return (
      <div className="flex items-center gap-3.5 glass-card px-4 py-3 sm:px-5 sm:py-4 mb-6 border-emerald-400/30 shadow-[0_0_20px_rgba(52,211,153,0.1)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
        <span className="relative flex h-3 w-3 flex-shrink-0 z-10">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
        </span>
        <div className="flex-1 min-w-0 z-10">
          <span className="text-emerald-300 font-bold text-sm sm:text-base tracking-wide uppercase">Open Now</span>
          <span className="text-white/60 text-xs sm:text-sm font-medium"> · {status.period}</span>
        </div>
        <div className="text-right flex-shrink-0 z-10">
          <p className="text-xs text-white/50 font-medium">Closes {status.closesAt.replace(':', ':')}</p>
          <p className="text-xs sm:text-sm font-bold text-emerald-300">{status.timeLeft}</p>
        </div>
      </div>
    );
  }

  if (status.closed) {
    return (
      <div className="flex items-center gap-3.5 glass-card px-4 py-3 sm:px-5 sm:py-4 mb-6 border-white/10 opacity-75">
        <span className="h-3 w-3 rounded-full bg-white/20 flex-shrink-0 shadow-inner" />
        <p className="text-white/60 text-sm font-medium">Dining hall is closed for today</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 glass-card px-4 py-3 sm:px-5 sm:py-4 mb-6 border-rose-400/20 shadow-[0_0_20px_rgba(244,63,94,0.05)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
      <span className="h-3 w-3 rounded-full bg-rose-400 flex-shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.5)] z-10" />
      <div className="flex-1 min-w-0 z-10">
        <span className="text-rose-300 font-bold text-sm sm:text-base tracking-wide uppercase">Closed</span>
        <span className="text-white/50 text-xs sm:text-sm font-medium"> · Next: {status.nextPeriod}</span>
      </div>
      <p className="text-xs text-white/50 flex-shrink-0 z-10 font-medium bg-black/20 px-2 py-1 rounded-lg">Opens in {status.opensIn}</p>
    </div>
  );
}

export default function MenuTab({ votes, userVotes, onVote, username, socket }) {
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bgScraping, setBgScraping] = useState(false);
  const [error, setError] = useState(null);

  const fetchMenu = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get('/api/menu', { withCredentials: true });
      setMenuData(res.data);
      setBgScraping(!!res.data.scraping);
      setError(null);
    } catch {
      setError('Failed to load menu.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();

    // Auto-reload when background scrape finishes (server broadcasts this)
    if (socket) {
      socket.on('menu:updated', () => {
        setBgScraping(false);
        fetchMenu(true); // silent refresh — no loading spinner
      });
      return () => socket.off('menu:updated');
    }
  }, [socket]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/menu/refresh', {}, { withCredentials: true });
      await fetchMenu();
    } catch {
      setError('Refresh failed. Showing cached menu.');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center animate-fadeIn">
          <div className="text-5xl mb-3 animate-bounce">🦁</div>
          <p className="text-white/60 text-sm">Loading today's menu...</p>
        </div>
      </div>
    );
  }

  const categories = menuData?.menu ? Object.keys(menuData.menu) : [];
  const lastUpdated = menuData?.lastUpdated
    ? new Date(menuData.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-white">Today's Menu</h2>
          {menuData?.status === 'warning' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-yellow-300">⚠️ Cached</span>
          )}
          {menuData?.status === 'error' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/15 border border-red-400/30 text-red-300">⚠️ Update failed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {bgScraping && (
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Updating…
            </span>
          )}
          {lastUpdated && !bgScraping && <span className="text-xs text-white/40">Updated {lastUpdated}</span>}
          <button
            onClick={handleRefresh}
            disabled={refreshing || bgScraping}
            className="btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
          >
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <DiningStatusBanner />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-400/10 border border-red-400/25 text-red-300 text-sm">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-white/60 text-lg font-medium">No menu available</p>
          <p className="text-white/40 text-sm mt-1">Try refreshing</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(category => (
            <section key={category} className="animate-fadeIn relative">
              <div className="flex items-center gap-4 mb-5 relative z-10 pt-2">
                <h3 className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-selu-gold via-yellow-200 to-white uppercase tracking-widest drop-shadow-sm">{category}</h3>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-selu-gold/40 via-selu-gold/10 to-transparent rounded-full" />
                <span className="text-xs font-semibold text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 shadow-inner">{menuData.menu[category].length} items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {menuData.menu[category].map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    votes={votes[item.external_id] || { eat: 0, pass: 0 }}
                    userVote={userVotes[item.external_id]}
                    onVote={onVote}
                    username={username}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
