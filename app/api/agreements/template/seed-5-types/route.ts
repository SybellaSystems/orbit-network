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

const SeedRequestSchema = z.object({
  force: z.boolean().optional().default(false),
});

const templates = [
  {
    type: 'PARTNERSHIP' as const,
    title: 'ORBITS Partnership Agreement',
    required_level: 0,
    template_body: {
      preamble: 'This ORBITS Partnership Agreement is made on {{start_date}} between {{full_name}} ...',
      body: `\n\n1. Offer\nOfferor: {{full_name}} (ID: {{id_number}})\n\n2. Acceptance\nBy signing on {{signature_date}}, the Parties accept the terms.\n\n3. Consideration\nIn consideration of mutual promises, the Parties agree to ...\n\n4. Legal Capacity\nEach Party represents it has capacity to enter this Agreement.\n\n5. Mutual Consent\nMutual consent is evidenced by the signatures below.\n\n6. Lawful Purpose\nThis Agreement has a lawful purpose.\n\n7. Parties\nParty 1: {{full_name}}\nRole: {{role}}\n\n8. Responsibilities\n{{responsibilities}}\n\n9. Term and Termination\nStart: {{start_date}} End: {{end_date}}\nTermination conditions: {{termination_conditions}}\n\n10. Breach & Remedies\nBreach and remedies are agreed as follows: {{breach_remedies}}\n\n11. Dispute Resolution\nJurisdiction: {{governing_law}}; Arbitration: {{arbitration_terms}}\n\n12. Signatures\nSignature: {{signature_data}}`,
      signature_block: {
        timestamp: '{{signature_date}}',
      },
    },
  },
  {
    type: 'NDA' as const,
    title: 'ORBITS Non-Disclosure Agreement (NDA)',
    required_level: 0,
    template_body: {
      body: `\n\nPreamble & Recitals\n{{recitals}}\n\n1. Offer\n{{offer}}\n\n2. Acceptance\n{{acceptance}}\n\n3. Consideration\n{{consideration}}\n\n4. Legal Capacity\n{{legal_capacity}}\n\n5. Mutual Consent\n{{mutual_consent}}\n\n6. Lawful Purpose\n{{lawful_purpose}}\n\nDefinitions\nConfidential Information: {{confidential_definition}}\n\nTerms & Obligations\n{{nda_obligations}}\n\nConfidentiality Clause\nThe Parties agree to keep Confidential Information secret.\n\nTermination\n{{termination_conditions}}\n\nBreach & Remedies\n{{breach_remedies}}\n\nDispute Resolution & Governing Law\n{{dispute_resolution}}\n\nSignatures\nParty: {{full_name}} Role: {{role}} Signature: {{signature_data}} Date: {{signature_date}}`,
    },
  },
  {
    type: 'CONTRIBUTION' as const,
    title: 'ORBITS Member Contribution Agreement',
    required_level: 0,
    template_body: {
      body: `\n\nCore Elements\nOffer: {{offer}}\nAcceptance: {{acceptance}}\nConsideration: {{consideration}}\nLegal Capacity: {{legal_capacity}}\nMutual Consent: {{mutual_consent}}\nLawful Purpose: {{lawful_purpose}}\n\nContribution\nDeliverables: {{deliverables}}\nStart: {{start_date}} End: {{end_date}}\n\nFinancial Terms (if applicable)\nContribution Amount: {{contribution_amount}}\n\nConfidentiality\n{{confidentiality_clause}}\n\nTermination\n{{termination_conditions}}\n\nBreach & Remedies\n{{breach_remedies}}\n\nDispute Resolution\n{{dispute_resolution}}\n\nSignatures\n{{full_name}} — {{signature_date}}`,
    },
  },
  {
    type: 'INVESTMENT' as const,
    title: 'ORBITS Investment & Profit Sharing Agreement',
    required_level: 0,
    template_body: {
      body: `\n\nInvestment & Profit Sharing\nInvestor: {{full_name}} ({{id_number}})\nWallet: {{wallet_address}}\n\nOffer/Acceptance/Consideration\n{{offer}} {{acceptance}} {{consideration}}\n\nProfit Share\nPercentage: {{profit_share_percentage}}\nPayments: {{payment_terms}}\n\nConfidentiality\n{{confidentiality_clause}}\n\nTermination\n{{termination_conditions}}\n\nBreach & Remedies\n{{breach_remedies}}\n\nDispute Resolution & Governing Law\n{{dispute_resolution}}\n\nSignatures\n{{full_name}} — {{signature_date}}`,
    },
  },
  {
    type: 'SERVICE' as const,
    title: 'ORBITS Service / Task Delivery Agreement',
    required_level: 0,
    template_body: {
      body: `\n\nService Offer\nProvider: {{full_name}} Role: {{role}}\nProject: {{project_name}}\n\nDeliverables / Task\n{{deliverables}}\n\nConsideration / Payments\n{{payment_terms}}\n\nConfidentiality\n{{confidentiality_clause}}\n\nTermination\n{{termination_conditions}}\n\nBreach & Remedies\n{{breach_remedies}}\n\nDispute Resolution\n{{dispute_resolution}}\n\nSignatures\n{{full_name}} — {{signature_date}}`,
    },
  },
];

export async function POST(req: Request) {
  const body = SeedRequestSchema.parse(await req.json().catch(() => ({})));

  // This seed endpoint is admin-only; enforce via member role if possible
  const xUserId = req.headers.get('x-user-id');
  if (!xUserId) return NextResponse.json({ ok: false, error: 'Missing x-user-id' }, { status: 401 });

  const { data: member, error: memErr } = await supabase.from('members').select('id,role').eq('id', xUserId).maybeSingle();
  if (memErr) return NextResponse.json({ ok: false, error: memErr.message }, { status: 400 });
  if (!member || !['NETWORK_COUNCIL','ARCHITECTURE_BOARD'].includes(member.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  for (const t of templates) {
    if (!body.force) {
      const { data: existing } = await supabase.from('agreements').select('id').eq('type', t.type).maybeSingle();
      if (existing?.id) continue;
    }

    // Upsert by type+title
    const payload = {
      type: t.type,
      title: t.title,
      version: 1,
      orbit: null,
      required_level: t.required_level,
      template_body: t.template_body,
      created_by: xUserId,
    };

    // Supabase doesn't have native upsert without constraints; just insert.
    await supabase.from('agreements').insert(payload);
  }

  return NextResponse.json({ ok: true });
}

