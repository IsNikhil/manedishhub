import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = (path, opts = {}) => axios({ url: `/api/admin${path}`, withCredentials: true, ...opts });

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api('/me').then(r => {
      setIsLoggedIn(r.data.isAdmin);
      if (r.data.isAdmin) loadData();
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadData = async () => {
    try {
      const [statsR, pendingR, reviewsR, photosR, msgsR, usersR] = await Promise.all([
        api('/stats'), api('/pending'), api('/reviews'), api('/photos'), api('/messages'), api('/users')
      ]);
      setStats(statsR.data);
      setPending(pendingR.data);
      setReviews(reviewsR.data);
      setPhotos(photosR.data);
      setMessages(msgsR.data);
      setUsers(usersR.data);
    } catch (e) { console.error(e); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await api('/login', { method: 'POST', data: { password } });
      setIsLoggedIn(true);
      setLoginError('');
      loadData();
    } catch { setLoginError('Wrong password'); }
  };

  const handleLogout = async () => {
    await api('/logout', { method: 'POST' });
    setIsLoggedIn(false);
  };

  const verify = async (sessionId) => {
    await api(`/verify/${sessionId}`, { method: 'POST' });
    setPending(prev => prev.filter(p => p.session_id !== sessionId));
    loadData();
  };

  const reject = async (sessionId) => {
    await api(`/reject/${sessionId}`, { method: 'POST' });
    setPending(prev => prev.filter(p => p.session_id !== sessionId));
  };

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    await api(`/review/${id}`, { method: 'DELETE' });
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  const deletePhoto = async (id) => {
    if (!confirm('Delete this photo?')) return;
    await api(`/photo/${id}`, { method: 'DELETE' });
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const deleteMessage = async (id) => {
    await api(`/message/${id}`, { method: 'DELETE' });
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const deleteUser = async (sessionId) => {
    if (!confirm('Remove this user profile?')) return;
    await api(`/user/${sessionId}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(u => u.session_id !== sessionId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="modal-box w-full max-w-sm p-6 animate-fadeInUp">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🦁</div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-white/40 text-sm">Mane Dish Hub</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Admin password" className="input-glass" autoFocus />
            {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
            <button type="submit" className="btn-gold w-full">Login</button>
          </form>
          <p className="text-center mt-4 text-white/25 text-xs">
            <a href="/" className="hover:text-white/50 transition-colors">← Back to site</a>
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pending', label: `⏳ Pending (${pending.length})` },
    { id: 'users', label: `👥 Users (${users.length})` },
    { id: 'reviews', label: `💬 Reviews (${reviews.length})` },
    { id: 'photos', label: `📸 Photos (${photos.length})` },
    { id: 'messages', label: `📝 Chat (${messages.length})` },
  ];

  return (
    <div className="min-h-screen p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-header rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦁</span>
          <div>
            <h1 className="font-bold text-white text-base">Admin Dashboard</h1>
            <p className="text-white/40 text-xs">Mane Dish Hub • Southeastern Louisiana University</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 glass rounded-lg">← Site</a>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-400/10 border border-red-400/20 rounded-lg transition-colors">Logout</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {[
            { label: 'Reviews', value: stats.totalFeedback, icon: '💬' },
            { label: 'Photos', value: stats.totalPhotos, icon: '📸' },
            { label: 'Messages', value: stats.totalMessages, icon: '📝' },
            { label: "Today's Votes", value: stats.todayVotes, icon: '🗳️' },
            { label: 'Pending', value: stats.pendingVerifications, icon: '⏳', highlight: stats.pendingVerifications > 0 },
          ].map(s => (
            <div key={s.label} className={`glass-card p-3 text-center ${s.highlight ? 'border-yellow-400/30' : ''}`}>
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className={`text-xl font-bold ${s.highlight ? 'text-yellow-300' : 'text-white'}`}>{s.value}</div>
              <div className="text-[10px] text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`nav-tab text-xs py-1.5 ${activeTab === t.id ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pending Verifications */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="glass-card p-8 text-center text-white/40">
              <div className="text-4xl mb-2">✅</div>
              <p>No pending verifications</p>
            </div>
          ) : pending.map(p => (
            <div key={p.session_id} className="glass-card p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* SLU card image */}
                {p.slu_card_filename && (
                  <div className="flex-shrink-0">
                    <img
                      src={`/api/admin/slu-card/${p.slu_card_filename}`}
                      alt="SLU Card"
                      className="w-full sm:w-48 h-32 object-cover rounded-xl border border-white/10"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-2">
                    <div>
                      <p className="text-xs text-white/40">Current username</p>
                      <p className="text-sm font-semibold text-white">{p.current_username}</p>
                    </div>
                    <div className="text-white/30 text-xl self-center">→</div>
                    <div>
                      <p className="text-xs text-white/40">Requested name</p>
                      <p className="text-base font-bold text-selu-gold">{p.requested_name}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30 mb-3">
                    Submitted: {new Date(p.created_at).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => verify(p.session_id)} className="btn-green text-xs px-4 py-2">✓ Approve</button>
                    <button onClick={() => reject(p.session_id)} className="px-4 py-2 rounded-xl bg-red-400/15 border border-red-400/25 text-red-300 text-xs font-semibold hover:bg-red-400/25 transition-colors">✗ Reject</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-white/8">
            {users.length === 0 ? (
              <p className="p-8 text-center text-white/40">No users yet</p>
            ) : users.map(u => (
              <div key={u.session_id} className="flex items-center justify-between p-3 hover:bg-white/3 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{u.current_username}</span>
                    {u.verified ? <span className="badge-verified">✓ Verified</span> : <span className="text-[10px] text-white/30">Anonymous</span>}
                  </div>
                  <p className="text-[10px] text-white/30">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => deleteUser(u.session_id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg bg-red-400/10 hover:bg-red-400/20 transition-colors flex-shrink-0">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-2">
          {reviews.length === 0 ? (
            <div className="glass-card p-8 text-center text-white/40">No reviews yet</div>
          ) : reviews.map(r => (
            <div key={r.id} className="glass-card p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-selu-gold">{r.username}</span>
                  {r.rating && <span className="text-xs text-selu-gold">{'★'.repeat(r.rating)}</span>}
                  <span className="text-[10px] text-white/30">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed truncate">{r.comment}</p>
                <p className="text-[10px] text-white/30 mt-0.5">Item: {r.item_id}</p>
              </div>
              <button onClick={() => deleteReview(r.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg bg-red-400/10 hover:bg-red-400/20 transition-colors flex-shrink-0">Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Photos */}
      {activeTab === 'photos' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.length === 0 ? (
            <div className="col-span-4 glass-card p-8 text-center text-white/40">No photos yet</div>
          ) : photos.map(p => (
            <div key={p.id} className="glass-card overflow-hidden group">
              <div className="relative">
                <img src={p.url} alt={p.caption || 'Photo'} className="w-full h-32 object-cover" />
                <button onClick={() => deletePhoto(p.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  ✕
                </button>
              </div>
              <div className="p-2">
                {p.caption && <p className="text-[10px] text-white/60 truncate mb-0.5">{p.caption}</p>}
                <p className="text-[10px] text-selu-gold font-semibold truncate">{p.username}</p>
                <p className="text-[9px] text-white/30">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      {activeTab === 'messages' && (
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-white/8">
            {messages.length === 0 ? (
              <p className="p-8 text-center text-white/40">No messages</p>
            ) : messages.map(m => (
              <div key={m.id} className="flex items-start gap-3 p-3 hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold text-selu-gold">{m.username}</span>
                    <span className="text-[10px] text-white/30">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">{m.message}</p>
                </div>
                <button onClick={() => deleteMessage(m.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg bg-red-400/10 hover:bg-red-400/20 transition-colors flex-shrink-0">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
