const { SlashCommandSubcommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),

  async execute(interaction) {
    const queue = useQueue(interaction.guildId);
    if (!queue?.isPlaying()) {
      return interaction.reply('❌ Nothing is playing right now.');
    }

    const track = queue.currentTrack;
    const bar = queue.createProgressBar({ length: 20 });
    return interaction.reply(
      `🎵 Now Playing: **${track.title}** (${track.duration})\n` + bar
    );
  }
};
