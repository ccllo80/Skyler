# Skyler

A modular Discord bot built with TypeScript, Node.js 22+, and discord.js.

## Current features

- Modular slash-command and event registration.
- `/ping` and `/help`.
- Standalone moderation commands; there is no `/mod` or `/ادارة` command.
- Persistent warning records stored locally in `data/warnings.json`.
- Environment-based configuration. Secrets and runtime warning data are excluded from Git.

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
| `/تحذير` | `العضو`, `السبب` | Add a persistent warning to a member. |
| `/تحذيرات` | `العضو` | Show the member's warning history. |
| `/إزالة-تحذير` | `العضو`, `رقم-التحذير` | Remove one warning by its ID. |
| `/مسح-تحذيرات` | `العضو` | Clear all warnings for a member. |

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
  storage/
  types/
data/                 # Runtime data; ignored by Git
```

## Moderation behavior

- Each action checks the invoking member's relevant permission.
- The bot checks its own permissions and role hierarchy for moderation actions.
- Members cannot target themselves or the bot.
- Moderators cannot target members with an equal or higher role, unless the moderator is the server owner.
- Moderation responses are ephemeral.
- Warning records include the guild, member, moderator, reason, timestamp, and a unique warning ID.
- Warning data is written atomically to `data/warnings.json` and survives bot restarts as long as that data directory is retained by the host.
- Back up `data/warnings.json` before moving hosts or resetting the application disk. A future database adapter can replace this local JSON storage without changing the slash-command interface.

## Security

- Never commit `.env`, bot tokens, API keys, passwords, private user data, or runtime warning records.
- Keep real credentials only in local environment configuration or a trusted secrets manager.
- `.env`, other `.env.*` files, and `data/` are ignored by Git; `.env.example` contains placeholders only.

## Architecture direction

Future systems will be added as independent modules. Hosting and database choices remain open until the bot's features and requirements are complete.
