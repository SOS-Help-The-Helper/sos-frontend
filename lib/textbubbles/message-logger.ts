import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { s3Client, S3_BUCKET_NAME } from '@/lib/aws/s3';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export type MessageLogEntry = {
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  message_text?: string;
  message_id?: string;
  status: 'success' | 'error' | 'pending';
  error_message?: string;
  media_urls?: string[];
  media_s3_keys?: string[];
};

/**
 * Log a message to the message_logs table in Supabase.
 * Fire-and-forget - errors are logged to console but never thrown.
 */
export async function logMessage(entry: MessageLogEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('message_logs').insert({
      direction: entry.direction,
      from_number: entry.from_number,
      to_number: entry.to_number,
      message_text: entry.message_text,
      message_id: entry.message_id,
      status: entry.status,
      error_message: entry.error_message,
      media_urls: entry.media_urls,
      media_s3_keys: entry.media_s3_keys,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Failed to write message log:', error.message);
    }
  } catch (err) {
    console.error('Failed to write message log:', err);
  }
}

/**
 * Download media from a URL and upload to S3.
 * Returns the S3 key and mime type, or null if failed.
 */
export async function uploadMediaToS3(
  downloadUrl: string,
  mimeType?: string,
  filename?: string
): Promise<{ s3_key: string; mime_type: string } | null> {
  try {
    if (!S3_BUCKET_NAME) {
      console.error('AWS_S3_BUCKET_NAME not configured');
      return null;
    }

    // TextBubbles attachment download URLs may require auth
    const tbApiKey = process.env.TEXTBUBBLES_API_KEY;
    const headers: Record<string, string> = {};
    if (tbApiKey) {
      headers['Authorization'] = `Bearer ${tbApiKey}`;
    }

    const response = await fetch(downloadUrl, { headers });
    if (!response.ok) {
      console.error('Failed to download media:', response.status, downloadUrl);
      return null;
    }

    let contentType = mimeType || response.headers.get('content-type') || 'application/octet-stream';
    let buffer = Buffer.from(await response.arrayBuffer());

    // Check for HEIC/HEIF and convert to JPEG
    const urlPath = filename?.toLowerCase() || new URL(downloadUrl).pathname.toLowerCase();
    const isHeic = contentType === 'image/heic' || contentType === 'image/heif' ||
                   urlPath.endsWith('.heic') || urlPath.endsWith('.heif');

    if (isHeic) {
      try {
        console.log('Converting HEIC image to JPEG...');
        const converted = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        buffer = Buffer.from(converted);
        contentType = 'image/jpeg';
      } catch (convertErr) {
        console.error('Failed to convert HEIC to JPEG:', convertErr);
      }
    }

    // Map mime types to file extensions
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/x-caf': 'caf',
      'audio/amr': 'amr',
      'application/pdf': 'pdf',
    };

    let ext = extMap[contentType];
    if (!ext && filename) {
      const fileExt = filename.split('.').pop();
      ext = fileExt && fileExt.length <= 5 ? fileExt : 'bin';
    }
    if (!ext) ext = 'bin';

    const s3Key = `textbubbles-media/${uuidv4()}.${ext}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    }));

    console.log('Media uploaded to S3:', s3Key);
    return { s3_key: s3Key, mime_type: contentType };
  } catch (err) {
    console.error('Error uploading media to S3:', err);
    return null;
  }
}
