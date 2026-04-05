/**
 * Vercel serverless entry point.
 * Handles all /api/* requests via the Express app.
 * Static files (dist/public/) are served by Vercel's CDN.
 */
import "dotenv/config";
import { createApp } from "../server/_core/app";

export default createApp();
