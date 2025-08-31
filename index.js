require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events
} = require('discord.js');
const { Player }            = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands       = new Collection();
client.prefixCommands = new Collection();

client.player = new Player(client, {
  leaveOnEmpty: true,
  leaveOnStop:  false,
  leaveOnFinish:false,
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25
  }
});

const commandsPath = path.join(__dirname, 'commands');

function loadModules(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      loadModules(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

    const modExports = require(fullPath);
    const modules = Array.isArray(modExports) ? modExports : [modExports];

    for (const mod of modules) {
      
      if (mod.data && mod.execute) {
        client.commands.set(mod.data.name, mod);
        console.log(`Loaded command: ${mod.data.name}`);
        continue;
      }
      
      if (mod.prefix && mod.execute) {
        client.prefixCommands.set(mod.prefix, mod);
        console.log(`Loaded prefix command: ${mod.prefix}`);
        continue;
      }
      
      if (typeof mod === 'function') {
        mod(client);
        console.log(`Loaded event handler: ${entry.name}`);
      }
    }
  }
}

loadModules(commandsPath);

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  client.player.extractors.loadMulti(DefaultExtractors);

  const slashData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
  await client.application.commands.set(slashData);
  console.log(`🔨 Registered ${slashData.length} slash commands`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`❌ Error in ${interaction.commandName}:`, err);
    const replyFn = interaction.deferred || interaction.replied ? 'followUp' : 'reply';
    await interaction[replyFn]({
      content: '❌ There was an error running that command.',
      ephemeral: true
    });
  }
});

client.player.events
  .on('playerStart', (queue, track) =>
    queue.metadata?.channel?.send(`▶️ Now playing **${track.title}** — \`${track.duration}\``)
  )
  .on('playerAdd', (queue, track) =>
    queue.metadata?.channel?.send(`➕ Added to queue: **${track.title}** — \`${track.duration}\``)
  )
  .on('empty', queue =>
    queue.metadata?.channel?.send('🏁 Voice channel is empty, leaving…')
  )
  .on('finish', queue =>
    queue.metadata?.channel?.send('🏁 Queue finished.')
  )
  .on('error', (queue, error) => {
    console.error('Player error:', error);
    queue.metadata?.channel?.send(`❌ Player error: ${error.message}`);
  });


client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const prefix = process.env.PREFIX;
  if (!message.content.startsWith(prefix)) return;

  const [cmdName, ...args] = message.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);

  const command = client.prefixCommands.get(cmdName.toLowerCase());
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(`Error in prefix command ${cmdName}:`, err);
    message.reply('❌ There was an error executing that command.');
  }
});

process.on('unhandledRejection', console.error);
client.on('error', console.error);

client.login(process.env.TOKEN);
