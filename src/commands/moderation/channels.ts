import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type TextChannel } from "discord.js";
import type { BotCommand } from "../../types/command.js";

async function updateChannelLock(
  interaction: Parameters<BotCommand["execute"]>[0],
  locked: boolean,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "هذا الأمر يعمل داخل السيرفرات فقط.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "تحتاج صلاحية إدارة القنوات لاستخدام هذا الأمر.", flags: MessageFlags.Ephemeral });
    return;
  }

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || !("permissionOverwrites" in channel)) {
    await interaction.reply({ content: "هذا الأمر يعمل داخل القنوات النصية فقط.", flags: MessageFlags.Ephemeral });
    return;
  }

  const textChannel = channel as TextChannel;
  const botMember = interaction.guild.members.me;
  if (!botMember?.permissionsIn(textChannel).has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "أحتاج صلاحية إدارة الرتب حتى أغيّر أذونات القناة.", flags: MessageFlags.Ephemeral });
    return;
  }

  await textChannel.permissionOverwrites.edit(
    interaction.guild.id,
    { SendMessages: locked ? false : null },
    { reason: locked ? "قفل القناة بواسطة أمر الإدارة" : "فتح القناة بواسطة أمر الإدارة" },
  );

  await interaction.reply({
    content: locked
      ? `تم قفل قناة <#${textChannel.id}>. أعضاء السيرفر ما يگدرون يرسلون رسائل.`
      : `تم فتح قناة <#${textChannel.id}> وإزالة منع الإرسال عن @everyone، مع الرجوع إلى أذونات القناة الموروثة.`,
    flags: MessageFlags.Ephemeral,
  });
}

const lockCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("قفل")
    .setDescription("منع @everyone من إرسال الرسائل في هذه القناة"),
  async execute(interaction) {
    await updateChannelLock(interaction, true);
  },
};

const unlockCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("فتح")
    .setDescription("إزالة منع الإرسال عن @everyone في هذه القناة"),
  async execute(interaction) {
    await updateChannelLock(interaction, false);
  },
};

export const channelModerationCommands: BotCommand[] = [lockCommand, unlockCommand];
