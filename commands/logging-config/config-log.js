const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
  getChannelId,
  setChannelId,
  getEnabledEvents,
  addEvents,
  removeEvents
} = require('./config');

const EVENT_KEYS = [
  'messageDelete',
  'messageBulkDelete',
  'messageEdit',
  'channelCreate',
  'channelDelete',
  'channelUpdate',
  'nicknameChange',
  'memberRoleUpdate'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-config')
    .setDescription('Configure where and what to log')
    .addSubcommand(sub =>
      sub
        .setName('show')
        .setDescription('Show current log channel and enabled events')
    )
    .addSubcommand(sub =>
      sub
        .setName('interactive')
        .setDescription('Interactively configure log channel & events')
    ),

  async execute(interaction) {
    const gid = interaction.guildId;
    const sub = interaction.options.getSubcommand();

    // ─── SHOW ───────────────────────────────────────────────────────────────
    if (sub === 'show') {
      const chanId = getChannelId(gid);
      const evts   = getEnabledEvents(gid);
      const embed  = new EmbedBuilder()
        .setTitle('🔍 Logging Configuration')
        .addFields(
          { name: 'Channel', value: chanId ? `<#${chanId}>` : '*none*', inline: true },
          { name: 'Events',  value: evts.join(', ') || '*none*', inline: true }
        )
        .setColor('Grey')
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ─── INTERACTIVE ────────────────────────────────────────────────────────
    if (sub === 'interactive') {
      
      let selectedChannelId = getChannelId(gid);
      let selectedEvents    = getEnabledEvents(gid);

      
      const channelMenu = new ChannelSelectMenuBuilder()
        .setCustomId('select_channel')
        .setPlaceholder('Select log channel (or leave empty)')
        .setChannelTypes([0])
        .setMinValues(0)
        .setMaxValues(1);

      
      const eventOptions = EVENT_KEYS.map(key => ({
        label: key,
        value: key,
        default: selectedEvents.includes(key)
      }));
      const eventMenu = new StringSelectMenuBuilder()
        .setCustomId('select_events')
        .setPlaceholder('Select events to log')
        .setMinValues(0)
        .setMaxValues(EVENT_KEYS.length)
        .addOptions(eventOptions);

      
      const confirmBtn = new ButtonBuilder()
        .setCustomId('confirm_config')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success);
      const cancelBtn = new ButtonBuilder()
        .setCustomId('cancel_config')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

      const rows = [
        new ActionRowBuilder().addComponents(channelMenu),
        new ActionRowBuilder().addComponents(eventMenu),
        new ActionRowBuilder().addComponents(confirmBtn, cancelBtn)
      ];

      const msg = await interaction.reply({
        content: 'Configure your logging settings below:',
        components: rows,
        fetchReply: true
      });

      const filter = i => i.user.id === interaction.user.id;
      const collector = msg.createMessageComponentCollector({ filter, time: 120_000 });

      collector.on('collect', async i => {
        if (i.customId === 'select_channel') {
          selectedChannelId = i.values[0] ?? null;
          return i.update({ components: rows });
        }

        if (i.customId === 'select_events') {
          selectedEvents = [...i.values];
          return i.update({ components: rows });
        }

        if (i.customId === 'cancel_config') {
          collector.stop('cancelled');
          await msg.delete().catch(() => {});
          return interaction.followUp({
            content: 'Configuration cancelled.',
            ephemeral: true
          });
        }

        if (i.customId === 'confirm_config') {
          collector.stop('confirmed');

          
          setChannelId(gid, selectedChannelId);

          
          const current    = getEnabledEvents(gid);
          const toDisable  = EVENT_KEYS.filter(k => !selectedEvents.includes(k));
          const toEnable   = selectedEvents.filter(k => !current.includes(k));
          if (toDisable.length) removeEvents(gid, toDisable);
          if (toEnable.length)  addEvents(gid, toEnable);

          await msg.delete().catch(() => {});
          return interaction.followUp({
            content: '✅ Logging settings updated.',
            ephemeral: true
          });
        }
      });

      collector.on('end', async (_collected, reason) => {
        if (reason === 'time') {
          await msg.delete().catch(() => {});
          await interaction.followUp({
            content: 'Timed out, no changes made.',
            ephemeral: true
          });
        }
      });

      return;
    }
  }
};
