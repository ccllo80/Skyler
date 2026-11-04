import { REST, Routes } from "discord.js";
import { config } from "../src/config/env.js";
import { commands } from "../src/commands/index.js";

const rest = new REST({ version: "10" }).setToken(config.discordToken);
const commandData = commands.map((command) => command.data.toJSON());

const route = config.devGuildId
  ? Routes.applicationGuildCommands(config.clientId, config.devGuildId)
  : Routes.applicationCommands(config.clientId);

console.info(
  `[Skyler] Deploying ${commandData.length} slash commands ${
    config.devGuildId ? "to the development guild" : "globally"
  }...`,
);

await rest.put(route, { body: commandData });
console.info("[Skyler] Slash commands deployed successfully.");
