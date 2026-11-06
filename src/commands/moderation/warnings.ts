import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../../types/command.js";
import { addWarning, clearWarnings, getWarnings, removeWarning } from "../../storage/warnings.js";

async function checkModerator(interaction: Parameters<BotCommand["execute"]>[0]): Promise<boolean> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "هذا الأمر يعمل داخل السيرفرات فقط.", flags: MessageFlags.Ephemeral });
    return false;
  }
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "ما عندك صلاحية استخدام أوامر التحذيرات.", flags: MessageFlags.Ephemeral });
    return false;
  }
  return true;
}

async function fetchTarget(interaction: Parameters<BotCommand["execute"]>[0]) {
  const user = interaction.options.getUser("العضو", true);
  if (user.id === interaction.user.id) {
    await interaction.reply({ content: "ما تكدر تطبق هذا الإجراء على نفسك.", flags: MessageFlags.Ephemeral });
    return null;
  }

  const guild = interaction.guild!;
  if (user.id === guild.client.user?.id) {
    await interaction.reply({ content: "ما أكدر أطبق هذا الإجراء على نفسي.", flags: MessageFlags.Ephemeral });
    return null;
  }

  const target = await guild.members.fetch(user.id).catch(() => null);
  if (!target) {
    await interaction.reply({ content: "هذا المستخدم مو موجود بالسيرفر.", flags: MessageFlags.Ephemeral });
    return null;
  }

  const actor = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!actor) {
    await interaction.reply({ content: "ما كدرت أتحقق من رتبتك بالسيرفر.", flags: MessageFlags.Ephemeral });
    return null;
  }
  if (interaction.user.id !== guild.ownerId && actor.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    await interaction.reply({ content: "ما تكدر تطبق الإجراء على عضو رتبته أعلى من رتبتك أو مساوية إلها.", flags: MessageFlags.Ephemeral });
    return null;
  }
  return target;
}

const warnCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("تحذير")
    .setDescription("إضافة تحذير إلى عضو")
    .addUserOption((option) => option.setName("العضو").setDescription("العضو المطلوب").setRequired(true))
    .addStringOption((option) => option.setName("السبب").setDescription("سبب التحذير").setMaxLength(500).setRequired(true)),
  async execute(interaction) {
    if (!(await checkModerator(interaction))) return;
    const member = await fetchTarget(interaction);
    if (!member) return;

    const reason = interaction.options.getString("السبب", true).trim();
    if (!reason) {
      await interaction.reply({ content: "اكتب سبباً للتحذير.", flags: MessageFlags.Ephemeral });
      return;
    }

    const warning = await addWarning({
      guildId: interaction.guild!.id,
      userId: member.id,
      moderatorId: interaction.user.id,
      reason,
    });
    await interaction.reply({
      content: `تمت إضافة التحذير رقم **#${warning.id}** إلى ${member} بنجاح.\n**السبب:** ${reason}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

const warningsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("تحذيرات")
    .setDescription("عرض تحذيرات عضو")
    .addUserOption((option) => option.setName("العضو").setDescription("العضو المطلوب").setRequired(true)),
  async execute(interaction) {
    if (!(await checkModerator(interaction))) return;
    const user = interaction.options.getUser("العضو", true);
    const warnings = await getWarnings(interaction.guild!.id, user.id);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("سجل تحذيرات العضو")
      .setDescription(`العضو: ${user} (\`${user.tag}\`)\nإجمالي التحذيرات: **${warnings.length}**`);

    if (warnings.length === 0) {
      embed.addFields({ name: "لا توجد تحذيرات", value: "هذا العضو ما عليه أي تحذير مسجل." });
    } else {
      for (const warning of warnings.slice(0, 10)) {
        const date = new Date(warning.createdAt);
        const dateText = Number.isNaN(date.getTime()) ? warning.createdAt : `<t:${Math.floor(date.getTime() / 1000)}:f>`;
        embed.addFields({
          name: `تحذير #${warning.id} — ${dateText}`,
          value: `**السبب:** ${warning.reason.slice(0, 700)}\n**بواسطة:** <@${warning.moderatorId}>`,
        });
      }
      if (warnings.length > 10) {
        embed.setFooter({ text: `يتم عرض آخر 10 تحذيرات من أصل ${warnings.length}` });
      }
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

const removeWarningCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("إزالة-تحذير")
    .setDescription("إزالة تحذير محدد من عضو")
    .addUserOption((option) => option.setName("العضو").setDescription("صاحب التحذير").setRequired(true))
    .addIntegerOption((option) => option.setName("رقم-التحذير").setDescription("رقم التحذير").setMinValue(1).setRequired(true)),
  async execute(interaction) {
    if (!(await checkModerator(interaction))) return;
    const member = await fetchTarget(interaction);
    if (!member) return;
    const warningId = interaction.options.getInteger("رقم-التحذير", true);
    const removed = await removeWarning(interaction.guild!.id, member.id, warningId);
    await interaction.reply({
      content: removed
        ? `تمت إزالة التحذير **#${warningId}** من ${member}.`
        : `ما لكيت التحذير **#${warningId}** لهذا العضو.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

const clearWarningsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("مسح-تحذيرات")
    .setDescription("مسح جميع تحذيرات عضو")
    .addUserOption((option) => option.setName("العضو").setDescription("العضو المطلوب").setRequired(true)),
  async execute(interaction) {
    if (!(await checkModerator(interaction))) return;
    const member = await fetchTarget(interaction);
    if (!member) return;
    const count = await clearWarnings(interaction.guild!.id, member.id);
    await interaction.reply({
      content: count > 0
        ? `تم مسح **${count}** تحذير من ${member}.`
        : `${member} ما عليه أي تحذير حتى يتم مسحه.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const warningCommands: BotCommand[] = [
  warnCommand,
  warningsCommand,
  removeWarningCommand,
  clearWarningsCommand,
];
