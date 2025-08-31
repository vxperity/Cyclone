const { SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require('@discordjs/voice');
const fetch = require('node-fetch');
const tts = require('google-tts-api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc')
    .setDescription('Voice channel utilities')
    .addSubcommand(cmd =>
      cmd.setName('join')
         .setDescription('Bot joins your current VC')
    )
    .addSubcommand(cmd =>
      cmd.setName('leave')
         .setDescription('Bot leaves the VC')
    )
    .addSubcommand(cmd =>
      cmd.setName('mute')
         .setDescription('Self-mute the bot in VC and stop audio')
    )
    .addSubcommand(cmd =>
      cmd.setName('unmute')
         .setDescription('Self-unmute the bot in VC')
    )
    .addSubcommand(cmd =>
      cmd.setName('play')
         .setDescription('Play an uploaded audio file in VC')
         .addAttachmentOption(opt =>
           opt.setName('audio')
              .setDescription('Upload an MP3/OGG file')
              .setRequired(true)
         )
    )
    .addSubcommand(cmd =>
      cmd.setName('tts')
         .setDescription('Convert text to speech (male voice)')
         .addStringOption(opt =>
           opt.setName('text')
              .setDescription('The message to speak')
              .setRequired(true)
         )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const me = interaction.guild.members.me;
    let connection = getVoiceConnection(guildId);

    // ── JOIN ─────────────────────────────────────────────────────────────────────

    if (sub === 'join') {
      const channel = interaction.member.voice.channel;
      if (!channel) {
        return interaction.reply({ content: 'Join a VC first!', ephemeral: true });
      }
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
      });
      return interaction.reply({ content: `🔊 Joined ${channel.name}`, ephemeral: true });
    }

    // ── LEAVE ────────────────────────────────────────────────────────────────────

    if (sub === 'leave') {
      if (!connection) {
        return interaction.reply({ content: 'Not in a VC.', ephemeral: true });
      }
      connection.destroy();
      return interaction.reply({ content: '👋 Left the VC', ephemeral: true });
    }

    // ── MUTE / UNMUTE ────────────────────────────────────────────────────────────

    if (sub === 'mute' || sub === 'unmute') {
      if (!connection) {
        return interaction.reply({ content: 'I must be in a VC.', ephemeral: true });
      }
      try {
        await me.voice.setMute(sub === 'mute');

        if (sub === 'mute') {
          
          const subscription = connection.state.subscription;
          if (subscription?.player) subscription.player.stop();
        }

        return interaction.reply({
          content: sub === 'mute' ? '🤐 Muted and stopped audio.' : '🔊 Unmuted',
          ephemeral: true
        });
      } catch {
        return interaction.reply({ content: 'Error changing mute.', ephemeral: true });
      }
    }

    
    const subscription = connection?.state.subscription;
    const existingPlayer = subscription?.player;
    if (existingPlayer && existingPlayer.state.status !== AudioPlayerStatus.Idle) {
      return interaction.reply({
        content: '❌ Audio is already playing. Please wait or stop it first.',
        ephemeral: true
      });
    }

    // ── PLAY AUDIO FILE ─────────────────────────────────────────────────────────

    if (sub === 'play') {
      if (!connection) {
        return interaction.reply({ content: 'Have me join a VC first.', ephemeral: true });
      }

      const attachment = interaction.options.getAttachment('audio');
      if (!attachment.contentType?.startsWith('audio/')) {
        return interaction.reply({ content: 'Not an audio file.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      try {
        const res = await fetch(attachment.url);
        const resource = createAudioResource(res.body);
        const player = createAudioPlayer();
        connection.subscribe(player);
        player.play(resource);

        player.on(AudioPlayerStatus.Idle, () => {
          player.stop();
          interaction.followUp({ content: '✅ Finished playing.', ephemeral: true });
        });

        return interaction.followUp({ content: `▶️ Playing ${attachment.name}`, ephemeral: true });
      } catch {
        return interaction.followUp({ content: '❌ Failed to play.', ephemeral: true });
      }
    }

    // ── TEXT-TO-SPEECH (MALE VOICE) ────────────────────────────────────────────────

    if (sub === 'tts') {
      if (!connection) {
        return interaction.reply({ content: 'Have me join a VC first.', ephemeral: true });
      }

      const text = interaction.options.getString('text');
      await interaction.deferReply({ ephemeral: true });

      try {
        const url = tts.getAudioUrl(text, {
          lang: 'en-US',
          slow: false,
          host: 'https://translate.google.com'
        });

        const res = await fetch(url);
        const resource = createAudioResource(res.body);
        const player = createAudioPlayer();
        connection.subscribe(player);
        player.play(resource);

        player.on(AudioPlayerStatus.Idle, () => {
          player.stop();
          interaction.followUp({ content: '✅ Finished speaking.', ephemeral: true });
        });

        return interaction.followUp({ content: `🔊 Speaking: "${text}"`, ephemeral: true });
      } catch (error) {
        console.error('TTS error:', error);
        return interaction.followUp({ content: '❌ Failed to speak text.', ephemeral: true });
      }
    }
  }
};
