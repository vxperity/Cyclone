require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

// Stability API client
const stability = axios.create({
  baseURL: 'https://api.stability.ai',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${process.env.STABILITY_API_KEY}`
  }
});

// Fetch available engines and pick the first picture-type one
async function getDefaultEngine() {
  const res = await stability.get('/v1/engines/list');
  const engines = res.data;
  const pictureEngine = engines.find(e => e.type === 'PICTURE');
  if (!pictureEngine) throw new Error('No picture engines available');
  return pictureEngine.id;
}

/**
 * Generate one image via Stability AI and return base64 PNG.
 * If engine is SDXL, always use 1024×1024.
 */
async function generateImage(prompt) {
  const engine = await getDefaultEngine();

  // Always pick 1024×1024 for SDXL
  let width = 512;
  let height = 512;
  if (engine.includes('xl')) {
    width = 1024;
    height = 1024;
  }

  const response = await stability.post(`/v1/generation/${engine}/text-to-image`, {
    steps: 30,
    cfg_scale: 7,
    width,
    height,
    samples: 1,
    text_prompts: [{ text: prompt, weight: 1 }]
  });

  const artifact = response.data?.artifacts?.[0];
  if (!artifact?.base64) {
    throw new Error('No image data returned from Stability AI');
  }
  return artifact.base64;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Generate an AI image')
    .addStringOption(opt =>
      opt
        .setName('prompt')
        .setDescription('Describe the image you want')
        .setRequired(true)
    ),

  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');

    await interaction.deferReply();

    try {
      const base64 = await generateImage(prompt);

      const buffer = Buffer.from(base64, 'base64');
      const attachment = new AttachmentBuilder(buffer, { name: 'image.png' });

      const embed = new EmbedBuilder()
        .setTitle('🖼️ AI Image')
        .setDescription(`Prompt: ${prompt}`)
        .setImage('attachment://image.png')
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [attachment]
      });
    } catch (err) {
      console.error('Stability AI Error:', err?.response?.data || err);
      await interaction.editReply('❌ Failed to generate an image. Please try again later.');
    }
  }
};
