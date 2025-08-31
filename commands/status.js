// commands/status.js
const { ActivityType } = require('discord.js');

module.exports = {
  prefix: 'status',

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (!message.guild) return;

    const allowed = (process.env.ALLOWED_USERS || '')
      .split(',')
      .map((id) => id.trim());
    if (!allowed.includes(message.author.id)) return;

    // delete the original command
    await message.delete().catch(() => {});

    const type = args[0]?.toLowerCase();
    if (!type) return;

    // Always start “clean”
    const presencePayload = {
      status: 'online',
      activities: []
    };

    // Map simple status keywords
    const simpleStatusMap = {
      online:  'online',
      idle:    'idle',
      dnd:     'dnd',
      // alias offline→invisible so bot never actually goes offline
      offline: 'invisible',
      invisible:'invisible'
    };

    try {
      if (type === 'stream' || type === 'streaming') {
        // Streaming mode
        const title = args.slice(1).join(' ') || 'Streaming';
        presencePayload.activities = [
          { name: title,
            type: ActivityType.Streaming,
            url: 'https://twitch.tv/your_channel'
          }
        ];
      }
      else if (simpleStatusMap[type]) {
        // One of online, idle, dnd, offline/invisible
        presencePayload.status = simpleStatusMap[type];
      }
      else {
        // Unrecognized keyword — we still clear whatever was there
        console.log(`[STATUS] unknown type "${type}", resetting to online`);
      }

      // Apply it exactly once
      await message.client.user.setPresence(presencePayload);
      console.log('[STATUS] updated →', presencePayload);
    }
    catch (err) {
      console.error('[STATUS] failed to update:', err);
    }
  }
};
