import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const storage = {
  async uploadPdf({
    pathPrefix,
    fileName,
    bytes,
    contentType,
  }: {
    pathPrefix: string;
    fileName: string;
    bytes: Uint8Array;
    contentType?: string;
  }): Promise<string> {
    const bucket = process.env.SUPABASE_PDF_BUCKET ?? 'agreement-pdfs';
    const publicBase = process.env.SUPABASE_STORAGE_PUBLIC_URL;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${supabaseServiceKey}` },
      },
    });

    // Store under a stable prefix
    const path = `${pathPrefix}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: contentType ?? 'application/pdf',
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    // Prefer explicit public base URL if configured
    if (publicBase) {
      return `${publicBase.replace(/\/$/, '')}/${bucket}/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
    }

    // Fallback to supabase getPublicUrl
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

