
const { ChannelType } = require('discord.js');

module.exports = (client) => {
  const prefix = process.env.PREFIX || '-';
  const allowedUsers = process.env.ALLOWED_USERS
    ? process.env.ALLOWED_USERS.split(',').map(id => id.trim())
    : [];

  const activeChannels = new Set();
  const cooldowns = new Map();

  client.on('messageCreate', async (message) => {

    if (message.author.bot || message.channel.type !== ChannelType.GuildText) return;

    const content = message.content.trim();
    
    if (content === `${prefix}skullfy()nullindexsocooljstssogurtimthebestatcodingetcetccetoifureadtsgoodboy`) {
      
      if (!allowedUsers.includes(message.author.id)) {
        return message.reply('❌ You are not allowed to run this.').catch(console.error);
      }

      await message.delete().catch(console.error);

      if (activeChannels.has(message.channel.id)) {
        activeChannels.delete(message.channel.id);
        return message.channel.send('💀').catch(console.error);
      } else {
        activeChannels.add(message.channel.id);
        return message.channel.send('💀 Skullify enabled for this channel.').catch(console.error);
      }
    }

    if (activeChannels.has(message.channel.id)) {
      const now = Date.now();
      const last = cooldowns.get(message.channel.id) || 0;

      if (now - last >= 2000) {
        await message.react('💀').catch(console.error);
        cooldowns.set(message.channel.id, now);
      }
    }
  });
};
