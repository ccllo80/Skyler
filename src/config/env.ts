import "dotenv/config";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const apiPort = Number(process.env.PORT || process.env.SKYLER_API_PORT || "3000");
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
  throw new Error("PORT or SKYLER_API_PORT must be a valid TCP port.");
}

export const config = {
  discordToken: requiredEnv("DISCORD_TOKEN"),
  clientId: requiredEnv("CLIENT_ID"),
  apiSecret: process.env.SKYLER_API_SECRET?.trim() || null,
  apiPort,
} as const;
