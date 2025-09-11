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

    
    await message.delete().catch(() => {});

    const type = args[0]?.toLowerCase();
    if (!type) return;

    
    const presencePayload = {
      status: 'online',
      activities: []
    };

    
    const simpleStatusMap = {
      online:  'online',
      idle:    'idle',
      dnd:     'dnd',
      
      offline: 'invisible',
      invisible:'invisible'
    };

    try {
      if (type === 'stream' || type === 'streaming') {
        
        const title = args.slice(1).join(' ') || 'Streaming';
        presencePayload.activities = [
          { name: title,
            type: ActivityType.Streaming,
            url: 'https://twitch.tv/your_channel'
          }
        ];
      }
      else if (simpleStatusMap[type]) {
        
        presencePayload.status = simpleStatusMap[type];
      }
      else {
        
        console.log(`[STATUS] unknown type "${type}", resetting to online`);
      }

     
      await message.client.user.setPresence(presencePayload);
      console.log('[STATUS] updated →', presencePayload);
    }
    catch (err) {
      console.error('[STATUS] failed to update:', err);
    }
  }
};

