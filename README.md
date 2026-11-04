# Skyler

A modular, extensible Discord bot foundation. Features are built as independent systems so the project can evolve without locking into one hosting provider or database.

## Current foundation

- TypeScript on Node.js 22+
- Discord.js client with minimum required Gateway Intent
- Modular slash-command and event registration
- `/ping` and `/help` commands
- Separate slash-command deployment script
- Environment-based configuration; secrets are excluded from Git

## Setup

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `DISCORD_TOKEN` and `CLIENT_ID` in `.env`.
5. Optionally set `DEV_GUILD_ID` for faster development command updates.
6. Run `npm run deploy:commands`.
7. Start locally with `npm run dev`.

For production, run `npm run build` then `npm start`.

## Commands

| Command | Purpose |
| --- | --- |
| `/ping` | Check bot response and gateway latency. |
| `/help` | List currently registered commands. |
| `/mod timeout` | Temporarily timeout a server member (for example, `10m`, `2h`, or `1d`; maximum 28 days). |
| `/mod kick` | Remove a member from the server. |
| `/mod ban` | Ban a member from the server. |
| `/mod unban` | Unban a user by Discord ID. |
| `/mod purge` | Delete 1–100 recent messages in the current channel; Discord skips messages older than 14 days. |

## Structure

```text
scripts/
  deploy-commands.ts
src/
  client/
  commands/core/
  commands/moderation/
  config/
  events/
  types/
```

## Moderation notes

Moderation actions check the invoking member’s permission for the selected action and verify the bot’s permissions and role hierarchy. Moderation replies are ephemeral. Persistent warnings and configurable moderation logs are intentionally deferred until a suitable storage design is selected.

## Security

Never commit `.env`, bot tokens, API keys, passwords, or private user data. Configure production secrets through the hosting provider environment settings.

## Architecture direction

Future systems will be added as independent modules. Database, hosting, and technology choices remain open and will be selected according to each subsystem’s needs.
