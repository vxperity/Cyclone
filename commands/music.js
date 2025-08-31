const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');

const subcommandsDir = path.join(__dirname, 'music');


const subcommands = fs
  .readdirSync(subcommandsDir)
  .filter(f => f.endsWith('.js'))
  .map(file => require(path.join(subcommandsDir, file)));



const builder = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Music commands: play, skip, stop, queue, nowplaying')
  .setDefaultMemberPermissions(
    PermissionFlagsBits.Connect | PermissionFlagsBits.Speak
  );

for (const cmd of subcommands) {
  builder.addSubcommand(cmd.data);
}

module.exports = {
  data: builder,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const chosen = interaction.options.getSubcommand();
    const cmd = subcommands.find(c => c.data.name === chosen);

    if (!cmd) {
      return interaction.reply({
        content: '❌ Unknown music subcommand.',
        ephemeral: true
      });
    }

    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error('❌ Music command error:', err);
      await interaction.reply({
        content: '❌ Something went wrong.',
        ephemeral: true
      });
    }
  }
};
