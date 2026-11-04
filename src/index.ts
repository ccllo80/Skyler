import { config } from "./config/env.js";
import { createClient } from "./client/createClient.js";
import { registerCommands } from "./commands/registerCommands.js";
import { registerEvents } from "./events/registerEvents.js";

async function main(): Promise<void> {
  const client = createClient();
  registerCommands(client);
  registerEvents(client);

  const shutdown = (signal: NodeJS.Signals): void => {
    console.info(`[Skyler] Received ${signal}. Shutting down...`);
    client.destroy();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await client.login(config.discordToken);
}

void main().catch((error: unknown) => {
  console.error("[Skyler] Failed to start:", error);
  process.exitCode = 1;
});
