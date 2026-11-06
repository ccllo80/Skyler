import { REST, Routes } from "discord.js";
import { config } from "../src/config/env.js";
import { commands } from "../src/commands/index.js";

async function deployCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  const commandData = commands.map((command) => command.data.toJSON());

  console.info(`[Skyler] Deploying ${commandData.length} global slash commands...`);
  await rest.put(Routes.applicationCommands(config.clientId), { body: commandData });
  console.info("[Skyler] Global slash commands deployed successfully.");
}

void deployCommands().catch((error: unknown) => {
  console.error("[Skyler] Failed to deploy global slash commands:", error);
  process.exitCode = 1;
});
