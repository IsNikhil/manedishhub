import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function ProfileModal({ username, profile, onClose, onProfileUpdate }) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [cardFile, setCardFile] = useState(null);
  const [cardPreview, setCardPreview] = useState(null);
  const [showVerify, setShowVerify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const isLoggedIn = !!profile?.loggedIn;

  const handleNameSave = async () => {
    if (!newName.trim()) return;
    setSubmitting(true); setError('');
    try {
      await axios.patch('/api/profile/display-name', { displayName: newName.trim() }, { withCredentials: true });
      setSuccess('Name updated!');
      setEditingName(false);
      await onProfileUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update name.');
    } finally { setSubmitting(false); }
  };

  const handleCardSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCardFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCardPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!cardFile) { setError('Please upload your SLU ID card.'); return; }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('sluCard', cardFile);
      await axios.post('/api/profile/verify', fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Verification submitted! Admin will review your SLU card soon.');
      setShowVerify(false);
      await onProfileUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-backdrop animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-fadeInUp">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ${isLoggedIn ? 'bg-gradient-to-br from-selu-green to-emerald-400' : 'bg-white/10'}`}>
                {isLoggedIn ? (username?.[0]?.toUpperCase() || '?') : '👤'}
              </div>
              <div>
                <h2 className="font-bold text-white text-base">My Profile</h2>
                <p className="text-white/40 text-xs">Mane Dish Hub</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors">✕</button>
          </div>

          {/* Not logged in */}
          {!isLoggedIn && (
            <div className="space-y-4">
              <div className="glass rounded-xl p-4 text-center space-y-3">
                <p className="text-white/60 text-sm">You're browsing anonymously as</p>
                <p className="font-bold text-white text-base">{username}</p>
                <p className="text-white/40 text-xs leading-relaxed">Sign in with Google to get a real account, choose your display name, and earn a ✓ verified badge by uploading your SLU student ID.</p>
              </div>
              <a
                href="/auth/google"
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </a>
              <p className="text-[10px] text-white/25 text-center">Only your name and email are used. No posting to your Google account.</p>
            </div>
          )}

          {/* Logged in */}
          {isLoggedIn && (
            <div className="space-y-3">
              {success && (
                <div className="p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs">✅ {success}</div>
              )}

              {/* Display name */}
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-white/40 mb-1">Display name</p>
                {editingName ? (
                  <div className="flex gap-2">
                    <input
                      type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      maxLength={30} placeholder={username}
                      className="input-glass flex-1 py-1.5 text-sm"
                      autoFocus
                    />
                    <button onClick={handleNameSave} disabled={submitting || !newName.trim()} className="btn-gold text-xs px-3 disabled:opacity-50">Save</button>
                    <button onClick={() => { setEditingName(false); setError(''); }} className="text-xs text-white/40 px-2">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-base">{username}</p>
                      {profile?.verified && <span className="badge-verified">✓ Verified</span>}
                      {profile?.pendingVerification && <span className="badge-pending">⏳ Pending</span>}
                    </div>
                    <button onClick={() => { setNewName(username); setEditingName(true); }} className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 glass rounded-lg">Edit</button>
                  </div>
                )}
                {profile?.email && <p className="text-[10px] text-white/30 mt-1">{profile.email}</p>}
              </div>

              {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2">{error}</p>}

              {/* SLU verification */}
              {!profile?.verified && !profile?.pendingVerification && !showVerify && (
                <div className="p-4 rounded-xl border border-white/8" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <h3 className="text-sm font-semibold text-white mb-1">Get verified ✓</h3>
                  <p className="text-xs text-white/50 mb-3 leading-relaxed">Upload your SLU student ID card to get a verified badge on your profile and messages.</p>
                  <button onClick={() => setShowVerify(true)} className="btn-gold w-full text-sm">🎓 Verify with SLU Card</button>
                </div>
              )}

              {profile?.pendingVerification && (
                <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs">
                  ⏳ Your SLU card is under review. You'll get the ✓ badge once an admin verifies it.
                </div>
              )}

              {showVerify && (
                <form onSubmit={handleVerifySubmit} className="space-y-3">
                  <label htmlFor="slu-card-upload" className="flex flex-col items-center justify-center h-36 rounded-xl cursor-pointer border-2 border-dashed border-white/15 hover:border-selu-gold/40 hover:bg-white/5 transition-all overflow-hidden">
                    {cardPreview ? (
                      <img src={cardPreview} alt="SLU Card" className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl mb-2">🪪</div>
                        <p className="text-xs text-white/50">Tap to upload SLU ID card</p>
                        <p className="text-[10px] text-white/30 mt-0.5">JPG or PNG</p>
                      </div>
                    )}
                  </label>
                  <input id="slu-card-upload" ref={fileRef} type="file" accept="image/*" onChange={handleCardSelect} className="hidden" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowVerify(false); setError(''); }} className="flex-1 py-2.5 rounded-xl bg-white/8 text-white/70 text-sm font-medium transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting || !cardFile} className="flex-1 btn-gold disabled:opacity-50">{submitting ? '⏳ Submitting...' : '📤 Submit'}</button>
                  </div>
                  <p className="text-[10px] text-white/25 text-center">SLU card is only visible to admins and stored securely.</p>
                </form>
              )}

              {/* Logout */}
              <button
                onClick={async () => { await axios.post('/auth/logout', {}, { withCredentials: true }); window.location.reload(); }}
                className="w-full py-2.5 rounded-xl bg-red-400/10 border border-red-400/20 text-red-300 text-sm font-medium hover:bg-red-400/20 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
