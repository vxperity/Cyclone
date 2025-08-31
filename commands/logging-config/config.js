
const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'logConfig.json');
let cfg;

try {
  cfg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch {
  cfg = { default: { channelId: null, enabledEvents: [] }, guilds: {} };
}

function save() {
  fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2));
}

function getGuildCfg(guildId) {
  if (!cfg.guilds[guildId]) {
    cfg.guilds[guildId] = {
      channelId: cfg.default.channelId,
      enabledEvents: [...cfg.default.enabledEvents]
    };
    save();
  }
  return cfg.guilds[guildId];
}

function getChannelId(guildId) {
  return getGuildCfg(guildId).channelId;
}

function setChannelId(guildId, channelId) {
  getGuildCfg(guildId).channelId = channelId;
  save();
}

function getEnabledEvents(guildId) {
  return getGuildCfg(guildId).enabledEvents;
}

function addEvents(guildId, events) {
  const list = getEnabledEvents(guildId);
  for (const e of events) {
    if (!list.includes(e)) list.push(e);
  }
  save();
}

function removeEvents(guildId, events) {
  const list = getEnabledEvents(guildId).filter(e => !events.includes(e));
  getGuildCfg(guildId).enabledEvents = list;
  save();
}

function isEnabled(guildId, key) {
  return getEnabledEvents(guildId).includes(key);
}

module.exports = {
  getChannelId,
  setChannelId,
  getEnabledEvents,
  addEvents,
  removeEvents,
  isEnabled
};
