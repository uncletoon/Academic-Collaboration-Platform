const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Configs
const { initDatabase } = require("./config/db");
const { initSocket } = require("./config/socket");
const { startServerWithPortFallback } = require("./serverStartup");

// Express App
const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Avatars and public-news imagery are public assets. Documents use authenticated routes.
app.use(
  "/uploads/avatars",
  express.static(path.join(__dirname, "..", "uploads", "avatars")),
);
app.use(
  "/uploads/news/images",
  express.static(path.join(__dirname, "..", "uploads", "news", "images")),
);

// Routes mapping
const apiRouter = require("./routes/api");
app.use("/api", apiRouter);

// API consumers must always receive JSON, including for unmatched routes.
app.use("/api", (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Basic health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    message: "Academic Collaboration Server is running.",
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Database initialization then start server
async function startServer() {
  try {
    const { port } = await startServerWithPortFallback({
      createServer: () => server,
      initDb: initDatabase,
      initSocket,
      defaultPort: 5000,
      logger: console,
    });

    console.log(`==================================================`);
    console.log(`Server started successfully on port ${port}`);
    console.log(`API endpoint: http://localhost:${port}/api`);
    console.log(`Real-Time Socket: ws://localhost:${port}`);
    console.log(`==================================================`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
