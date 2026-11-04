import { config } from "./config/env.js";
import { createClient } from "./client/createClient.js";
import { registerCommands } from "./commands/registerCommands.js";
import { registerEvents } from "./events/registerEvents.js";

async function main(): Promise<void> {
  const client = createClient();
  registerCommands(client);
  registerEvents(client);
  await client.login(config.discordToken);
}

void main();
