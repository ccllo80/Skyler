import {
  MessageFlags,
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
  const multiplier = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 604_800_000;
  const duration = amount * multiplier;
  return Number.isSafeInteger(duration) && duration > 0 && duration <= MAX_TIMEOUT_MS ? duration : null;
}

function reasonOf(interaction: ChatInputCommandInteraction): string {
  return interaction.options.getString("السبب")?.trim() || "لم يتم تحديد سبب";
}

async function requireGuild(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.inGuild() && interaction.guild) return true;
  await interaction.reply({ content: "هذا الأمر يعمل داخل السيرفرات فقط.", flags: MessageFlags.Ephemeral });
  return false;
}

async function requirePermission(interaction: ChatInputCommandInteraction, permission: bigint): Promise<boolean> {
  if (interaction.memberPermissions?.has(permission)) return true;
  await interaction.reply({ content: "ما عندك صلاحية لاستخدام هذا الأمر.", flags: MessageFlags.Ephemeral });
  return false;
}

async function fetchTargetMember(interaction: ChatInputCommandInteraction, client: SkylerClient): Promise<GuildMember | null> {
  const user = interaction.options.getUser("العضو", true);
  if (user.id === interaction.user.id) {
    await interaction.reply({ content: "ما تكدر تستخدم الأمر على نفسك.", flags: MessageFlags.Ephemeral });
    return null;
  }
  if (user.id === client.user?.id) {
    await interaction.reply({ content: "ما أكدر أطبق الأمر على نفسي.", flags: MessageFlags.Ephemeral });
    return null;
  }
  const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "هذا المستخدم مو موجود بالسيرفر.", flags: MessageFlags.Ephemeral });
    return null;
  }
  const actor = await interaction.guild!.members.fetch(interaction.user.id).catch(() => null);
  if (!actor) {
    await interaction.reply({ content: "ما كدرت أتحقق من صلاحياتك بالسيرفر.", flags: MessageFlags.Ephemeral });
    return null;
  }
  if (interaction.user.id !== interaction.guild!.ownerId && actor.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
    await interaction.reply({ content: "ما تكدر تعاقب عضو رتبته أعلى من رتبتك أو مساوية إلها.", flags: MessageFlags.Ephemeral });
    return null;
  }
  return member;
}

function memberOption(builder: SlashCommandBuilder): SlashCommandBuilder {
  return builder.addUserOption((option) => option.setName("العضو").setDescription("العضو المطلوب").setRequired(true));
}

function reasonOption(builder: SlashCommandBuilder): SlashCommandBuilder {
  return builder.addStringOption((option) => option.setName("السبب").setDescription("سبب الإجراء").setMaxLength(500));
}

const timeoutCommand: BotCommand = {
  data: reasonOption(
    memberOption(new SlashCommandBuilder().setName("تايم-اوت").setDescription("إسكات عضو لمدة محددة"))
      .addStringOption((option) => option.setName("المدة").setDescription("المدة: 10m أو 2h أو 1d أو 1w، والحد الأقصى 28d").setRequired(true)),
  ),
  async execute(interaction, client) {
    if (!(await requireGuild(interaction))) return;
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;
    const durationInput = interaction.options.getString("المدة", true);
    const duration = parseDuration(durationInput);
    if (!duration) {
      await interaction.reply({ content: "المدة غير صحيحة. استخدم مثلاً 10m أو 2h أو 1d أو 1w، والحد الأقصى 28 يوماً.", flags: MessageFlags.Ephemeral });
      return;
    }
    const member = await fetchTargetMember(interaction, client);
    if (!member) return;
    if (!member.moderatable) {
      await interaction.reply({ content: "ما أكدر أسوي تايم أوت لهذا العضو. تحقق من ترتيب الرتب وصلاحياتي.", flags: MessageFlags.Ephemeral });
      return;
    }
    await member.timeout(duration, reasonOf(interaction));
    await interaction.reply({ content: "تم إسكات " + member.user.tag + " لمدة " + durationInput + ".", flags: MessageFlags.Ephemeral });
  },
};

