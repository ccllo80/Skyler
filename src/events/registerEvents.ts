import { Events, MessageFlags } from "discord.js";
import type { SkylerClient } from "../types/client.js";

export function registerEvents(client: SkylerClient): void {
  client.once(Events.ClientReady, (readyClient) => {
    console.info(`[Skyler] Logged in as ${readyClient.user.tag}`);
    console.info(`[Skyler] Loaded ${client.commands.size} commands: ${[...client.commands.keys()].join(", ")}`);
  });

  client.on(Events.Error, (error) => {
    console.error("[Skyler] Discord client error:", error);
  });

  client.on(Events.Warn, (warning) => {
    console.warn("[Skyler] Discord client warning:", warning);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    console.info(`[Skyler] Interaction received: type=${interaction.type}, command=${interaction.isChatInputCommand() ? interaction.commandName : "non-chat"}`);

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    console.info(`[Skyler] Command lookup: /${interaction.commandName}, found=${Boolean(command)}`);

    if (!command) {
      await interaction.reply({
        content: "This command is not available.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await command.execute(interaction, client);
      console.info(`[Skyler] Command completed: /${interaction.commandName}`);
    } catch (error) {
      console.error(`[Skyler] Command error: /${interaction.commandName}`, error);
      const response = {
        content: "Something went wrong while running this command.",
        flags: MessageFlags.Ephemeral,
      } as const;

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response).catch(console.error);
      } else {
        await interaction.reply(response).catch(console.error);
      }
    }
  });
}
