# KSUMC CPG Platform — Setup Guide

## Quick Start (Demo Mode)
Visit https://ksumc-cpg-next.vercel.app and click **Explore Demo Mode**.
All 16 clinical guideline projects load from seed data.

## Full Setup

### 1. Supabase Database
1. Go to your Supabase project: https://supabase.com/dashboard/project/ufxqmmhfskbvxitahovo
2. Navigate to **SQL Editor**
3. Paste the contents of `supabase/schema.sql` and run it
4. This creates all tables, indexes, RLS policies, and triggers

### 2. Seed Data
After running the schema, seed the database:
```bash
curl -X POST https://ksumc-cpg-next.vercel.app/api/seed
```

### 3. Environment Variables (Vercel)
In Vercel project settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL` — already set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already set
- `GEMINI_API_KEY` — Get from https://aistudio.google.com/apikey

### 4. Gemini AI
1. Go to https://aistudio.google.com/apikey
2. Create a new API key
3. Add it as `GEMINI_API_KEY` in Vercel environment variables
4. Redeploy: `npx vercel deploy --prod --yes`
5. The AI Command Center will switch from fallback to live Gemini responses
