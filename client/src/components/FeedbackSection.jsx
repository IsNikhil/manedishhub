import React, { useState, useEffect } from 'react';
import axios from 'axios';

function StarRating({ value, onChange, readOnly }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button" disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`star text-base ${star <= (hover || value) ? 'text-selu-gold' : 'text-white/20'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >★</button>
      ))}
    </div>
  );
}

export default function FeedbackSection({ itemId, username }) {
  const [feedback, setFeedback] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get(`/api/feedback/${encodeURIComponent(itemId)}`, { withCredentials: true })
      .then(r => setFeedback(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [itemId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/feedback', { itemId, comment, rating: rating || null }, { withCredentials: true });
      setFeedback(prev => [res.data, ...prev]);
      setComment(''); setRating(0);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="border-t border-white/8 p-4 space-y-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Rating:</span>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div className="flex gap-2">
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder={`Share your thoughts as ${username}...`}
            maxLength={280} rows={2}
            className="input-glass flex-1 resize-none"
          />
          <button type="submit" disabled={submitting || !comment.trim()}
            className="btn-green self-end px-3 py-2 text-xs disabled:opacity-50">
            Post
          </button>
        </div>
        <div className="text-right text-[10px] text-white/30">{comment.length}/280</div>
      </form>

      {loading ? (
        <p className="text-xs text-white/30 text-center">Loading...</p>
      ) : feedback.length === 0 ? (
        <p className="text-xs text-white/30 text-center italic">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto chat-scroll">
          {feedback.map(fb => (
            <div key={fb.id} className="rounded-xl p-3 border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-selu-gold">{fb.username}</span>
                <span className="text-[10px] text-white/30">{new Date(fb.created_at).toLocaleDateString()}</span>
              </div>
              {fb.rating && <StarRating value={fb.rating} readOnly />}
              <p className="text-xs text-white/75 mt-1 leading-relaxed">{fb.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
