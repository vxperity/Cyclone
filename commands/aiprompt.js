// commands/aiprompt.js

const { SlashCommandBuilder } = require('discord.js');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aiprompt')
    .setDescription('Ask ChatGPT anything.')
    .addStringOption(opt =>
      opt.setName('prompt')
         .setDescription('Your question or prompt')
         .setRequired(true)
    ),

  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    await interaction.deferReply();

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      });

      const reply = completion.choices[0].message.content;
      await interaction.editReply(reply);
    } catch (err) {
      console.error('OpenAI error:', err);
      await interaction.editReply('❌ Failed to get a response from ChatGPT.');
    }
  }
};