const kickCommand: BotCommand = {
  data: reasonOption(memberOption(new SlashCommandBuilder().setName("طرد").setDescription("طرد عضو من السيرفر"))),
  async execute(interaction, client) {
    if (!(await requireGuild(interaction))) return;
    if (!(await requirePermission(interaction, PermissionFlagsBits.KickMembers))) return;
    const member = await fetchTargetMember(interaction, client);
    if (!member) return;
    if (!member.kickable) {
      await interaction.reply({ content: "ما أكدر أطرد هذا العضو. تحقق من ترتيب الرتب وصلاحياتي.", flags: MessageFlags.Ephemeral });
      return;
    }
    await member.kick(reasonOf(interaction));
    await interaction.reply({ content: "تم طرد " + member.user.tag + " من السيرفر.", flags: MessageFlags.Ephemeral });
  },
};

const banCommand: BotCommand = {
  data: reasonOption(memberOption(new SlashCommandBuilder().setName("باند").setDescription("حظر عضو من السيرفر"))),
  async execute(interaction, client) {
    if (!(await requireGuild(interaction))) return;
    if (!(await requirePermission(interaction, PermissionFlagsBits.BanMembers))) return;
    const member = await fetchTargetMember(interaction, client);
    if (!member) return;
    if (!member.bannable) {
      await interaction.reply({ content: "ما أكدر أحظر هذا العضو. تحقق من ترتيب الرتب وصلاحياتي.", flags: MessageFlags.Ephemeral });
      return;
    }
    await member.ban({ reason: reasonOf(interaction) });
    await interaction.reply({ content: "تم حظر " + member.user.tag + " من السيرفر.", flags: MessageFlags.Ephemeral });
  },
};

const unbanCommand: BotCommand = {
  data: reasonOption(
    new SlashCommandBuilder().setName("رفع-باند").setDescription("رفع الحظر عن مستخدم")
      .addStringOption((option) => option.setName("ايدي").setDescription("معرّف المستخدم في ديسكورد").setRequired(true)),
  ),
  async execute(interaction) {
    if (!(await requireGuild(interaction))) return;
    if (!(await requirePermission(interaction, PermissionFlagsBits.BanMembers))) return;
    const userId = interaction.options.getString("ايدي", true).trim();
    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({ content: "معرّف ديسكورد غير صالح.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.guild!.members.unban(userId, reasonOf(interaction));
    await interaction.reply({ content: "تم رفع الحظر عن المستخدم " + userId + ".", flags: MessageFlags.Ephemeral });
  },
};

const deleteCommand: BotCommand = {
  data: new SlashCommandBuilder().setName("حذف").setDescription("حذف عدد من الرسائل في هذه القناة")
    .addIntegerOption((option) => option.setName("العدد").setDescription("عدد الرسائل المراد حذفها، من 1 إلى 100").setMinValue(1).setMaxValue(100).setRequired(true)),
  async execute(interaction) {
    if (!(await requireGuild(interaction))) return;
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageMessages))) return;
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !("bulkDelete" in channel) || !("guild" in channel)) {
      await interaction.reply({ content: "هذا الأمر ما يشتغل بهذه القناة.", flags: MessageFlags.Ephemeral });
      return;
    }
    const textChannel = channel as TextChannel;
    const botMember = interaction.guild!.members.me;
    if (!botMember?.permissionsIn(textChannel).has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: "أحتاج صلاحية إدارة الرسائل بهذه القناة.", flags: MessageFlags.Ephemeral });
      return;
    }
    const amount = interaction.options.getInteger("العدد", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const deletedCount = amount === 1
      ? await textChannel.messages.fetch({ limit: 1 }).then(async (messages) => {
          const latestMessage = messages.first();
          if (!latestMessage) return 0;
          await latestMessage.delete();
          return 1;
        })
      : (await textChannel.bulkDelete(amount, true)).size;
    await interaction.editReply("تم حذف " + deletedCount + " رسالة. ديسكورد ما يسمح بحذف الرسائل الأقدم من 14 يوماً بالحذف الجماعي.");
  },
};

export const moderationCommands: BotCommand[] = [timeoutCommand, kickCommand, banCommand, unbanCommand, deleteCommand];
