
const { PermissionsBitField } = require('discord.js');

const ALLOWED_USERS = process.env.ALLOWED_USER
  ? process.env.ALLOWED_USER.split(',').map(id => id.trim())
  : [];

module.exports = {
  name: 'terminate',
  prefix: 'terminate',
  description: 'Make the bot leave this guild (owner or allowed users only)',

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (!message.guild) {
      return message.reply('This command only works in a server.');
    }

    const userId = message.author.id;
    const isOwner = userId === message.guild.ownerId;
    const isAllowed = ALLOWED_USERS.includes(userId);

    if (!isOwner && !isAllowed) {
      return message.reply('You do not have permission to terminate me.');
    }

    await message.reply('Terminating… I’m out. 👋');
    try {
      await message.guild.leave();
    } catch (err) {
      console.error('Failed to leave guild:', err);
      message.channel.send('Error: could not leave the guild.');
    }
  }
};
