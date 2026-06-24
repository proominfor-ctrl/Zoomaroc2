import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { readFileSync, existsSync } from "fs";
import multer from "multer";
import { createServer as createViteServer, ViteDevServer } from "vite";
import dotenv from "dotenv";
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from "./scripts/seed-utils";
import { firebaseConfig } from "./firebase.config.cjs";

dotenv.config();

// Initialize Firebase Admin
// The projectId is now derived from the service account credentials,
// which is the most reliable method. We pass the client-side projectId
// only as a fallback for environments where credentials might not be fully available.
const clientProjectId = firebaseConfig.projectId;
const { app: firebaseAdminApp, db, projectId } = initializeFirebaseAdmin('__server__', clientProjectId);
console.log(`[Server] Firebase Admin initialized for project: ${projectId}`);

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function sanitizeStorageFolder(folder: unknown) {
  if (typeof folder !== "string") return null;
  const sanitizedFolder = folder
    .split("/")
    .map((part) => sanitizeFileName(part))
    .filter(Boolean)
    .join("/");

  const allowedFolders = new Set(["listings", "profiles", "hero", "health", "coupling", "coupling_res"]);
  return allowedFolders.has(sanitizedFolder) ? sanitizedFolder : null;
}

function encodeSitemapId(id: string) {
  return encodeURIComponent(id);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging for debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Configure multer to use memory storage instead of disk
  const storage = multer.memoryStorage();

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
        cb(null, true);
      } else {
        cb(new Error('Only image files allowed'));
      }
    }
  });

  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const decodedToken = await firebaseAdminApp.auth().verifyIdToken(token);
      (req as any).authUser = decodedToken;
      next();
    } catch (error) {
      console.error("Upload auth verification failed:", error);
      const message = error instanceof Error ? error.message : "Invalid authentication token";
      res.status(401).json({ error: message });
    }
  };

  // Image upload endpoint (POST /api/upload)
  app.post('/api/upload', requireAuth, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Multer Error: ${err.message}` });
      } else if (err) {
        return res.status(500).json({ error: err.message });
      }
      next();
    });
  }, async (req: express.Request & { file?: any }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const folder = sanitizeStorageFolder(req.body?.folder);
      if (!folder) {
        return res.status(400).json({ error: 'Invalid upload folder' });
      }

      if (folder === 'hero') {
        const uid = (req as any).authUser?.uid;
        const userSnap = uid ? await db.collection("users").doc(uid).get() : null;
        if (userSnap?.data()?.role !== "admin") {
          return res.status(403).json({ error: 'Admin access required' });
        }
      }

      const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizeFileName(file.originalname)}`;
      const fileName = `${folder}/${baseName}`;
      
      // Upload to Supabase Bucket (make sure to create a bucket named 'images' in Supabase)
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) throw error;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error('Supabase upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload image to Supabase' });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const decodedToken = await firebaseAdminApp.auth().verifyIdToken(token);
      const userSnap = await db.collection("users").doc(decodedToken.uid).get();
      if (userSnap.data()?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      next();
    } catch (error) {
      console.error("Admin auth verification failed:", error);
      const message = error instanceof Error ? error.message : "Invalid authentication token";
      res.status(401).json({ error: message });
    }
  };

  // Admin Stats Route
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    if (!firebaseAdminApp.options.credential) {
      console.error('Admin stats request blocked: Firebase Admin credentials are not configured.');
      return res.status(500).json({ error: 'Firebase Admin credentials are not configured. Check README and .env settings.' });
    }

    try {
      const [usersSnapshot, listingsSnapshot, reportsSnapshot] = await Promise.all([
        db.collection("users").get(),
        db.collection("listings").get(),
        db.collection("reports").where("status", "==", "pending").get()
      ]);
      
      res.json({
        users: usersSnapshot.size,
        listings: listingsSnapshot.size,
        pendingReports: reportsSnapshot.size
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Socket.io for Real-time Chat
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.id} joined chat: ${chatId}`);
    });

    socket.on("send_message", (data) => {
      // data: { chatId, senderId, text, createdAt }
      io.to(data.chatId).emit("receive_message", data);
      console.log(`Message sent in chat ${data.chatId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Dynamic Sitemap Generation
  app.get("/sitemap.xml", async (req, res) => {
    try {
      console.log('[Sitemap] Generating dynamic sitemap...');
      const [listingsSnap, couplingSnap] = await Promise.all([
        db.collection("listings").get(),
        db.collection("coupling_offers").get()
      ]);
      
      console.log(`[Sitemap] Processing ${listingsSnap.size} listings and ${couplingSnap.size} coupling offers.`);

      const baseUrl = "https://su9.ma";
      const urls: string[] = [];

      urls.push(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/health</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/coupling</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/safety</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${baseUrl}/terms</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${baseUrl}/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`);

      // Dynamically add Listing URLs
      listingsSnap.forEach(doc => {
        const data = doc.data();

        // Strictly only include active listings in the sitemap
        if (data.status !== 'active') return;
        
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : doc.updateTime.toDate();
        urls.push(`
  <url>
    <loc>${baseUrl}/listing/${encodeSitemapId(doc.id)}</loc>
    <lastmod>${updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });

      // Dynamically add Coupling URLs
      couplingSnap.forEach(doc => {
        const data = doc.data();

        if (data.status !== 'active') return;
        
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : doc.updateTime.toDate();
        urls.push(`
  <url>
    <loc>${baseUrl}/coupling/${encodeSitemapId(doc.id)}</loc>
    <lastmod>${updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
      });

      urls.push(`\n</urlset>`);

      res.header('Content-Type', 'application/xml');
      res.send(urls.join(''));
    } catch (error) {
      console.error('Sitemap generation error:', error);
      res.status(500).end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      etag: true,
      immutable: true,
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler for API routes
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ API Error:', err.message);
    res.status(err.status || 500).json({ 
      error: err.message || 'Internal Server Error' 
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
