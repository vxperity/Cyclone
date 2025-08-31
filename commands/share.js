
const {
  SlashCommandBuilder,
  AttachmentBuilder,
  ChannelType
} = require('discord.js');


const shareMessages = new Map();

module.exports = [
  // ─── /share ─────────────────────────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('share')
      .setDescription('Post an uploaded video file in chat')
      .addAttachmentOption(opt =>
        opt
          .setName('video')
          .setDescription('Upload an MP4/MKV file')
          .setRequired(true)
      ),

    async execute(interaction) {
      
      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guild.id;
      const attachment = interaction.options.getAttachment('video');

      
      if (!attachment.contentType?.startsWith('video/')) {
        return interaction.editReply('❌ That isn’t a video.');
      }

      
      const file = new AttachmentBuilder(attachment.url, {
        name: attachment.name
      });

      let publicMsg;
      try {
        
        publicMsg = await interaction.channel.send({
          content: '📺 Here’s your video:',
          files: [file]
        });
      } catch (err) {
        console.error('Failed to upload video:', err);
        return interaction.editReply('❌ Failed to share your video. Try again?');
      }

      
      await interaction.editReply('✅ Video shared!');

      
      shareMessages.set(guildId, {
        channelId: interaction.channelId,
        messageId: publicMsg.id
      });
    }
  },

  // ─── /unshare ────────────────────────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('unshare')
      .setDescription('Remove the last shared video from chat'),

    async execute(interaction) {
      
      const guildId = interaction.guild.id;
      const share = shareMessages.get(guildId);

      if (!share) {
        return interaction.reply({
          content: '❌ No video to remove.',
          ephemeral: true
        });
      }

      const channel = interaction.guild.channels.cache.get(share.channelId);
      if (channel?.type !== ChannelType.GuildText) {
        shareMessages.delete(guildId);
        return interaction.reply({
          content: '⚠️ Channel no longer exists.',
          ephemeral: true
        });
      }

      try {
        const msg = await channel.messages.fetch(share.messageId);
        await msg.delete();
        shareMessages.delete(guildId);
        return interaction.reply({
          content: '🗑️ Video removed.',
          ephemeral: true
        });
      } catch (err) {
        console.error('Failed to remove shared video:', err);
        shareMessages.delete(guildId);
        return interaction.reply({
          content: '❌ Could not remove the video.',
          ephemeral: true
        });
      }
    }
  }
];
