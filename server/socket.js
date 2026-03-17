const { getDb } = require('./db');
const Filter = require('bad-words');

const filter = new Filter();

function setupSocketHandlers(io, sessionMiddleware) {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);
    io.emit('users:online', io.engine.clientsCount);

    // Send chat history on connection
    const db = getDb();
    const history = db.prepare(`
      SELECT id, username, message, created_at, is_admin as isAdmin FROM chat_messages ORDER BY created_at DESC LIMIT 50
    `).all().reverse();
    socket.emit('chat:history', history);

    // Handle new chat messages
    socket.on('chat:message', (data) => {
      // Re-read session fresh so admin login in another tab is picked up immediately
      sessionMiddleware(socket.request, socket.request.res || {}, () => {
      try {
        const { message } = data;
        if (!message || message.trim().length === 0) return;
        if (message.length > 500) return;

        // Prefer authenticated Google user, fall back to session username
        const user = socket.request.user;
        const sess = socket.request.session;
        const isAdmin = !!(sess && sess.isAdmin);
        const username = user?.display_name || (sess && sess.username) || data.username || 'Anonymous';

        let cleanMessage = message.trim();
        try {
          cleanMessage = filter.clean(cleanMessage);
        } catch (e) {
          // bad-words throws on some inputs, use original
        }

        const now = new Date().toISOString();
        const db = getDb();
        const result = db.prepare(`
          INSERT INTO chat_messages (username, message, created_at, is_admin) VALUES (?, ?, ?, ?)
        `).run(username, cleanMessage, now, isAdmin ? 1 : 0);

        const newMessage = {
          id: result.lastInsertRowid,
          username,
          message: cleanMessage,
          created_at: now,
          isAdmin
        };

        io.emit('chat:message', newMessage);
      } catch (err) {
        console.error('[SOCKET] Chat error:', err.message);
      }
      }); // end sessionMiddleware re-read
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
      io.emit('users:online', io.engine.clientsCount);
    });
  });
}

module.exports = { setupSocketHandlers };
