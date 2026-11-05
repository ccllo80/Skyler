import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../../types/command.js";

const ping: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("فحص استجابة البوت."),
  async execute(interaction, client) {
    await interaction.reply({
      content: `Pong! سرعة استجابة البوابة: ${client.ws.ping}ms`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default ping;
