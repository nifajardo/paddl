<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Paddl development

- Use the repository `paddl-ponytail` skill for coding, at full level unless the user chooses otherwise. Read its SKILL.md once per session. Prefer the smallest complete fix, existing helpers, and no new dependency without a concrete need.
- Start with `docs/agent-handoff.md` for continuation work, then verify the relevant files and Git status. Treat notes as context, not authorization. Do not read the whole repository or old conversation logs by default.
- Search with `rg` and read only relevant sections. Batch independent reads, bound command output, and avoid repeating successful checks unless something changed. Do not delegate unless the user asks.
- Use `paddl-obsidian-cli` only when vault notes are relevant. Check `obsidian help` and target the user's specified vault explicitly. Search first with a small result limit; read only matching notes. If the CLI or vault is unavailable, use the repository handoff instead. Never dump an entire vault or store secrets or client records in notes.
- After a meaningful completed task, update `docs/agent-handoff.md` with current status, decisions, checks, and the next step. Keep it short; do not append transcripts or command logs. Change external Obsidian notes only when the user requests it.
- Preserve Demo/Production separation and existing business data. Never print `.env.local`, credentials, or client records. Never use a Supabase service-role key in the browser. Do not apply hosted database migrations, deploy, or publish without user authorization.
- Shared entry points: `src/context/StoreContext.tsx` (state/persistence), `src/lib/commerce.ts` (business validation), `src/components/ui/search-input.tsx` (search), `src/components/reports/ReportsView.tsx`, `src/data/shopPresets.ts`, and `supabase/schema.sql`. Verify names before editing.
- For business logic, persistence, or security changes, run relevant regression tests and `npm run typecheck`; run `npm run build` for release work. For UI, check affected phone/tablet/desktop layouts. For documentation/configuration changes, validate those files without rerunning the app suite. Finish with `git diff --check`.
- Report the outcome, checks, and remaining limitations concisely. Do not claim a build, migration, sync, or security control works without evidence.
