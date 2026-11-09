# Skyler

A modular Discord bot built with TypeScript, Node.js 22+, and discord.js.

## Current features

- Modular slash-command and event registration.
- Global slash-command deployment only; no per-server command registration.
- /ping and /help.
- Standalone moderation commands and persistent warning records.
- Welcome and departure messages configurable per server from the dashboard.
- A private HTTP API for authenticated dashboard-to-bot communication.
- Environment-based configuration. Secrets and runtime data are excluded from Git.

## Requirements

- Node.js 22 or newer.
- npm.
- A Discord application and bot.

## Local setup

1. Install dependencies:

   ```
   npm install
   ```

2. Copy .env.example to .env and set DISCORD_TOKEN, CLIENT_ID, and a long random SKYLER_API_SECRET.

3. In the Discord Developer Portal, enable **Server Members Intent** under Bot → Privileged Gateway Intents.

4. Register the global slash commands:

   ```
   npm run deploy:commands
   ```

5. Start the bot:

   ```
   npm run dev
   ```

The private API listens on the host-provided PORT or port 3000. It is disabled when SKYLER_API_SECRET is not configured.

## Welcome system

Each server has independent welcome and departure settings. The bot stores them in data/welcome/<guild-id>.json and writes changes atomically.

Supported message placeholders:

- {user} — mention the member.
- {username} — member username.
- {server} — server name.
- {memberCount} — current member count.
- {userId} — member Discord ID.
- {serverId} — server Discord ID.

The bot only lists channels where it has permission to view and send messages. Message mentions are restricted to the member placeholder; arbitrary role and everyone mentions are not allowed.

## Storage and backups

Welcome settings and moderation warnings are stored on the bot host's local disk. They survive restarts only while the host retains its application data. Back up the data/ directory before moving hosts or resetting the application disk.

## Security

- Never commit .env, bot tokens, API secrets, passwords, or runtime data.
- Keep the same strong SKYLER_API_SECRET in the bot host and dashboard server environment.
- Set the dashboard's SKYLER_API_BASE_URL to the bot's HTTPS base URL.
- The dashboard calls the bot API from server-side functions; the API secret is never sent to the browser.
- Keep the bot API behind HTTPS when it is reachable over the public internet.
