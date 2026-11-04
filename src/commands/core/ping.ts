import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../../types/command.js";

const ping: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether Skyler is responding."),
  async execute(interaction, client) {
    await interaction.reply({
      content: `Pong! Gateway latency: ${client.ws.ping}ms`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default ping;
