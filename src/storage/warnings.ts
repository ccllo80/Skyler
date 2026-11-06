import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface WarningRecord {
  id: number;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: string;
}

interface WarningStore {
  version: 1;
  nextId: number;
  warnings: WarningRecord[];
}

const storePath = join(process.cwd(), "data", "warnings.json");
let store: WarningStore | null = null;
let queue: Promise<void> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

async function loadStore(): Promise<WarningStore> {
  if (store) return store;

  try {
    const raw = await readFile(storePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("nextId" in parsed) ||
      typeof parsed.nextId !== "number" ||
      !("warnings" in parsed) ||
      !Array.isArray(parsed.warnings)
    ) {
      throw new Error("Invalid warnings storage format.");
    }
    store = parsed as WarningStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error("Could not load data/warnings.json. Warning data was not changed.", { cause: error });
    }
    store = { version: 1, nextId: 1, warnings: [] };
  }

  return store;
}

async function saveStore(next: WarningStore): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  await rename(temporaryPath, storePath);
  store = next;
}

export function addWarning(input: Omit<WarningRecord, "id" | "createdAt">): Promise<WarningRecord> {
  return serialize(async () => {
    const current = await loadStore();
    const warning: WarningRecord = {
      ...input,
      id: current.nextId,
      createdAt: new Date().toISOString(),
    };
    await saveStore({
      ...current,
      nextId: current.nextId + 1,
      warnings: [...current.warnings, warning],
    });
    return warning;
  });
}

export function getWarnings(guildId: string, userId: string): Promise<WarningRecord[]> {
  return serialize(async () => {
    const current = await loadStore();
    return current.warnings
      .filter((warning) => warning.guildId === guildId && warning.userId === userId)
      .sort((a, b) => b.id - a.id);
  });
}

export function removeWarning(guildId: string, userId: string, warningId: number): Promise<boolean> {
  return serialize(async () => {
    const current = await loadStore();
    const index = current.warnings.findIndex(
      (warning) => warning.guildId === guildId && warning.userId === userId && warning.id === warningId,
    );
    if (index === -1) return false;

    const warnings = [...current.warnings];
    warnings.splice(index, 1);
    await saveStore({ ...current, warnings });
    return true;
  });
}

export function clearWarnings(guildId: string, userId: string): Promise<number> {
  return serialize(async () => {
    const current = await loadStore();
    const remaining = current.warnings.filter(
      (warning) => warning.guildId !== guildId || warning.userId !== userId,
    );
    const removedCount = current.warnings.length - remaining.length;
    if (removedCount > 0) await saveStore({ ...current, warnings: remaining });
    return removedCount;
  });
}
