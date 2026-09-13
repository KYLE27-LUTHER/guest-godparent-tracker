# Guest & Godparent Tracker

A mobile-friendly guest and godparent tracker using Vite + Supabase Postgres.

## Features

- Guest list
- Godparent list
- Add/edit/delete
- Search and filters
- RSVP and attendance tracking
- Number of seats/guests per family
- Godparent confirmation
- Godparent payment status and amount
- Separate guest and godparent headcounts
- Dashboard/statistics
- Invitation-card integration through the same Supabase database
- CSV export (opens in Excel)
- Print-friendly lists
- No application login
- Cloud database

## Local setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase project URL and anon/publishable key.
5. Run:

```bash
npm install
npm run dev
```

6. Open the local URL shown by Vite.

## Deployment

This project can be deployed as a Vercel or Render Static Site. Add these environment variables in the hosting dashboard:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Then deploy from GitHub.

## Security warning

Because this version intentionally has no login, the included RLS policies allow anyone who can access the app to read/write the guest and godparent tables. Do not put sensitive information in this database. If the app will be used by many people or contain private contact information, add authentication and tighten the RLS policies before production use.
