# 🦁 Mane Dish Hub

A community dining app for Southeastern Louisiana University's **The Mane Dish** dining location.

## Features

- **Real-Time Menu** — Scraped from the official dining site with 30-min auto-refresh
- **Eat or Pass Voting** — Vote on dishes with live Socket.io updates
- **Reviews & Ratings** — Leave star ratings and comments on menu items
- **Community Chat** — Real-time chat panel with profanity filter
- **Photo Wall** — Upload and browse dining photos

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | SQLite (better-sqlite3) |
| Scraping | Playwright (headless Chromium) |
| File uploads | Multer |

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and enter the project
cd mane-dish-hub

# Install all dependencies
npm run install:all

# Install Playwright browsers (first time only)
cd server && npx playwright install chromium && cd ..
```

### Development

```bash
npm run dev
```

This starts:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

### Environment Variables

Copy `.env.example` to `server/.env` and adjust values:

```bash
cp .env.example server/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend server port |
| `CLIENT_URL` | http://localhost:5173 | Frontend URL (for CORS) |
| `SESSION_SECRET` | (change this!) | Express session secret |

## Project Structure

```
mane-dish-hub/
├── client/              # React Vite frontend
│   └── src/
│       ├── components/  # React components
│       ├── App.jsx      # Root component
│       └── index.css    # Global styles + Tailwind
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── db.js            # SQLite setup
│   ├── scraper.js       # Playwright menu scraper
│   ├── socket.js        # Socket.io handlers
│   └── index.js         # Entry point
├── uploads/             # Photo storage
├── db/                  # SQLite database
└── .env.example         # Environment template
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | Get today's menu |
| POST | `/api/menu/refresh` | Trigger fresh scrape |
| GET | `/api/votes` | Get all vote counts for today |
| POST | `/api/votes` | Cast an eat/pass vote |
| GET | `/api/feedback/:itemId` | Get feedback for an item |
| POST | `/api/feedback` | Submit a comment + rating |
| GET | `/api/photos` | Get all photos (paginated) |
| POST | `/api/photos` | Upload a photo |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `vote:update` | Server → Client | Broadcast updated vote counts |
| `chat:message` | Bidirectional | Send/receive chat messages |
| `chat:history` | Server → Client | Last 50 messages on connect |
