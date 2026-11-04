import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { SkylerClient } from "./client.js";

export interface BotCommand {
  data: SlashCommandBuilder | ReturnType<SlashCommandBuilder["addSubcommand"]>;
  execute(
    interaction: ChatInputCommandInteraction,
    client: SkylerClient,
  ): Promise<void>;
}
