import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http'));
};

let supabase = null;
if (isSupabaseConfigured()) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
  console.log('⚡ Connected to Supabase Cloud Database:', SUPABASE_URL);
} else {
  console.log('ℹ️ Supabase credentials not found in .env, falling back to local SQLite mode.');
}

export { supabase };

/**
 * Upload a photo buffer or base64 string to Supabase Storage bucket 'attendance-media'.
 * Returns the permanent public URL.
 */
export async function uploadToSupabaseStorage(data, filename, contentType = 'image/jpeg') {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    let fileBuffer;
    if (Buffer.isBuffer(data)) {
      fileBuffer = data;
    } else if (typeof data === 'string' && data.startsWith('data:image')) {
      const base64Clean = data.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Clean, 'base64');
    } else if (typeof data === 'string') {
      fileBuffer = Buffer.from(data, 'base64');
    } else {
      return null;
    }

    const { error: uploadError } = await supabase.storage
      .from('attendance-media')
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.warn('⚠️ Supabase storage upload warning:', uploadError.message);
      // Fallback: If bucket does not exist or upload blocked by RLS, return base64 data URL directly
      if (typeof data === 'string' && data.startsWith('data:image')) {
        return data;
      }
      return `data:${contentType};base64,${fileBuffer.toString('base64')}`;
    }

    const { data: publicUrlData } = supabase.storage
      .from('attendance-media')
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Error uploading to Supabase Storage:', err);
    if (typeof data === 'string' && data.startsWith('data:image')) {
      return data;
    }
    return null;
  }
}
