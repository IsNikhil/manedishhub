import React, { useState } from 'react';
import FeedbackSection from './FeedbackSection';

function DietaryBadge({ tag }) {
  const lower = tag.toLowerCase();
  let style = 'bg-white/5 text-white/70 border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.05)]';
  if (lower.includes('vegan')) style = 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.15)]';
  else if (lower.includes('vegetarian')) style = 'bg-lime-500/10 text-lime-300 border-lime-400/30 shadow-[0_0_8px_rgba(163,230,53,0.15)]';
  else if (lower.includes('gluten')) style = 'bg-yellow-500/10 text-yellow-300 border-yellow-400/30 shadow-[0_0_8px_rgba(250,204,21,0.15)]';
  else if (lower.includes('halal')) style = 'bg-blue-500/10 text-blue-300 border-blue-400/30 shadow-[0_0_8px_rgba(96,165,250,0.15)]';
  else if (lower.includes('dairy')) style = 'bg-orange-500/10 text-orange-300 border-orange-400/30 shadow-[0_0_8px_rgba(251,146,60,0.15)]';
  return (
    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${style}`}>{tag}</span>
  );
}

export default function MenuItemCard({ item, votes, userVote, onVote, username }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const totalVotes = (votes.eat || 0) + (votes.pass || 0);
  const eatPct = totalVotes > 0 ? Math.round((votes.eat / totalVotes) * 100) : 50;
  const passPct = 100 - eatPct;

  return (
    <div className="glass-card flex flex-col h-full group">
      <div className="p-4">
        <h4 className="font-semibold text-white text-sm leading-snug mb-1">{item.name}</h4>

        {item.description && (
          <p className="text-white/50 text-xs mb-3 leading-relaxed line-clamp-2">{item.description}</p>
        )}

        {item.dietary_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.dietary_tags.map((tag, i) => <DietaryBadge key={i} tag={tag} />)}
          </div>
        )}

        {/* Vote buttons */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={() => onVote(item.external_id, 'eat')} disabled={!!userVote}
            className={userVote === 'eat' ? 'voted-eat' : 'btn-eat'}>
            🍽️ Eat {votes.eat > 0 && <span className="opacity-70 text-[11px]">{votes.eat}</span>}
          </button>
          <button onClick={() => onVote(item.external_id, 'pass')} disabled={!!userVote}
            className={userVote === 'pass' ? 'voted-pass' : 'btn-pass'}>
            👎 Pass {votes.pass > 0 && <span className="opacity-70 text-[11px]">{votes.pass}</span>}
          </button>
          {userVote && (
            <span className="text-[11px] text-white/40">You voted {userVote === 'eat' ? '🍽️' : '👎'}</span>
          )}
        </div>

        {/* Vote bar */}
        {totalVotes > 0 && (
          <div className="mb-4">
            <div className="flex rounded-full overflow-hidden h-2.5 bg-white/5 border border-white/5 shadow-inner">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 relative" style={{ width: `${eatPct}%` }} />
              <div className="bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-700" style={{ width: `${passPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-white/40 mt-1.5 font-medium tracking-wide">
              <span>🍽️ {eatPct}%</span>
              <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
              <span>{passPct}% 👎</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setFeedbackOpen(!feedbackOpen)}
          className="text-xs text-selu-gold/80 hover:text-selu-gold font-medium transition-colors flex items-center gap-1"
        >
          {feedbackOpen ? '▲ Hide' : '▼ Reviews & Feedback'}
        </button>
      </div>

      {feedbackOpen && (
        <FeedbackSection itemId={item.external_id} username={username} />
      )}
    </div>
  );
}
