import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../../types/command.js";

const help: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("عرض قائمة أوامر Skyler."),
  async execute(interaction, client) {
    const commandList = [...client.commands.values()]
      .map((command) => `/${command.data.name} — ${command.data.description}`)
      .sort((a, b) => a.localeCompare(b));

    await interaction.reply({
      content: commandList.length
        ? `**أوامر Skyler**\n${commandList.join("\n")}`
        : "ماكو أوامر مسجلة حالياً.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default help;
