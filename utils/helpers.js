const fs = require('fs');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const WELCOME_CONFIG_FILE = './welcomeConfig.json';


function loadWelcomeConfig() {
  if (!fs.existsSync(WELCOME_CONFIG_FILE)) {
    fs.writeFileSync(WELCOME_CONFIG_FILE, JSON.stringify({}, null, 4), 'utf8');
  }

  try {
    return JSON.parse(fs.readFileSync(WELCOME_CONFIG_FILE, 'utf8') || '{}');
  } catch (err) {
    console.error('Error parsing welcomeConfig.json:', err);
    return {};
  }
}


function saveWelcomeConfig(config) {
  fs.writeFileSync(WELCOME_CONFIG_FILE, JSON.stringify(config, null, 4), 'utf8');
}


function buildActionRows(guild, config) {
  const rows = [];

  if (config.linkUrl) {
    const label = config.buttonLabel?.trim() || 'Click Here';
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(label)
          .setStyle(ButtonStyle.Link)
          .setURL(config.linkUrl)
      )
    );
  }

  if (config.memberCountLabel) {
    const label = config.memberCountLabel.replace('{member}', guild.memberCount);
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('disabled_member_count')
          .setLabel(label)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      )
    );
  }

  return rows;
}


async function fetchTextChannel(guild, channelId) {
  let channel;
  try {
    channel = await guild.channels.fetch(channelId);
  } catch {
    console.error(`Could not fetch channel ID ${channelId}`);
    return null;
  }

  if (!channel?.isTextBased()) {
    console.error(`Channel ${channelId} is not text-based.`);
    return null;
  }

  return channel;
}

/**
 * 
 *
 * @param {import('discord.js').GuildMember} member
 * @param {Record<string, any>} welcomeConfig
 */
async function sendWelcomeMessage(member, welcomeConfig) {
  const cfg = welcomeConfig[member.guild.id];
  if (!cfg?.message || !cfg.channelId) return;

  const channel = await fetchTextChannel(member.guild, cfg.channelId);
  if (!channel) return;

  const text = cfg.message
    .replace('{server}', member.guild.name)
    .replace('{member}', member.guild.memberCount)
    .replace('{mention}', `<@${member.id}>`);

  const rows = buildActionRows(member.guild, cfg);

  try {
    await channel.send({ content: text, components: rows });
  } catch (err) {
    console.error('Failed to send welcome message:', err);
  }

  if (cfg.roleId) {
    const role = member.guild.roles.cache.get(cfg.roleId);
    if (role) {
      member.roles.add(role).catch(err => console.error('Failed to add role:', err));
    }
  }
}

/**
 * 
 *
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {Record<string, any>} welcomeConfig
 */
async function sendTestWelcomeMessage(interaction, welcomeConfig) {
  const cfg = welcomeConfig[interaction.guild.id];
  if (!cfg?.message || !cfg.channelId) {
    return interaction.reply({
      content: 'Welcome message not configured. Use `/config` to set it up.',
      ephemeral: true
    });
  }

  const channel = await fetchTextChannel(interaction.guild, cfg.channelId);
  if (!channel) {
    return interaction.reply({
      content: 'Invalid welcome channel ID. Please reconfigure using `/config`.',
      ephemeral: true
    });
  }

  const text = cfg.message
    .replace('{server}', interaction.guild.name)
    .replace('{member}', interaction.guild.memberCount)
    .replace('{mention}', `<@${interaction.user.id}>`);

  const rows = buildActionRows(interaction.guild, cfg);

  try {
    await channel.send({ content: text, components: rows });
    await interaction.reply({ content: '✅ Test welcome message sent!', ephemeral: true });
  } catch (err) {
    console.error('Failed to send test welcome message:', err);
    await interaction.reply({
      content: '❌ Could not send the test message. Check my permissions and try again.',
      ephemeral: true
    });
  }
}

module.exports = {
  loadWelcomeConfig,
  saveWelcomeConfig,
  sendWelcomeMessage,
  sendTestWelcomeMessage
};
