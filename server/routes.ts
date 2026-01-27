import type { Express } from "express";
import { createServer, type Server } from "http";
import googleAuthRoutes from "./routes/google-auth";

export async function registerRoutes(app: Express): Promise<Server | null> {
  /**
   * This application uses Supabase as the database.
   * Most CRUD operations are performed directly from the frontend using Supabase hooks.
   * The backend only handles OAuth flows and serves the frontend.
   */

  // Proxy for Supabase Edge Functions
  app.use('/api/supabase/functions/v1', async (req, res) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    // Forward the request to Supabase
    const functionPath = req.path.replace(/^\//, ''); // Remove leading slash
    const targetUrl = `${supabaseUrl}/functions/v1/${functionPath}`;
    
    // Get the user's auth token from the Authorization header
    const authHeader = req.headers.authorization;
    const userToken = authHeader?.replace('Bearer ', '');
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      };
      
      // If user is authenticated, pass their token; otherwise use anon key
      if (userToken && userToken !== supabaseKey) {
        headers['Authorization'] = `Bearer ${userToken}`;
      } else {
        headers['Authorization'] = `Bearer ${supabaseKey}`;
      }

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Supabase function proxy error:', error);
      res.status(500).json({ error: 'Failed to call Supabase function' });
    }
  });

  // Google Calendar OAuth routes
  app.use('/api/auth/google', googleAuthRoutes);

  // Only create HTTP server if not in serverless environment (Vercel)
  if (process.env.VERCEL) {
    return null;
  }

  const httpServer = createServer(app);
  return httpServer;
}
