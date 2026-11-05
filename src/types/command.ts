import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import type { SkylerClient } from "./client.js";

export interface BotCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | ReturnType<SlashCommandBuilder["addSubcommand"]>;
  execute(
    interaction: ChatInputCommandInteraction,
    client: SkylerClient,
  ): Promise<void>;
}
