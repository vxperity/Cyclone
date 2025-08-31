const {
  PermissionsBitField,
  ChannelType,
  AuditLogEvent
} = require('discord.js');

/**
 * 
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').TextChannel} channel  
 * @param {AuditLogEvent|string} type
 * @param {string} targetId   
 * @returns {Promise<import('discord.js').User|null>}
 */
async function fetchExecutor(guild, channel, type, targetId) {
  
  if (channel.type !== ChannelType.GuildText) {
    console.error('Invalid channel type for audit‐log notices');
    return null;
  }

  
  const me = guild.members.me;
  if (!me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) {
    await channel.send(
      '❌ I need the **View Audit Logs** permission to fetch that information. ' +
      'Please grant me View Audit Logs and try again.'
    );
    return null;
  }

  try {
    const logs = await guild.fetchAuditLogs({
      limit: 6,
      type
    });

    const entry = logs.entries.find(e => e.targetId === targetId);
    return entry?.executor ?? null;

  } catch (err) {
    console.error('AuditLog fetch error:', err);

    if (err.code === 50013) {
      await channel.send(
        '❌ I still cannot read the audit logs. Double‐check my permissions and try again.'
      );
    } else {
      await channel.send(
        '❌ An unexpected error occurred while fetching the audit logs.'
      );
    }

    return null;
  }
}

module.exports = { fetchExecutor };
