
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { loadWelcomeConfig, sendTestWelcomeMessage } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testwelcome')
    .setDescription('Send a test welcome message.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  async execute(interaction) {
    
    const welcomeConfig = loadWelcomeConfig();

   
    await sendTestWelcomeMessage(interaction, welcomeConfig);
  },
};
