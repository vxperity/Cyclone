const { SlashCommandSubcommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('queue')
    .setDescription('Show the upcoming tracks'),

  async execute(interaction) {
    const queue = useQueue(interaction.guildId);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply('❌ Nothing is playing right now.');
    }

    // ✅ v8-compatible now playing
    const currentTrack = queue.currentTrack;

    // ✅ v8-compatible queue array
    const tracks = queue.tracks.toArray();

    // 📝 Format upcoming list
    const upcomingList = tracks
      .slice(0, 10)
      .map((track, i) => `${i + 1}. ${track.title} (${track.duration})`)
      .join('\n') || 'No more tracks in queue.';

    let response = `🎶 Now Playing: **${currentTrack.title}** (${currentTrack.duration})\n\n`;
    response += `🗒️ Up Next:\n${upcomingList}`;

    if (tracks.length > 10) {
      response += `\n…and ${tracks.length - 10} more.`;
    }

    return interaction.reply(response);
  }
};
