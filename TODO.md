# Orbit Network - Council HR Tool (Work Log)

## Step 1 — Confirm requirements
- [x] Council entry point identified: `app/(app)/admin/page.tsx` (role NETWORK_COUNCIL / ARCHITECTURE_BOARD)
- [x] HR tools must live inside this single parent page.
- [x] UI approach confirmed: tabbed HR console.

## Step 2 — Branch strategy
- [x] Created branch: `blackboxai/orbit-hr-council`

## Step 3 — Implement Council HR Console
- [ ] Add a tabbed HR console UI into `app/(app)/admin/page.tsx` with required sections
  - Recruitment pipelines (stages)
  - Onboarding tasks + strict gating overview
  - Agreement engine (UI + audit log placeholders)
  - Workforce management (assignments + promotions unlock checks UI)
- [ ] Implement Supabase-backed actions required by the UI (or UI-only if backend tables/functions are missing)
- [ ] Fix Vercel export/build errors (missing server-side/static constraints) once build logs are available




## Step 4 — Rebrand/AI platform name work
- [ ] (Not modifying code yet) Prepare rebrand plan + name options

## Step 5 — Testing & build
- [ ] Run `next build` on Vercel-like mode (or at least TS check)

## Step 6 — Commit history
- [ ] Create multiple commits for each logical subset of changes.

