// liveRoutes.js
const express = require('express');
const router = express.Router();

// If you want to add REST endpoints in the future, you can use this router.
// For now, just return it without doing anything with WebSocket here.

module.exports = (server, wss) => {
  return router;
};
