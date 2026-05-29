# Docer AWS

## Overview

Docer AWS is a real-time collaborative code editor built with a React/Vite frontend and an Express/Socket.IO backend. The app uses Monaco Editor and Yjs to synchronize text edits between connected users in real time.

## Project structure

- `Backend/` - Node.js server using Express, Socket.IO, and `y-socket.io`
- `Fronted/` - Vite + React frontend with Monaco Editor, Yjs, and collaborative awareness
- `dockerfile` - optional Docker build definition at project root

## Key features

- Shared Monaco code editor
- Real-time collaboration across multiple users
- User presence awareness and join flow
- Backend health check endpoint

## Requirements

- Node.js 18+ (recommended)
- npm

## Setup

1. Install backend dependencies

```bash
cd Backend
npm install
```

2. Install frontend dependencies

```bash
cd ../Fronted
npm install
```

## Running locally

1. Start the backend server

```bash
cd Backend
npm run dev
```

The backend listens on port `3000`.

2. Start the frontend app

```bash
cd ../Fronted
npm run dev
```

By default, Vite will serve the frontend on a port like `5173`.

3. Open the app in your browser

Visit the Vite URL shown in the terminal, then enter a username to join the shared editor.

## Notes

- The frontend uses Yjs and `y-socket.io` to synchronize the Monaco editor content.
- The backend serves static content from `Backend/public` and exposes a health endpoint at `/health`.
- The frontend folder is named `Fronted` in this repository.

## Scripts

### Backend

- `npm run dev` - start the backend with `nodemon`
- `npm start` - start the backend with `nodemon server.js`

### Frontend

- `npm run dev` - start the Vite development server
- `npm run build` - build the frontend for production
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint on the frontend source

