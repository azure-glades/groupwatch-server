# GroupWatch Server
A minimal Node.js + Svelte app for sharing your screen with friends in real-time, featuring:
- WebRTC video streaming (peer-to-peer)
- WebSocket-backed chat and room management
- No authentication—just share a room name

Audio can only be shared through browser tabs. Be sure to play local videos through the web-browser.

# Quick start:

Set up modules
`npm install` in /client and /server

To run the server
```
cd client
npm run build
cd ../server
node index.js
```

This sets up the server locally. Connect to it via your local IP + port `3000`
To expose this server to the internet (to allow your friends to join), use a tunnelling service