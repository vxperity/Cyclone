const { SlashCommandSubcommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

  async execute(interaction) {
    const queue = useQueue(interaction.guildId);
    if (!queue?.isPlaying()) {
      return interaction.reply('❌ Nothing is playing right now.');
    }
    queue.node.skip();
    return interaction.reply('⏭️ Skipped current track.');
  }
};
