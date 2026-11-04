import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../../types/command.js";

const help: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show the commands currently available in Skyler."),
  async execute(interaction, client) {
    const commandList = [...client.commands.values()]
      .map((command) => `/${command.data.name} — ${command.data.description}`)
      .sort((a, b) => a.localeCompare(b));

    await interaction.reply({
      content: commandList.length
        ? `**Skyler commands**\n${commandList.join("\n")}`
        : "No commands are currently registered.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default help;
