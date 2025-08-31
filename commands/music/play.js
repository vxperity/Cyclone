const { SlashCommandSubcommandBuilder } = require('@discordjs/builders');
const { useMainPlayer, useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist')
    .addStringOption(opt =>
      opt
        .setName('query')
        .setDescription('Song name or URL')
        .setRequired(true)
    ),

  async execute(interaction) {
    const player = useMainPlayer();
    const queue  = useQueue(interaction.guildId);
    const vc     = interaction.member.voice.channel;

    // Must be in a VC
    if (!vc) {
      return interaction.reply({
        content: '❌ Join a voice channel first.',
        ephemeral: true
      });
    }

    // Guard: don’t overlap
    if (queue?.isPlaying()) {
      return interaction.reply({
        content: '❌ I am already playing something. Please wait for the current track to finish or use `/music skip`.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const query  = interaction.options.getString('query', true);
    const result = await player.play(vc, query, {
      metadata: { channel: interaction.channel }
    });

    const title = result.playlist
      ? `${result.playlist.name} (playlist)`
      : result.track.title;

    return interaction.editReply(`▶️ Queued **${title}**`);
  }
};
