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

function pickMemberId(req: Request) {
  return req.headers.get('x-user-id') ?? undefined;
}


const AgreementTypeSchema = z.enum(['PARTNERSHIP', 'NDA', 'CONTRIBUTION', 'INVESTMENT', 'SERVICE']);

const TemplateCreateSchema = z.object({
  type: AgreementTypeSchema,
  title: z.string().min(1),
  version: z.number().int().min(1).optional(),
  orbit: z.string().optional(),
  required_level: z.number().int().min(0).optional(),
  template_body: z.record(z.any()),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);

  const { data, error } = await supabase
    .from('agreements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  // NOTE: Auth/RBAC should be enforced via Supabase RLS when using the request JWT.
  // For now, we use service role to keep the route unblocked for first end-to-end wiring.
  // Next iteration: switch to auth token from cookies/headers and rely on RLS.

  const body = TemplateCreateSchema.parse(await req.json());

  // Basic role guard: only Council HR can write templates.
  // Since we use service role, we must verify member role via JWT.
  // We expect the client to pass user id in `x-user-id` for now.
  const xUserId = req.headers.get('x-user-id');
  if (!xUserId) return NextResponse.json({ ok: false, error: 'Missing x-user-id' }, { status: 401 });

  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('id, role')
    .eq('id', xUserId)
    .single();

  if (memberErr) return NextResponse.json({ ok: false, error: memberErr.message }, { status: 400 });
  if (!member || !['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'].includes(member.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('agreements')
    .insert({
      type: body.type,
      title: body.title,
      version: body.version ?? 1,
      orbit: body.orbit ?? null,
      required_level: body.required_level ?? 0,
      template_body: body.template_body,
      created_by: xUserId,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, data });
}

