import type { Client, Collection } from "discord.js";
import type { BotCommand } from "./command.js";

export type SkylerClient = Client & {
  commands: Collection<string, BotCommand>;
};
