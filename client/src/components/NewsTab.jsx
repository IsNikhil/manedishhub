import React, { useState, useEffect } from 'react';
import axios from 'axios';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return Math.floor(hrs / 24) + 'd ago';
}

function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false);

  const categoryColors = [
    'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-[0_0_8px_rgba(52,211,153,0.15)]',
    'bg-blue-500/15 text-blue-300 border-blue-400/30 shadow-[0_0_8px_rgba(96,165,250,0.15)]',
    'bg-purple-500/15 text-purple-300 border-purple-400/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
    'bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-[0_0_8px_rgba(251,191,36,0.15)]',
    'bg-rose-500/15 text-rose-300 border-rose-400/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
  ];

  return (
    <article className="glass-card overflow-hidden flex flex-col group hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      {/* Thumbnail */}
      {article.image && (
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {article.categories[0] && (
            <span className={`absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full border font-bold backdrop-blur-sm ${categoryColors[0]}`}>
              {article.categories[0]}
            </span>
          )}
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {/* Categories (no image case) */}
        {!article.image && article.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {article.categories.slice(0, 2).map((cat, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${categoryColors[i % categoryColors.length]}`}>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-white text-sm sm:text-base leading-snug mb-2 line-clamp-3 flex-1 group-hover:text-selu-gold transition-colors duration-300">
          {article.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {article.author && (
            <span className="text-[10px] text-selu-gold font-semibold truncate max-w-[140px]">
              ✍️ {article.author}
            </span>
          )}
          <span className="text-[10px] text-white/35">
            {timeAgo(article.pubDate)}
          </span>
        </div>

        {/* Excerpt */}
        {article.description && (
          <p className={`text-xs text-white/60 leading-relaxed mb-3 ${expanded ? '' : 'line-clamp-3'}`}>
            {article.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1"
          >
            Read Full Article
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {article.description && article.description.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {expanded ? 'Less ▲' : 'More ▼'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function NewsTab() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [filter, setFilter] = useState('All');

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/news', { withCredentials: true });
      setArticles(res.data.articles);
      setFetchedAt(res.data.fetchedAt);
      setStale(!!res.data.stale);
      setError(null);
    } catch {
      setError('Could not load news. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Collect unique categories
  const allCats = ['All', ...new Set(articles.flatMap(a => a.categories).filter(Boolean))].slice(0, 8);

  const filtered = filter === 'All'
    ? articles
    : articles.filter(a => a.categories.includes(filter));

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-xl font-bold text-white">📰 The Lion's Roar</h2>
            {stale && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-yellow-300">Cached</span>
            )}
          </div>
          <p className="text-white/40 text-xs">
            Official student news of Southeastern Louisiana University
            {fetchedAt && ` · Updated ${timeAgo(fetchedAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://lionsroarnews.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-selu-gold transition-colors border border-white/10 hover:border-selu-gold/30 rounded-lg px-3 py-1.5"
          >
            Visit Site ↗
          </a>
          <button onClick={load} disabled={loading} className="btn-green text-xs px-3 py-1.5 disabled:opacity-50">
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Category filter pills */}
      {allCats.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 no-scrollbar">
          {allCats.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                filter === cat
                  ? 'bg-selu-gold/20 border-selu-gold/50 text-selu-gold'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card overflow-hidden animate-pulse">
              <div className="h-44 bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-white/8 rounded w-1/3" />
                <div className="h-4 bg-white/8 rounded w-full" />
                <div className="h-4 bg-white/8 rounded w-4/5" />
                <div className="h-3 bg-white/5 rounded w-2/3 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-white/60 text-sm mb-3">{error}</p>
          <button onClick={load} className="btn-gold text-sm">Try Again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40">
          <div className="text-4xl mb-2">🔍</div>
          <p>No articles in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article, i) => (
            <ArticleCard key={i} article={article} />
          ))}
        </div>
      )}

      {/* Footer attribution */}
      <p className="text-center text-[10px] text-white/20 mt-8">
        Content from{' '}
        <a href="https://lionsroarnews.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors underline">
          lionsroarnews.com
        </a>
        {' '}· The Lion's Roar, Student News Media of SLU
      </p>
    </div>
  );
}
