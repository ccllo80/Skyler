import { Events, type GuildMember, type TextChannel, type NewsChannel } from "discord.js";
import type { SkylerClient } from "../types/client.js";
import { getWelcomeSettings, renderWelcomeMessage } from "../storage/welcome.js";

type SendableChannel = TextChannel | NewsChannel;

async function sendMemberMessage(member: GuildMember, kind: "welcome" | "leave"): Promise<void> {
  try {
    const settings = await getWelcomeSettings(member.guild.id);
    const enabled = kind === "welcome" ? settings.welcomeEnabled : settings.leaveEnabled;
    const channelId = kind === "welcome" ? settings.welcomeChannelId : settings.leaveChannelId;
    const template = kind === "welcome" ? settings.welcomeMessage : settings.leaveMessage;
    if (!enabled || !channelId) return;

    const channel = await member.guild.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || channel.isThread() || !("send" in channel)) return;

    const content = renderWelcomeMessage(template, {
      userId: member.id,
      username: member.user.username,
      server: member.guild.name,
      memberCount: member.guild.memberCount,
      serverId: member.guild.id,
    });

    const allowedMentions = template.includes("{user}")
      ? { users: [member.id], roles: [], parse: [] as const }
      : { users: [], roles: [], parse: [] as const };

    await (channel as SendableChannel).send({ content, allowedMentions });
  } catch (error) {
    console.error(`[Skyler] Failed to send ${kind} message in guild ${member.guild.id}:`, error);
  }
}

export function registerWelcomeEvents(client: SkylerClient): void {
  client.on(Events.GuildMemberAdd, (member) => {
    void sendMemberMessage(member, "welcome");
  });

  client.on(Events.GuildMemberRemove, (member) => {
    void sendMemberMessage(member, "leave");
  });
}
