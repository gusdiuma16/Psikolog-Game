import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import session from "express-session";
import betterSqlite3SessionStore from "better-sqlite3-session-store";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const db = new Database("damaijiwa.db");

// Trust proxy is required for secure cookies behind a reverse proxy (like Cloud Run / nginx)
app.set('trust proxy', 1);

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Initialize DB tables FIRST
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    picture TEXT,
    is_anonymous INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    category TEXT,
    role TEXT,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.use(express.json());

// Use MemoryStore for now to rule out session store issues
app.use(
  session({
    secret: process.env.SESSION_SECRET || "damai-jiwa-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Requires HTTPS (or trust proxy + https)
      sameSite: "none",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

// Auth Middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// --- API Routes ---

app.get("/api/me", (req: any, res) => {
  try {
    if (!req.session.userId) return res.json({ user: null });
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId) as any;
    res.json({
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isAnonymous: !!user.is_anonymous
      } : null
    });
  } catch (error) {
    console.error("Error in /api/me:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/auth/anonymous", (req: any, res) => {
  console.log("Handling /api/auth/anonymous");
  try {
    const anonId = `anon_${Math.random().toString(36).substring(2, 15)}`;
    console.log("Creating anonymous user:", anonId);
    
    // Ensure the insert succeeds
    const stmt = db.prepare("INSERT INTO users (id, is_anonymous) VALUES (?, 1)");
    const info = stmt.run(anonId);
    
    if (info.changes !== 1) {
      throw new Error("Failed to insert anonymous user");
    }

    req.session.userId = anonId;
    
    // Force session save to ensure cookie is set
    req.session.save((err: any) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Session save failed" });
      }
      console.log("Anonymous session created for:", anonId);
      res.json({ user: { id: anonId, isAnonymous: true } });
    });
  } catch (error: any) {
    console.error("Error in /api/auth/anonymous:", error);
    res.status(500).json({ error: "Failed to create anonymous session", details: error.message });
  }
});

app.get("/api/auth/google/url", (req: any, res) => {
  console.log("Handling /api/auth/google/url");
  const redirectUri = `${process.env.APP_URL}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

app.get("/auth/google/callback", async (req: any, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json();

    // Upsert user
    db.prepare(`
      INSERT INTO users (id, email, name, picture, is_anonymous)
      VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        picture = excluded.picture,
        is_anonymous = 0
    `).run(googleUser.sub, googleUser.email, googleUser.name, googleUser.picture);

    // If user was anonymous, we could migrate data here, but for simplicity we just switch session
    req.session.userId = googleUser.sub;

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Login berhasil. Menutup jendela...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/logout", (req: any, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Chat History API
app.get("/api/chat/:category", requireAuth, (req: any, res) => {
  try {
    const history = db.prepare(`
      SELECT role, text FROM chat_history 
      WHERE user_id = ? AND category = ? 
      ORDER BY timestamp ASC
    `).all(req.session.userId, req.params.category);
    res.json({ history });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.post("/api/chat/:category", requireAuth, (req: any, res) => {
  try {
    const { role, text } = req.body;
    db.prepare(`
      INSERT INTO chat_history (user_id, category, role, text)
      VALUES (?, ?, ?, ?)
    `).run(req.session.userId, req.params.category, role, text);
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving chat message:", error);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// Global Error Handler for API routes
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } else {
    next(err);
  }
});

// Catch-all for unhandled API routes to prevent HTML fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// --- Vite Middleware ---
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
