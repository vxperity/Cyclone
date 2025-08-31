const { SlashCommandSubcommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

  async execute(interaction) {
    const queue = useQueue(interaction.guildId);
    if (!queue?.isPlaying()) {
      return interaction.reply('❌ Nothing is playing right now.');
    }
    await queue.delete();
    return interaction.reply('⏹️ Stopped playback and cleared the queue.');
  }
};
