# WebSocket Fix - Restart Instructions

## Step 1: Stop the Dev Servers
In your terminal windows running the dev servers, press **Ctrl+C** to stop them:
- Backend: Ctrl+C
- Frontend: Ctrl+C

## Step 2: Clear Vite Cache
Run this command in the project root:
```bash
rm -rf frontend/node_modules/.vite
rm -rf /tmp/.vite
rm -rf frontend/dist
```

## Step 3: Restart Backend
```bash
cd backend
npm run start:dev
```
(Keep this terminal running)

## Step 4: Restart Frontend
In a NEW terminal window:
```bash
cd frontend
npm run dev
```
(Keep this terminal running)

## Step 5: Verify in Browser
Go to http://localhost:3000 and check the console for:
- "Connected to collaboration server" message
- NO WebSocket errors

## What Changed:
1. Added VITE_WS_URL=http://localhost:5000 to .env.development
2. Added namespace: '/decks' to Socket.io client config
3. Fixed dependency array in useCollaboration hook to prevent infinite loops
4. Updated CORS config to respect SOCKET_IO_CORS_ORIGIN environment variable
