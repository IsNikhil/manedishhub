import React, { useState, useEffect, useRef } from 'react';

export default function ChatPanel({ socket, username, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    socket.on('chat:history', (history) => setMessages(history));
    socket.on('chat:message', (msg) => setMessages(prev => [...prev, msg]));
    return () => {
      socket.off('chat:history');
      socket.off('chat:message');
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !username) return;
    socket.emit('chat:message', { username, message: input.trim() });
    setInput('');
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-popup animate-scaleIn">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div>
          <h3 className="font-bold text-sm text-white">💬 Community Chat</h3>
          <p className="text-white/40 text-xs">as <span className="text-selu-gold">{username}</span></p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors text-sm">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 chat-scroll">
        {messages.length === 0 ? (
          <p className="text-white/30 text-xs text-center italic mt-8">No messages yet. Start the conversation! 👋</p>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.username === username;
            const isAdminMsg = !!(msg.isAdmin || msg.is_admin);
            return (
              <div key={msg.id || idx} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm ${
                  isAdminMsg
                    ? 'bg-selu-gold/20 border border-selu-gold/40 text-white rounded-bl-sm'
                    : isOwn
                    ? 'bg-selu-green/70 text-white rounded-br-sm'
                    : 'bg-white/10 text-white/90 rounded-bl-sm'
                }`}>
                  {(!isOwn || isAdminMsg) && (
                    <p className={`text-[10px] font-bold mb-0.5 ${isAdminMsg ? 'text-selu-gold' : 'text-selu-gold'}`}>
                      {isAdminMsg && <span className="mr-1">👑</span>}
                      {msg.username}
                    </p>
                  )}
                  <p className="break-words leading-snug">{msg.message}</p>
                </div>
                <span className="text-[10px] text-white/25 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="input-glass flex-1 py-2"
            style={{ borderRadius: '9999px', paddingLeft: '1rem', paddingRight: '1rem' }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 flex-shrink-0 bg-selu-green rounded-full flex items-center justify-center text-white disabled:opacity-40 hover:bg-emerald-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
