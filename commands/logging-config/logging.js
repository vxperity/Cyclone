
const {
  Events,
  EmbedBuilder,
  AuditLogEvent
} = require('discord.js');
const {
  getChannelId,
  isEnabled
} = require('./config');
const { fetchExecutor } = require('./helpers');

module.exports = (client) => {
  
  async function send(guildId, embed) {
    const cid = getChannelId(guildId);
    if (!cid) return;
    const ch = client.channels.cache.get(cid);
    if (!ch) return;
    ch.send({ embeds: [embed] }).catch(console.error);
  }

  client.on(Events.MessageDelete, async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    if (!isEnabled(msg.guild.id, 'messageDelete')) return;

    
    const executor = await fetchExecutor(
      msg.guild,
      AuditLogEvent.MessageDelete,
      msg.author.id
    );

    
    const deletedBy = executor
      ? `${executor.tag} (${executor.id})`
      : `${msg.author.tag} (self)`;

    const embed = new EmbedBuilder()
      .setTitle('Message Deleted')
      .setDescription(`A message by ${msg.author} was deleted in ${msg.channel}`)
      .addFields(
        { name: 'Content',   value: msg.content || '*embed/attachment*' },
        { name: 'Author',    value: `${msg.author.tag} (${msg.author.id})`, inline: true },
        { name: 'Deleted by', value: deletedBy, inline: true }
      )
      .setTimestamp();

    await send(msg.guild.id, embed);
  });

  client.on(Events.MessageBulkDelete, async (msgs) => {
    const sample = msgs.first();
    if (!sample?.guild) return;
    if (!isEnabled(sample.guild.id, 'messageBulkDelete')) return;

    
    
    const executor = await fetchExecutor(
      sample.guild,
      AuditLogEvent.MessageBulkDelete
    );

    const deletedBy = executor
      ? `${executor.tag} (${executor.id})`
      : 'Unknown';

    const embed = new EmbedBuilder()
      .setTitle('Bulk Message Delete')
      .setDescription(`${msgs.size} messages deleted in ${sample.channel}`)
      .addFields(
        { name: 'Deleted by', value: deletedBy }
      )
      .setTimestamp();

    await send(sample.guild.id, embed);
  });

  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (!isEnabled(oldMsg.guild.id, 'messageEdit')) return;
    if (oldMsg.content === newMsg.content) return;

    const executor = oldMsg.author;
    const embed = new EmbedBuilder()
      .setTitle('Message Edited')
      .setDescription(`A message by ${executor} was edited in ${oldMsg.channel}`)
      .addFields(
        { name: 'Before', value: oldMsg.content || '*embed/attachment*' },
        { name: 'After',  value: newMsg.content || '*embed/attachment*' },
        { name: 'Author', value: `${executor.tag} (${executor.id})`, inline: true }
      )
      .setTimestamp();

    await send(oldMsg.guild.id, embed);
  });

  client.on(Events.ChannelCreate, async (ch) => {
    if (!ch.guild) return;
    if (!isEnabled(ch.guild.id, 'channelCreate')) return;

    
    const executor = await fetchExecutor(
      ch.guild,
      AuditLogEvent.ChannelCreate,
      ch.id
    );

    const embed = new EmbedBuilder()
      .setTitle('Channel Created')
      .setDescription(`${ch} was created`)
      .addFields(
        { name: 'Created by', value: executor
            ? `${executor.tag} (${executor.id})`
            : 'Unknown' }
      )
      .setTimestamp();

    await send(ch.guild.id, embed);
  });

  client.on(Events.ChannelDelete, async (ch) => {
    if (!ch.guild) return;
    if (!isEnabled(ch.guild.id, 'channelDelete')) return;

    const executor = await fetchExecutor(
      ch.guild,
      AuditLogEvent.ChannelDelete,
      ch.id
    );

    const embed = new EmbedBuilder()
      .setTitle('Channel Deleted')
      .setDescription(`\`${ch.name}\` was deleted`)
      .addFields(
        { name: 'Deleted by', value: executor
            ? `${executor.tag} (${executor.id})`
            : 'Unknown' }
      )
      .setTimestamp();

    await send(ch.guild.id, embed);
  });

  client.on(Events.ChannelUpdate, async (oldCh, newCh) => {
    if (!oldCh.guild) return;
    if (!isEnabled(oldCh.guild.id, 'channelUpdate')) return;

    const executor = await fetchExecutor(
      oldCh.guild,
      AuditLogEvent.ChannelUpdate,
      oldCh.id
    );

    const changes = [];
    if (oldCh.name !== newCh.name) {
      changes.push(`Name: \`${oldCh.name}\` → \`${newCh.name}\``);
    }
    if (oldCh.topic !== newCh.topic) {
      changes.push(`Topic: \`${oldCh.topic || ''}\` → \`${newCh.topic || ''}\``);
    }
    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setTitle('Channel Updated')
      .setDescription(`${newCh}`)
      .addFields(
        { name: 'Changes',     value: changes.join('\n') },
        { name: 'Updated by',  value: executor
            ? `${executor.tag} (${executor.id})`
            : 'Unknown' }
      )
      .setTimestamp();

    await send(oldCh.guild.id, embed);
  });

  client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
    
    if (oldM.nickname !== newM.nickname && isEnabled(oldM.guild.id, 'nicknameChange')) {
      const executor = await fetchExecutor(
        oldM.guild,
        AuditLogEvent.MemberUpdate,
        newM.id
      );

      const embed = new EmbedBuilder()
        .setTitle('Nickname Changed')
        .setDescription(`${newM.user} had their nickname updated`)
        .addFields(
          { name: 'Before', value: oldM.nickname || newM.user.username },
          { name: 'After',  value: newM.nickname || newM.user.username },
          { name: 'Changed by', value: executor
              ? `${executor.tag} (${executor.id})`
              : 'Unknown' }
        )
        .setTimestamp();

      await send(oldM.guild.id, embed);
    }

    
    if (isEnabled(oldM.guild.id, 'memberRoleUpdate')) {
      const added   = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
      const removed = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));
      if (added.size || removed.size) {
        const executor = await fetchExecutor(
          oldM.guild,
          AuditLogEvent.MemberRoleUpdate,
          newM.id
        );

        const fields = [];
        if (added.size)   fields.push({ name: 'Roles Added',   value: added.map(r => r.name).join(', ') });
        if (removed.size) fields.push({ name: 'Roles Removed', value: removed.map(r => r.name).join(', ') });
        fields.push({ name: 'Changed by', value: executor
            ? `${executor.tag} (${executor.id})`
            : 'Unknown' });

        const embed = new EmbedBuilder()
          .setTitle('Member Roles Updated')
          .setDescription(`${newM.user}`)
          .addFields(fields)
          .setTimestamp();

        await send(oldM.guild.id, embed);
      }
    }
  });
};

