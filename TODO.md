# TODO — Agreement Management System + HR Onboarding + Messaging (ORBITS)

## Phase 1: Architecture & Schema
- [ ] Add/upgrade Supabase schema to match required Agreement Management System
  - [ ] agreements (templates) with enum type, template_body, version, required fields
  - [ ] agreement_instances with status, filled_data, pdf_url
  - [ ] agreement_parties with signature data per party
  - [ ] agreement_logs (audit trail)
- [ ] Add HR/applicant flow tables/fields to enforce: account creation allowed only within 2 days of approval
  - [ ] applicants table (profile + approval metadata + expiry)
  - [ ] connect applicant approval to members onboarding_stage progression

## Phase 2: Backend API (Next.js Routes)
- [ ] Implement RBAC middleware for admin-only template modifications
- [ ] Implement endpoints:
  - [ ] GET/POST /api/agreements/template
  - [ ] POST /api/agreements/instance
  - [ ] PUT /api/agreements/instance/:id
  - [ ] POST /api/agreements/instance/:id/sign
  - [ ] GET /api/agreements/instance/:id/pdf

## Phase 3: Template Engine + Signing
- [ ] Implement placeholder replacement + required-field validation
- [ ] Implement digital signing capture (store signatures + lock immutability)
- [ ] Ensure signed instances become immutable
- [ ] Ensure every action writes to agreement_logs

## Phase 4: PDF Generation
- [ ] Add PDF generation dependency (server-side)
- [ ] Implement PDF export with:
  - [ ] ORBITS header
  - [ ] page numbering
  - [ ] "ORBITS LEGAL DOCUMENT" watermark
  - [ ] signature block + timestamp

## Phase 5: Frontend Wiring
- [ ] Add minimal UI/usage for HR:
  - [ ] seed 5 ORBITS templates (admin)
  - [ ] approve applicants and advance onboarding stages
- [ ] Add minimal UI/usage for members:
  - [ ] fill required placeholders
  - [ ] view/sign
  - [ ] download PDF

## Phase 6: Messaging
- [ ] Keep existing `messages` table/page as-is (already end-to-end) and only verify RLS + connectivity

## Phase 7: Tests & Run
- [ ] Add integration tests for:

  - [ ] template validation
  - [ ] instance lifecycle
  - [ ] signing immutability
  - [ ] pdf_url saved
- [ ] Verify end-to-end:
  - [ ] HR creates templates
  - [ ] HR approves applicant
  - [ ] applicant can create account within 2 days
  - [ ] next steps proceed
  - [ ] agreement signed + PDF downloadable

---
## Phase 3/4 progress (this run)
- [ ] Implement strict signing immutability enforcement
- [ ] Implement template placeholder replacement + required validation for PDF
- [ ] Replace PDF stub with real server-side generation + upload + pdf_url stored

