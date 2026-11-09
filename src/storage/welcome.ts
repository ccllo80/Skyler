import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface WelcomeSettings {
  welcomeEnabled: boolean;
  welcomeChannelId: string | null;
  welcomeMessage: string;
  leaveEnabled: boolean;
  leaveChannelId: string | null;
  leaveMessage: string;
}

const defaults: WelcomeSettings = {
  welcomeEnabled: false,
  welcomeChannelId: null,
  welcomeMessage: "أهلاً {user} بك في **{server}**! أنت العضو رقم **{memberCount}**.",
  leaveEnabled: false,
  leaveChannelId: null,
  leaveMessage: "غادر **{username}** الخادم. نتمنى له التوفيق.",
};

const dataDirectory = join(process.cwd(), "data", "welcome");
const cache = new Map<string, WelcomeSettings>();
let queue: Promise<void> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function isSettings(value: unknown): value is WelcomeSettings {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.welcomeEnabled === "boolean" &&
    (data.welcomeChannelId === null || typeof data.welcomeChannelId === "string") &&
    typeof data.welcomeMessage === "string" &&
    typeof data.leaveEnabled === "boolean" &&
    (data.leaveChannelId === null || typeof data.leaveChannelId === "string") &&
    typeof data.leaveMessage === "string"
  );
}

export async function getWelcomeSettings(guildId: string): Promise<WelcomeSettings> {
  const cached = cache.get(guildId);
  if (cached) return { ...cached };

  const filePath = join(dataDirectory, `${guildId}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isSettings(parsed)) throw new Error("Invalid welcome settings format.");
    cache.set(guildId, parsed);
    return { ...parsed };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(`Could not load welcome settings for guild ${guildId}.`, { cause: error });
    }
    cache.set(guildId, { ...defaults });
    return { ...defaults };
  }
}

export function saveWelcomeSettings(
  guildId: string,
  settings: WelcomeSettings,
): Promise<WelcomeSettings> {
  return serialize(async () => {
    const next = { ...settings };
    const filePath = join(dataDirectory, `${guildId}.json`);
    const temporaryPath = `${filePath}.tmp`;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(temporaryPath, JSON.stringify(next, null, 2) + "\n", "utf8");
    await rename(temporaryPath, filePath);
    cache.set(guildId, next);
    return { ...next };
  });
}

export function renderWelcomeMessage(
  template: string,
  values: { userId: string; username: string; server: string; memberCount: number; serverId: string },
): string {
  return template
    .replaceAll("{user}", `<@${values.userId}>`)
    .replaceAll("{username}", values.username)
    .replaceAll("{server}", values.server)
    .replaceAll("{memberCount}", String(values.memberCount))
    .replaceAll("{userId}", values.userId)
    .replaceAll("{serverId}", values.serverId);
}

export function getDefaultWelcomeSettings(): WelcomeSettings {
  return { ...defaults };
}
