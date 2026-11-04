import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import type { BotCommand } from "../../types/command.js";
import type { SkylerClient } from "../../types/client.js";

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

function parseDuration(input: string): number | null {
  const match = /^(\d+)(m|h|d|w)$/i.exec(input.trim());
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "m" ? 60_000 :
    unit === "h" ? 3_600_000 :
    unit === "d" ? 86_400_000 :
    604_800_000;
  const duration = amount * multiplier;

  if (!Number.isSafeInteger(duration) || duration <= 0 || duration > MAX_TIMEOUT_MS) {
    return null;
  }
  return duration;
}

function getReason(interaction: ChatInputCommandInteraction): string {
  return interaction.options.getString("reason")?.trim() || "No reason provided";
}

function isGuildMember(value: GuildMember | null): value is GuildMember {
  return value !== null;
}

const moderation: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Server moderation tools")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("timeout")
        .setDescription("Temporarily prevent a member from interacting")
        .addUserOption((option) =>
          option.setName("member").setDescription("Member to timeout").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("duration")
            .setDescription("Duration: 10m, 2h, 1d, or 1w (maximum 28d)")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason for this action").setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("kick")
        .setDescription("Remove a member from the server")
        .addUserOption((option) =>
          option.setName("member").setDescription("Member to kick").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason for this action").setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ban")
        .setDescription("Ban a member from the server")
        .addUserOption((option) =>
          option.setName("member").setDescription("Member to ban").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason for this action").setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unban")
        .setDescription("Unban a user by their Discord ID")
        .addStringOption((option) =>
          option.setName("user_id").setDescription("Discord user ID").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason for this action").setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("purge")
        .setDescription("Bulk-delete recent messages in this channel")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Number of messages to delete (1–100)")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: SkylerClient) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const action = interaction.options.getSubcommand();
    const actorPermissions = interaction.memberPermissions;
    const requiredPermission =
      action === "timeout" ? PermissionFlagsBits.ModerateMembers :
      action === "kick" ? PermissionFlagsBits.KickMembers :
      action === "ban" || action === "unban" ? PermissionFlagsBits.BanMembers :
      PermissionFlagsBits.ManageMessages;

    if (!actorPermissions?.has(requiredPermission)) {
      await interaction.reply({ content: "You do not have permission to use this moderation action.", ephemeral: true });
      return;
    }

    const reason = getReason(interaction);
    const botMember = interaction.guild.members.me;
    if (!botMember) {
      await interaction.reply({ content: "I could not verify my permissions in this server.", ephemeral: true });
      return;
    }

    if (action === "purge") {
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || !("bulkDelete" in channel)) {
        await interaction.reply({ content: "This command is not supported in this channel.", ephemeral: true });
        return;
      }
      if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({ content: "I need the Manage Messages permission in this channel.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const amount = interaction.options.getInteger("amount", true);
      const deleted = await (channel as TextChannel).bulkDelete(amount, true);
      await interaction.editReply(`Deleted **${deleted.size}** recent messages. Messages older than 14 days are skipped by Discord.`);
      return;
    }

    if (action === "unban") {
      if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        await interaction.reply({ content: "I need the Ban Members permission.", ephemeral: true });
        return;
      }
      const userId = interaction.options.getString("user_id", true).trim();
      if (!/^\d{17,20}$/.test(userId)) {
        await interaction.reply({ content: "That does not look like a valid Discord user ID.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      await interaction.guild.members.unban(userId, reason);
      await interaction.editReply(`Successfully unbanned user **${userId}**.`);
      return;
    }

    const user = interaction.options.getUser("member", true);
    if (user.id === interaction.user.id) {
      await interaction.reply({ content: "You cannot use this action on yourself.", ephemeral: true });
      return;
    }
    if (user.id === client.user?.id) {
      await interaction.reply({ content: "I cannot moderate myself.", ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!isGuildMember(member)) {
      await interaction.reply({ content: "That user is not a member of this server.", ephemeral: true });
      return;
    }

    const botCanAct =
      action === "timeout" ? member.moderatable :
      action === "kick" ? member.kickable :
      member.bannable;
    if (!botCanAct) {
      await interaction.reply({ content: "I cannot moderate this member. Check role hierarchy and my permissions.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (action === "timeout") {
      const durationInput = interaction.options.getString("duration", true);
      const duration = parseDuration(durationInput);
      if (!duration) {
        await interaction.editReply("Invalid duration. Use values such as 10m, 2h, 1d, or 1w (maximum 28d).");
        return;
      }
      await member.timeout(duration, reason);
      await interaction.editReply(`Timed out **${user.tag}** for **${durationInput}**. Reason: ${reason}`);
      return;
    }

    if (action === "kick") {
      await member.kick(reason);
      await interaction.editReply(`Kicked **${user.tag}**. Reason: ${reason}`);
      return;
    }

    if (action === "ban") {
      await member.ban({ reason });
      await interaction.editReply(`Banned **${user.tag}**. Reason: ${reason}`);
    }
  },
};

export default moderation;
