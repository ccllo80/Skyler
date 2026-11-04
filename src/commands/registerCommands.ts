import type { SkylerClient } from "../types/client.js";
import { commands } from "./index.js";

export function registerCommands(client: SkylerClient): void {
  for (const command of commands) {
    if (client.commands.has(command.data.name)) {
      throw new Error(`Duplicate command name: ${command.data.name}`);
    }
    client.commands.set(command.data.name, command);
  }
}
