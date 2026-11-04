import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { SkylerClient } from "../types/client.js";

export function createClient(): SkylerClient {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as SkylerClient;
  client.commands = new Collection();
  return client;
}
