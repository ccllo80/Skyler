import help from "./core/help.js";
import ping from "./core/ping.js";
import { moderationCommands } from "./moderation/commands.js";
import type { BotCommand } from "../types/command.js";

export const commands: BotCommand[] = [ping, help, ...moderationCommands];
