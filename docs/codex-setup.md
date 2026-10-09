# Codex CLI setup

From PowerShell:

```powershell
cd D:\paddl
codex
```

The repository `.codex/config.toml` selects **gpt-6.1-sol** with **medium** reasoning. Project configuration loads only for trusted projects; accept repository trust if Codex asks. This machine already has Paddl marked trusted. Use `/model` to confirm the selection. Explicit command-line overrides take precedence.

At your request, this repository defaults to `approval_policy = "never"` and `sandbox_mode = "danger-full-access"`: commands run without approval prompts or Codex filesystem/network sandbox restrictions, including access outside this repository. Operating-system permissions and enforced administrator policies still apply. Login and credentials remain personal and are not committed. Configuration behavior follows [OpenAI's configuration guide](https://developers.openai.com/codex/config-basic).

## Skills and token discipline

Portable skill copies are in `.agents/skills/paddl-ponytail/` and `.agents/skills/paddl-obsidian-cli/`. Their project-specific names avoid collisions with installed user/plugin skills. They come from the existing Ponytail 5.1.0 and Obsidian CLI skills, with only their discovery names changed. [Codex discovers repository skills automatically](https://developers.openai.com/codex/skills).

AGENTS.md makes Ponytail full the coding default and asks the agent to search before reading, bound output, reuse existing code, and avoid unnecessary delegation and repeated checks. Obsidian helps retain compact decisions between sessions; it does not automatically reduce model token usage. Keep one short handoff rather than replaying entire chats.

Start the next session with:

```text
Read docs/agent-handoff.md and continue the client-ready login and automatic Supabase saving work. Use Ponytail full. Verify the current code before editing.
```

Use `/skills` to inspect available skills. You can explicitly invoke `$paddl-ponytail` or `$paddl-obsidian-cli`.

## Obsidian

The `obsidian` command was unavailable on PATH during setup. Enable the Obsidian CLI according to [Obsidian's official guide](https://help.obsidian.md/cli), keep Obsidian open, restart your terminal, and confirm `obsidian help` works. Tell the agent the vault name and relevant note path before asking it to use vault notes; no external vault has been selected or changed.

Until then, `docs/agent-handoff.md` is the source of continuity. You can open this repository as an Obsidian vault if you want to view its Markdown notes; that is optional and does not require extra configuration committed to the repository.

## Verify configuration

```powershell
codex --strict-config doctor --summary --no-color
```

This checks CLI configuration and environment health without starting a paid model task. The setup was created using codex-cli 0.161.0. Configuration loaded successfully; a local prompt inspection confirmed both project skills and AGENTS.md were included. An earlier health check reported an elevated Windows sandbox provisioning failure and optional MCP environment warnings. Full-access mode does not use that sandbox; optional connectors may still need credentials. If another machine cannot find the configured model, confirm that its signed-in account has access rather than silently changing models.
