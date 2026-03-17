import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function ProfileModal({ username, profile, onClose, onProfileUpdate }) {
  const [requestedName, setRequestedName] = useState('');
  const [cardFile, setCardFile] = useState(null);
  const [cardPreview, setCardPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('info'); // 'info' | 'request'
  const fileRef = useRef(null);

  const handleCardSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCardFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCardPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedName.trim() || !cardFile) {
      setError('Please enter a name and upload your SLU card.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('requestedName', requestedName.trim());
      fd.append('sluCard', cardFile);
      await axios.post('/api/profile/request-name', fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Request submitted! An admin will verify your SLU card soon.');
      await onProfileUpdate();
      setStep('info');
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-selu-green to-emerald-400 flex items-center justify-center text-lg font-bold text-white">
                {username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="font-bold text-white text-base">My Profile</h2>
                <p className="text-white/40 text-xs">Mane Dish Hub</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors">✕</button>
          </div>

          {/* Current info */}
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Your display name</p>
                <p className="font-bold text-white text-base">{username}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {profile?.verified && <span className="badge-verified">✓ Verified</span>}
                {profile?.pendingRequest && <span className="badge-pending">⏳ Pending review</span>}
                {!profile?.verified && !profile?.pendingRequest && (
                  <span className="text-[10px] text-white/30">Anonymous</span>
                )}
              </div>
            </div>
          </div>

          {profile?.pendingRequest && (
            <div className="mb-4 p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs">
              ⏳ Your name change to <strong>"{profile.requestedName}"</strong> is awaiting admin verification. You'll receive your updated name once approved.
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs">
              ✅ {success}
            </div>
          )}

          {step === 'info' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-white/8" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <h3 className="text-sm font-semibold text-white mb-1">Want a custom name?</h3>
                <p className="text-xs text-white/50 mb-3 leading-relaxed">
                  Request a personalized display name by verifying your SLU student ID card.
                  Your request will be reviewed by an admin.
                </p>
                <button
                  onClick={() => setStep('request')}
                  disabled={!!profile?.pendingRequest}
                  className="btn-gold w-full text-sm disabled:opacity-50"
                >
                  {profile?.pendingRequest ? '⏳ Request Pending...' : '🎓 Verify with SLU Card'}
                </button>
              </div>
              <p className="text-[10px] text-white/25 text-center">Your session is anonymous. Name changes require SLU card verification.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Requested Display Name</label>
                <input
                  type="text"
                  value={requestedName}
                  onChange={e => setRequestedName(e.target.value)}
                  placeholder="Enter your name (e.g. Alex Johnson)"
                  maxLength={30}
                  className="input-glass"
                />
                <p className="text-[10px] text-white/30 mt-1">{requestedName.length}/30 characters</p>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Upload SLU Student ID Card</label>
                <label htmlFor="slu-card-upload" className="flex flex-col items-center justify-center h-36 rounded-xl cursor-pointer border-2 border-dashed border-white/15 hover:border-selu-gold/40 hover:bg-white/5 transition-all overflow-hidden">
                  {cardPreview ? (
                    <img src={cardPreview} alt="SLU Card Preview" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl mb-2">🪪</div>
                      <p className="text-xs text-white/50">Tap to upload SLU ID card</p>
                      <p className="text-[10px] text-white/30 mt-0.5">JPG or PNG</p>
                    </div>
                  )}
                </label>
                <input id="slu-card-upload" ref={fileRef} type="file" accept="image/*" onChange={handleCardSelect} className="hidden" />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2">{error}</p>}

              <div className="flex gap-2">
                <button type="button" onClick={() => { setStep('info'); setError(''); }} className="flex-1 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !requestedName.trim() || !cardFile} className="flex-1 btn-gold disabled:opacity-50">
                  {submitting ? '⏳ Submitting...' : '📤 Submit Request'}
                </button>
              </div>
              <p className="text-[10px] text-white/25 text-center leading-relaxed">
                Your SLU card is only visible to admins for verification and is stored securely.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
