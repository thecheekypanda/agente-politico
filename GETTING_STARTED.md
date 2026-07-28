# Getting Started — from zero to your first Claude Code session

Written for a complete beginner to Git/GitHub, on Windows. If you're on macOS/Linux, the only different steps are marked.

By the end of this, you'll have: a GitHub repository, a working copy of it on your computer, Claude Code installed, and the project's `CLAUDE.md` + `BACKLOG.md` in place so Claude Code knows what to build and in what order.

## Step 1 — Create a GitHub account

1. Go to [github.com](https://github.com) and click **Sign up** (top right).
2. Follow the prompts (email, password, username). Verify your email when GitHub asks.

Skip this if you already have an account.

## Step 2 — Create the new repository

1. Once logged in, click the **+** icon in the top-right corner → **New repository**.
2. **Repository name:** something like `o-que-fizeram`.
3. **Description:** optional, e.g. "Plain-language tracker of Portuguese parliamentary activity vs. party programs."
4. **Public / Private:** choose **Public**. This matters — it's what makes GitHub Actions (the scheduled data-ingestion jobs) free and unlimited, and it's part of the project's transparency design (see `CLAUDE.md`).
5. Check **Add a README file**.
6. Leave "Add .gitignore" as **None** for now (Claude Code can add one later once it knows the tech stack).
7. Click the green **Create repository** button.

You now have an empty repo living on GitHub's servers. Next you need a copy of it on your computer.

## Step 3 — Install Git

1. Download Git for Windows: [git-scm.com/downloads/win](https://git-scm.com/downloads/win), run the installer.
2. Click through the installer accepting the defaults — the defaults are fine. (This also installs **Git Bash**, which Claude Code will use as its terminal tool on Windows instead of PowerShell — this is recommended, not required.)
3. To check it worked, open **Git Bash** (search for it in the Start menu) and type:
   ```
   git --version
   ```
   You should see something like `git version 2.4x.x`.

*macOS: Git usually comes pre-installed; check with `git --version` in Terminal. If missing, install [Homebrew](https://brew.sh) then run `brew install git`.*

## Step 4 — Clone the repo to your computer

1. Back on your repository's GitHub page, click the green **Code** button, and copy the HTTPS URL (looks like `https://github.com/your-username/o-que-fizeram.git`).
2. Open **Git Bash**, navigate to where you want the project folder to live, e.g.:
   ```
   cd ~/Documents
   ```
3. Clone it:
   ```
   git clone https://github.com/your-username/o-que-fizeram.git
   cd o-que-fizeram
   ```

You now have a local folder that's connected to your GitHub repo.

## Step 5 — Install Claude Code

You need a Claude Pro, Max, Team, Enterprise, or Console account — the free claude.ai plan doesn't include Claude Code.

In Git Bash (or PowerShell), run:

**Windows (PowerShell):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**Windows (Git Bash) / macOS / Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Once it finishes, verify it installed correctly:
```
claude --version
```

## Step 6 — Log in

From inside your project folder, run:
```
claude
```

This opens Claude Code and, the first time, walks you through login in your browser. Follow the prompts.

## Step 7 — Add the project's memory and backlog files

Copy these three files (already generated for you) into your local `o-que-fizeram` folder:

- `CLAUDE.md` → goes at the **root** of the repo (same level as the README) — Claude Code reads this automatically every session.
- `docs/strategy.md` → create a `docs` folder inside the repo and put the full strategy document there.
- `docs/BACKLOG.md` → same `docs` folder.

Folder should look like:
```
o-que-fizeram/
├── CLAUDE.md
├── README.md
└── docs/
    ├── strategy.md
    └── BACKLOG.md
```

## Step 8 — Commit and push these starter files

In Git Bash, from inside the `o-que-fizeram` folder:
```bash
git add .
git commit -m "Add project memory, strategy doc, and starter backlog"
git push
```

Refresh the repo page on GitHub — you should see all the files there now.

## Step 9 — Start your first real Claude Code session

From inside the project folder:
```
claude
```

Claude Code will automatically read `CLAUDE.md`. A good first prompt:

> Read CLAUDE.md and docs/BACKLOG.md. Let's start with Phase 0, item 0.1 (repo scaffold + CI skeleton). Propose the tech stack and folder structure before writing any code.

Work through `docs/BACKLOG.md` roughly in order — that's the point of numbering it. After each item is done and you've looked over what changed, commit:
```bash
git add .
git commit -m "0.1: repo scaffold + CI skeleton"
git push
```

## Step 10 — Connect Cloudflare Pages (after 0.1 is committed and pushed)

This is an account-level action only you can do — Claude Code can't click through the Cloudflare dashboard for you.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up / log in (free tier is fine).
2. In the sidebar: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Authorize Cloudflare's GitHub app and pick your `o-que-fizeram` repo.
4. Build settings — this repo is an npm workspace, so use:
   - **Framework preset:** Astro
   - **Build command:** `npm install && npm run build --workspace=web`
   - **Build output directory:** `web/dist`
   - **Root directory:** leave as `/` (the repo root — not `web/`), so the workspace install picks up both packages.
5. Click **Save and Deploy**. First build takes a minute or two; you'll get a `*.pages.dev` URL showing the placeholder page.

After this, every push to `main` auto-deploys — no secrets, no GitHub Actions changes needed. (A custom domain can be added later from the same Pages project settings, once there's something worth pointing it at.)

## Step 11 — Create the Supabase project (needed for backlog 1.1+)

Another account-level step only you can do. Until this is done, the nightly ingestion workflow will run but skip itself with a notice — that's expected, not an error.

1. Go to [supabase.com](https://supabase.com) and sign up / log in (free tier is fine).
2. **New project** → pick an org, name it (e.g. `o-que-fizeram`), set a database password (save it somewhere — you likely won't need it day-to-day since the app uses the API key, not a direct DB connection), pick a region close to Portugal (e.g. `eu-west-1`/`eu-west-2`).
3. Once the project is provisioned, run every file in `supabase/migrations/` **in filename order** — each one only creates what it adds, so skipping one leaves a table/index/function missing: **SQL Editor** in the left sidebar → **New query** → paste the file's contents → **Run**. Repeat per file, oldest timestamp first:
   - `20260727000000_iniciativas.sql`
   - `20260727010000_votacoes.sql`
   - `20260727020000_iniciativas_canonical_url_index.sql`
   - `20260727030000_party_programs.sql`

   Run any new migration files the same way as they're added.
4. Get your credentials: **Project Settings** (gear icon) → **API**.
   - **Project URL** → this is `SUPABASE_URL`.
   - **service_role key** (under "Project API keys", *not* the `anon` key — the service role key bypasses row-level security, which is correct for a trusted server-side ingestion job, but never expose it in frontend code) → this is `SUPABASE_SERVICE_ROLE_KEY`.
5. Add both as GitHub Actions secrets so the cron job can use them: on GitHub, your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
6. (Optional, for testing ingestion locally before the next cron run) create a `.env` file at the repo root — it's already gitignored — with:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   Then run `npx tsx --env-file=.env pipeline/src/ingest-iniciativas.ts` from the repo root, or trigger the workflow manually from GitHub's **Actions** tab → **Ingestion** → **Run workflow** once the secrets are set.
7. **Party program PDFs are a separate workflow, not part of the daily cron.** Once secrets are set, go to **Actions** → **Ingest party programs** → **Run workflow** — this one only needs running once per election cycle (or whenever a program is formally revised), not daily.
8. To confirm it actually worked: in Supabase, **Table Editor** in the left sidebar → check `iniciativas` and `votacoes` have rows after step 6/the Ingestion workflow, and `party_programs`/`program_chunks` have rows after step 7.

## A few habits worth keeping

- **Review before you commit.** Claude Code will show you diffs — actually read them, especially anything touching the alignment-engine prompt template (Phase 3), since `CLAUDE.md` treats that as the highest-risk part of the whole project.
- **One backlog item per session (roughly).** Keeps context focused and diffs reviewable.
- **`/clear` between unrelated tasks.** `CLAUDE.md` gets automatically reloaded, so you won't lose the project rules.
- **`claude doctor`** if anything seems broken — it's a read-only diagnostic that won't start a session.
- **GitHub Issues (optional, later):** once you're comfortable, you can copy each `docs/BACKLOG.md` item into a real GitHub Issue for nicer tracking — not necessary to start.
