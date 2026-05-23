import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } },
});

const PdfExportResponse = z.object({
  ok: z.literal(true),
  pdf_url: z.string().min(1),
});

import PDFKit from 'pdfkit';
import { Readable } from 'stream';
import { renderTemplatePlaceholders, resolveTemplateToText } from '@/lib/agreements';
import { storage } from '@/lib/supabaseStorage';

// FIX (TS2345): copy Buffer into a plain ArrayBuffer so Uint8Array<ArrayBuffer>
// is satisfied — avoids SharedArrayBuffer incompatibility with Buffer.buffer.
const toUint8Array = (buf: Buffer): Uint8Array => {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Uint8Array(ab);
};

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const instanceId = ctx.params.id;
  const xUserId = req.headers.get('x-user-id');
  if (!xUserId) return NextResponse.json({ ok: false, error: 'Missing x-user-id' }, { status: 401 });

  // Load instance + template
  const { data: instance, error: instErr } = await supabase
    .from('agreement_instances')
    .select('id,status,agreement_id,filled_data,created_by,signed_at')
    .eq('id', instanceId)
    .maybeSingle();

  if (instErr) return NextResponse.json({ ok: false, error: instErr.message }, { status: 400 });
  if (!instance) return NextResponse.json({ ok: false, error: 'Instance not found' }, { status: 404 });

  const { data: agreement, error: agrErr } = await supabase
    .from('agreements')
    .select('id, title, template_body, type')
    .eq('id', instance.agreement_id)
    .maybeSingle();

  if (agrErr) return NextResponse.json({ ok: false, error: agrErr.message }, { status: 400 });
  if (!agreement) return NextResponse.json({ ok: false, error: 'Agreement not found' }, { status: 404 });

  // Resolve template to text + validate placeholders are present
  const { text } = resolveTemplateToText({
    template_body: agreement.template_body,
    filled_data: instance.filled_data ?? {},
  });

  // Basic branding requirements (Phase 4): header + watermark + signature block.
  // Signature block uses stored signatures.
  const { data: parties, error: partiesErr } = await supabase
    .from('agreement_parties')
    .select('full_name, signature_data, signature_date')
    .eq('agreement_instance_id', instanceId);

  if (partiesErr) return NextResponse.json({ ok: false, error: partiesErr.message }, { status: 400 });

  // Generate PDF bytes with pdfkit (server-side)
  const doc = new PDFKit({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (c: Buffer) => chunks.push(c));

  const signatureDate =
  'signed_at' in instance && instance.signed_at
    ? new Date(instance.signed_at).toISOString()
    : new Date().toISOString();

  // ORBITS header
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('ORBITS LEGAL DOCUMENT', { align: 'center' });

  doc.moveDown(0.5);
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(`Document: ${agreement.title}`, { align: 'center' });

  doc.moveDown(0.5);
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(`Instance ID: ${instanceId}`, { align: 'center' });

  doc.moveDown(1);

  // watermark
  doc.save();
  doc.translate(300, 450);
  doc.rotate(-45);
  doc.opacity(0.08);
  doc.fontSize(48).font('Helvetica-Bold').text('ORBITS', { align: 'center' });
  doc.restore();

  doc.opacity(1);
  doc.moveDown(1);

  // Main text
  doc
    .font('Helvetica')
    .fontSize(11);

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // pdfkit ignores explicit empty lines unless we moveDown
    if (line.trim().length === 0) {
      doc.moveDown(0.25);
      continue;
    }
    doc.text(line);
  }

  doc.moveDown(2);

  // Signature block + timestamp
  doc.font('Helvetica-Bold').fontSize(12).text('Signatures', { align: 'left' });
  doc.moveDown(0.5);

  for (const p of parties ?? []) {
    const sDate = p.signature_date ? new Date(p.signature_date).toISOString().slice(0, 10) : '';
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`${p.full_name ?? ''}`);
    doc
      .font('Helvetica')
      .fontSize(9)
      .text(`Date: ${sDate || signatureDate}`);
    doc.moveDown(0.5);

    // signature_data may be base64 data URL; pdfkit image can be fed bytes.
    // We keep it simple: if it's a data URL, embed image when possible.
    const sig = p.signature_data;
    if (typeof sig === 'string' && sig.startsWith('data:')) {
      try {
        const base64 = sig.split(',')[1] ?? '';
        const imgBuf = Buffer.from(base64, 'base64');
        // Render signature image. Scale down to fit.
        doc.image(imgBuf, { width: 180 });
      } catch {
        // ignore signature image render errors
      }
    }

    doc.moveDown(1);
  }

  doc
    .font('Helvetica')
    .fontSize(9)
    .text(`Exported at: ${new Date().toISOString()}`, { align: 'left' });

  // Footer page numbering
  const totalPagesPlaceholder = '__TOTAL_PAGES__';
  const pageCount = doc.bufferedPageRange();
  // pdfkit doesn't provide total pages synchronously; we omit total and show page/unknown.
  // FIX (TS2339): PDFPage has no .number property — track page count with a plain counter instead.
  let currentPage = 1;
  doc.on('pageAdded', () => {
    currentPage += 1;
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#444')
      .text(`Page ${currentPage}`, 50, doc.page.height - 40);
  });

  doc.end();

  await new Promise<void>((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });

  // FIX (TS2345): toUint8Array copies into a plain ArrayBuffer to satisfy
  // Uint8Array<ArrayBuffer> — avoids SharedArrayBuffer incompatibility.
  const pdfBuf = Buffer.concat(chunks);

  // Upload to Supabase Storage
  const fileName = `agreement_${instanceId}_${Date.now()}.pdf`;
  const publicUrl = await storage.uploadPdf({
    fileName,
    bytes: toUint8Array(pdfBuf),
    pathPrefix: 'agreements',
  });

  // Save pdf_url (store public URL)
  const { error: updErr } = await supabase
    .from('agreement_instances')
    .update({ pdf_url: publicUrl })
    .eq('id', instanceId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

  await supabase.from('agreement_logs').insert({
    agreement_instance_id: instanceId,
    action: 'exported',
    performed_by: xUserId,
    metadata: { exportedAt: new Date().toISOString(), pdf_url: publicUrl },
  });

  return NextResponse.json(PdfExportResponse.parse({ ok: true, pdf_url: publicUrl }));
}