


require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

module.exports = (client) => {
  const prefix = process.env.PREFIX || '-';
  const allowedUsers = process.env.ALLOWED_USERS
    ? process.env.ALLOWED_USERS.split(',').map(id => id.trim())
    : [];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  client.on('messageCreate', async (message) => {
    
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const [cmd, ...args] = message.content
      .slice(prefix.length)
      .trim()
      .split(/\s+/);

    
    if (cmd !== 'removecommand' && cmd !== 'deletecommand') return;

    
    if (!allowedUsers.includes(message.author.id)) {
      return message.reply('❌ You are not allowed to use this command.');
    }

    const commandId = args[0];
    if (!commandId) {
      return message.reply(
        `⚠️ Usage: \`${prefix}${cmd} <COMMAND_ID>\``
      );
    }

    try {
      
      await rest.delete(
        Routes.applicationCommand(process.env.CLIENT_ID, commandId)
      );
      await message.reply(
        `✅ Slash command \`${commandId}\` has been removed globally.`
      );
    } catch (error) {
      console.error('Failed to delete command:', error);
      await message.reply(
        '❌ Could not delete the command. Make sure the ID is correct and the bot owns the application.'
      );
    }
  });
};
