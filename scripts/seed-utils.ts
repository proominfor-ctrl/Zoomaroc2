import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

dotenv.config();

export function confirmExecution() {
  const CONFIRM = process.env.SEED_CONFIRM === 'yes' || process.argv.includes('--yes');
  if (!CONFIRM) {
    console.error('\n⚠️  Seeder blocked: set SEED_CONFIRM=yes or pass --yes to run this script.');
    console.error('Example: SEED_CONFIRM=yes npx tsx scripts/your-script.ts --yes\n');
    process.exit(1);
  }
}

export function initializeSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env variables. Check .env');
    process.exit(1);
  }
  return createClient(supabaseUrl, supabaseKey);
}

export function initializeFirebaseAdmin(appName?: string, clientProjectId?: string) {
  if (admin.apps.length) {
    const existingApp = appName ? admin.apps.find(app => app?.name === appName) : admin.app();
    if (existingApp) {
      return { app: existingApp, db: existingApp.firestore(), projectId: existingApp.options.projectId };
    }
  }

  let credential: admin.credential.Credential | undefined;
  let derivedProjectId: string | undefined = clientProjectId;

  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      credential = admin.credential.cert(serviceAccount);
      derivedProjectId = serviceAccount.project_id; // This is the source of truth
      console.log('Firebase Admin initialized from FIREBASE_ADMIN_CREDENTIALS env var.');
    } catch (error) {
      console.error('Invalid FIREBASE_ADMIN_CREDENTIALS JSON:', error);
    }
  }

  if (!credential) {
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
        derivedProjectId = serviceAccount.project_id; // This is the source of truth
        console.log('Firebase Admin initialized from serviceAccountKey.json file.');
      } catch (error) {
        console.error('Failed to parse serviceAccountKey.json:', error);
      }
    }
  }

  if (!credential) {
    console.error('❌ CRITICAL ERROR: No Firebase admin credentials found for seeder. Set FIREBASE_ADMIN_CREDENTIALS or create serviceAccountKey.json.');
    process.exit(1);
  }

  const app = admin.initializeApp({ credential, projectId: derivedProjectId }, appName);
  return { app, db: app.firestore(), projectId: derivedProjectId };
}

export function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
export function sleep(ms: number): Promise<void> { return new Promise(res => setTimeout(res, ms)); }

export function collectImageFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectImageFiles(fullPath));
    } else if (fullPath.match(/\.(jpe?g|png)$/i)) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function uploadImage(supabase: SupabaseClient, filePath: string, folder: string) {
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}-${path.basename(filePath)}`;
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from('images').upload(fileName, buffer, {
    contentType: 'image/jpeg', // Assuming jpeg, adjust if needed
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('images').getPublicUrl(fileName);
  return data.publicUrl;
}