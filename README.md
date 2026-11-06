# Skyler

A modular Discord bot built with TypeScript, Node.js 22+, and discord.js.

## Current features

- Modular slash-command and event registration.
- `/ping` and `/help`.
- Standalone moderation commands; there is no `/mod` or `/ادارة` command.
- Environment-based configuration. Secrets are excluded from Git.

## Requirements

- Node.js 22 or newer.
- npm.
- A Discord application and bot.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the values locally:

   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `DEV_GUILD_ID` (optional; use a development server for faster command updates)

3. Register slash commands:

   ```bash
   npm run deploy:commands
   ```

4. Start the bot in development mode:

   ```bash
   npm run dev
   ```

## Commands

| Command | Required options | Purpose |
| --- | --- | --- |
| `/ping` | — | Check the bot's gateway latency. |
| `/help` | — | List the available commands. |
| `/تايم-اوت` | `العضو`, `المدة` | Timeout a member. Duration examples: `10m`, `2h`, `1d`, `1w`; maximum 28 days. Optional: `السبب`. |
| `/طرد` | `العضو` | Kick a member. Optional: `السبب`. |
| `/باند` | `العضو` | Ban a member. Optional: `السبب`. |
| `/رفع-باند` | `ايدي` | Unban a user by Discord ID. Optional: `السبب`. |
| `/حذف` | `العدد` | Delete 1–100 recent messages in the current channel. Messages older than 14 days are skipped by Discord's bulk-delete behavior. |

Multi-word command names use a hyphen because slash-command names cannot contain spaces.

## Project structure

```text
scripts/
  deploy-commands.ts
src/
  client/
  commands/
    core/
    moderation/
  config/
  events/
  types/
```

## Moderation behavior

- Each action checks the invoking member's relevant permission.
- The bot checks its own permissions and role hierarchy.
- Members cannot target themselves or the bot.
- Moderators cannot target members with an equal or higher role, unless the moderator is the server owner.
- Moderation responses are ephemeral.
- Persistent warnings and configurable moderation logs are deferred until a storage design is chosen.

## Security

- Never commit `.env`, bot tokens, API keys, passwords, or private user data.
- Keep real credentials only in local environment configuration or a trusted secrets manager.
- `.env` and other `.env.*` files are ignored by Git; `.env.example` contains placeholders only.

## Architecture direction

Future systems will be added as independent modules. Hosting and database choices remain open until the bot's features and requirements are complete.
