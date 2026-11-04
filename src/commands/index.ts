import help from "./core/help.js";
import ping from "./core/ping.js";
import moderation from "./moderation/mod.js";
import type { BotCommand } from "../types/command.js";

export const commands: BotCommand[] = [ping, help, moderation];
