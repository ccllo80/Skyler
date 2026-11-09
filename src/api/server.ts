import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import {
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
  type NewsChannel,
  type TextChannel,
} from "discord.js";
import type { SkylerClient } from "../types/client.js";
import { config } from "../config/env.js";
import {
  getWelcomeSettings,
  saveWelcomeSettings,
  type WelcomeSettings,
  renderWelcomeMessage,
} from "../storage/welcome.js";

const MAX_BODY_BYTES = 16 * 1024;
type SendableChannel = TextChannel | NewsChannel;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function isAuthorized(request: IncomingMessage): boolean {
  const authorization = request.headers.authorization ?? "";
  const expected = Buffer.from(`Bearer ${config.apiSecret ?? ""}`);
  const actual = Buffer.from(authorization);
  return expected.length > 7 && actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new ApiError("حجم الطلب أكبر من الحد المسموح.", 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ApiError("محتوى الطلب غير صالح.", 400);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSnowflake(value: unknown): value is string {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}

function parseSettings(value: unknown): WelcomeSettings {
  if (!isRecord(value)) throw new ApiError("بيانات الإعدادات غير صالحة.", 400);
  if (
    typeof value.welcomeEnabled !== "boolean" ||
    (value.welcomeChannelId !== null && !isSnowflake(value.welcomeChannelId)) ||
    typeof value.welcomeMessage !== "string" ||
    value.welcomeMessage.trim().length === 0 ||
    value.welcomeMessage.length > 1800 ||
    typeof value.leaveEnabled !== "boolean" ||
    (value.leaveChannelId !== null && !isSnowflake(value.leaveChannelId)) ||
    typeof value.leaveMessage !== "string" ||
    value.leaveMessage.trim().length === 0 ||
    value.leaveMessage.length > 1800
  ) {
    throw new ApiError("تحقق من القنوات ونصوص الرسائل؛ الحد الأقصى للنص 1800 حرف.", 400);
  }
  return {
    welcomeEnabled: value.welcomeEnabled,
    welcomeChannelId: value.welcomeChannelId as string | null,
    welcomeMessage: value.welcomeMessage,
    leaveEnabled: value.leaveEnabled,
    leaveChannelId: value.leaveChannelId as string | null,
    leaveMessage: value.leaveMessage,
  };
}

async function getGuild(client: SkylerClient, guildId: string): Promise<Guild> {
  try {
    return await client.guilds.fetch(guildId);
  } catch {
    throw new ApiError("البوت غير موجود في هذا الخادم أو تعذّر الوصول إليه.", 404);
  }
}

async function getSendableChannel(
  guild: Guild,
  channelId: string,
): Promise<SendableChannel> {
  let channel: GuildBasedChannel | null;
  try {
    channel = await guild.channels.fetch(channelId);
  } catch {
    channel = null;
  }
  if (!channel || !channel.isTextBased() || channel.isThread() || !("send" in channel)) {
    throw new ApiError("القناة المحددة غير موجودة أو ليست قناة نصية صالحة.", 400);
  }

  const botMember = guild.members.me ?? (await guild.members.fetchMe());
  const permissions = channel.permissionsFor(botMember);
  if (
    !permissions ||
    !permissions.has(PermissionFlagsBits.ViewChannel) ||
    !permissions.has(PermissionFlagsBits.SendMessages)
  ) {
    throw new ApiError("لا يملك البوت صلاحية عرض القناة وإرسال الرسائل فيها.", 403);
  }
  return channel as SendableChannel;
}

async function listAvailableChannels(guild: Guild): Promise<{ id: string; name: string }[]> {
  const channels = await guild.channels.fetch();
  const botMember = guild.members.me ?? (await guild.members.fetchMe());
  return [...channels.values()]
    .filter((channel): channel is GuildBasedChannel => {
      if (!channel || !channel.isTextBased() || channel.isThread() || !("send" in channel)) return false;
      const permissions = channel.permissionsFor(botMember);
      return Boolean(
        permissions?.has(PermissionFlagsBits.ViewChannel) &&
          permissions.has(PermissionFlagsBits.SendMessages),
      );
    })
    .map((channel) => ({ id: channel.id, name: channel.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  client: SkylerClient,
): Promise<void> {
  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "غير مصرح بالوصول." });
    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const match = url.pathname.match(/^\/api\/v1\/guilds\/(\d{17,20})\/welcome(?:\/(test))?$/);
  if (!match) {
    sendJson(response, 404, { error: "المسار غير موجود." });
    return;
  }

  const [, guildId, testRoute] = match;
  try {
    const guild = await getGuild(client, guildId);

    if (request.method === "GET" && !testRoute) {
      const [settings, channels] = await Promise.all([
        getWelcomeSettings(guildId),
        listAvailableChannels(guild),
      ]);
      sendJson(response, 200, { settings, channels });
      return;
    }

    if (request.method === "PUT" && !testRoute) {
      const settings = parseSettings(await readJson(request));
      if (settings.welcomeEnabled) {
        if (!settings.welcomeChannelId) throw new ApiError("حدد قناة رسائل الترحيب أولاً.", 400);
        await getSendableChannel(guild, settings.welcomeChannelId);
      }
      if (settings.leaveEnabled) {
        if (!settings.leaveChannelId) throw new ApiError("حدد قناة رسائل المغادرة أولاً.", 400);
        await getSendableChannel(guild, settings.leaveChannelId);
      }
      const saved = await saveWelcomeSettings(guildId, settings);
      sendJson(response, 200, { settings: saved });
      return;
    }

    if (request.method === "POST" && testRoute === "test") {
      const body = await readJson(request);
      if (!isRecord(body) || (body.kind !== "welcome" && body.kind !== "leave")) {
        throw new ApiError("نوع رسالة الاختبار غير صالح.", 400);
      }
      const settings = parseSettings(body.settings);
      const kind = body.kind;
      const enabled = kind === "welcome" ? settings.welcomeEnabled : settings.leaveEnabled;
      const channelId = kind === "welcome" ? settings.welcomeChannelId : settings.leaveChannelId;
      const template = kind === "welcome" ? settings.welcomeMessage : settings.leaveMessage;
      if (!enabled || !channelId) throw new ApiError("فعّل الرسالة وحدد قناتها قبل الاختبار.", 400);

      const channel = await getSendableChannel(guild, channelId);
      const content = renderWelcomeMessage(template, {
        userId: client.user!.id,
        username: "عضو تجريبي",
        server: guild.name,
        memberCount: guild.memberCount,
        serverId: guild.id,
      }).replace(`<@${client.user!.id}>`, "@عضو تجريبي");
      await channel.send({ content, allowedMentions: { parse: [], users: [], roles: [] } });
      sendJson(response, 200, { sent: true });
      return;
    }

    sendJson(response, 405, { error: "طريقة الطلب غير مدعومة." });
  } catch (error) {
    if (error instanceof ApiError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error("[Skyler API] Request failed:", error);
    sendJson(response, 500, { error: "حدث خطأ داخلي أثناء معالجة الطلب." });
  }
}

export async function startApiServer(client: SkylerClient): Promise<Server | null> {
  if (!config.apiSecret) {
    console.warn("[Skyler API] Disabled: SKYLER_API_SECRET is not configured.");
    return null;
  }

  const server = createServer((request, response) => {
    void handleRequest(request, response, client).catch((error: unknown) => {
      console.error("[Skyler API] Unhandled request error:", error);
      if (!response.headersSent) sendJson(response, 500, { error: "حدث خطأ داخلي." });
      else response.destroy();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.apiPort, "0.0.0.0", () => {
      server.removeListener("error", reject);
      console.info(`[Skyler API] Listening on 0.0.0.0:${config.apiPort}`);
      resolve();
    });
  });
  return server;
}
