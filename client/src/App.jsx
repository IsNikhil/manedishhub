import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import Header from './components/Header';
import MenuTab from './components/MenuTab';
import PhotoWall from './components/PhotoWall';
import NewsTab from './components/NewsTab';
import ChatPanel from './components/ChatPanel';
import ProfileModal from './components/ProfileModal';
import AdminPage from './components/AdminPage';

const socket = io('/', { withCredentials: true });

// Check if we're on the admin route
const isAdminRoute = window.location.pathname === '/admin';

export default function App() {
  const [activeTab, setActiveTab] = useState('menu');
  const [username, setUsername] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  const fetchProfile = async () => {
    try {
      const [profileRes, adminRes] = await Promise.allSettled([
        axios.get('/api/profile', { withCredentials: true }),
        axios.get('/api/admin/me', { withCredentials: true }),
      ]);
      if (profileRes.status === 'fulfilled') {
        const data = profileRes.value.data;
        setProfile(data);
        setUsername(data.username);
      } else {
        const res = await axios.get('/api/session', { withCredentials: true });
        setUsername(res.data.username);
      }
      if (adminRes.status === 'fulfilled') {
        setIsAdmin(adminRes.value.data.isAdmin || false);
      }
    } catch {
      // fallback silently
    }
  };

  useEffect(() => {
    fetchProfile();
    axios.get('/api/votes', { withCredentials: true })
      .then(r => setVotes(r.data))
      .catch(console.error);

    socket.on('vote:update', ({ itemId, votes: newVotes }) => {
      setVotes(prev => ({ ...prev, [itemId]: newVotes }));
    });
    socket.on('users:online', (count) => setOnlineCount(count));
    socket.emit('get:online'); // request current count after listener is registered
    return () => { socket.off('vote:update'); socket.off('users:online'); };
  }, []);

  const handleVote = async (itemId, voteType) => {
    if (userVotes[itemId]) return;
    try {
      const res = await axios.post('/api/votes', { itemId, voteType }, { withCredentials: true });
      setUserVotes(prev => ({ ...prev, [itemId]: voteType }));
      setVotes(prev => ({ ...prev, [itemId]: res.data.votes }));
    } catch (err) {
      if (err.response?.status === 409) alert('You already voted on this item today!');
    }
  };

  if (isAdminRoute) {
    return <AdminPage />;
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        username={username}
        profile={profile}
        isAdmin={isAdmin}
        onlineCount={onlineCount}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'menu' && (
          <MenuTab votes={votes} userVotes={userVotes} onVote={handleVote} username={username} socket={socket} />
        )}
        {activeTab === 'photos' && (
          <PhotoWall username={username} />
        )}
        {activeTab === 'news' && (
          <NewsTab />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-header border-t border-white/10 pb-safe">
        <div className="flex justify-around items-center px-2 py-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 ${activeTab === 'menu' ? 'bg-white/10 text-selu-gold scale-105' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span className={`text-xl transition-transform duration-300 ${activeTab === 'menu' ? 'transform -translate-y-0.5' : ''}`}>🍽️</span>
            <span className="text-[10px] font-semibold mt-0.5">Menu</span>
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 ${activeTab === 'photos' ? 'bg-white/10 text-selu-gold scale-105' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span className={`text-xl transition-transform duration-300 ${activeTab === 'photos' ? 'transform -translate-y-0.5' : ''}`}>📸</span>
            <span className="text-[10px] font-semibold mt-0.5">Photos</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 ${activeTab === 'news' ? 'bg-white/10 text-selu-gold scale-105' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <span className={`text-xl transition-transform duration-300 ${activeTab === 'news' ? 'transform -translate-y-0.5' : ''}`}>📰</span>
            <span className="text-[10px] font-semibold mt-0.5">News</span>
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 text-white/50 hover:text-white/80 hover:bg-white/5"
          >
            <span className="text-xl">👤</span>
            <span className="text-[10px] font-semibold mt-0.5">Profile</span>
          </button>
        </div>
      </nav>

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed right-4 md:right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border border-white/20 ${chatOpen ? 'bg-gradient-to-br from-rose-400 to-rose-600 bottom-24 md:bottom-8' : isAdmin ? 'bg-gradient-to-br from-selu-gold to-yellow-600 bottom-24 md:bottom-8' : 'bg-gradient-to-br from-emerald-400 to-selu-green bottom-24 md:bottom-8'}`}
        style={{ boxShadow: chatOpen ? '0 10px 25px rgba(239,68,68,0.5), inset 0 2px 4px rgba(255,255,255,0.3)' : isAdmin ? '0 10px 25px rgba(200,169,81,0.6), inset 0 2px 4px rgba(255,255,255,0.3)' : '0 10px 25px rgba(0,99,65,0.5), inset 0 2px 4px rgba(255,255,255,0.3)' }}
        aria-label="Toggle chat"
      >
        {chatOpen ? '✕' : isAdmin ? '👑' : '💬'}
      </button>

      {/* Chat popup */}
      {chatOpen && (
        <ChatPanel
          socket={socket}
          username={username}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Profile modal */}
      {profileOpen && (
        <ProfileModal
          username={username}
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onProfileUpdate={fetchProfile}
        />
      )}
    </div>
  );
}
