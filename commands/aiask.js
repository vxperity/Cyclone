const { SlashCommandBuilder } = require('discord.js');
const { OpenAI } = require('openai');

// initialize the OpenAI client using your API key from .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aiask')
    .setDescription('Ask ChatGPT a question and get a concise answer')
    .addStringOption(opt =>
      opt
        .setName('question')
        .setDescription('Your question for the AI')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const question = interaction.options.getString('question');

    // acknowledge receipt and give yourself time
    await interaction.deferReply();

    try {
      // v4 style: use the chat completion API path
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You’re a helpful assistant that gives concise answers.'
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      // extract the assistant’s reply
      const answer = completion.choices[0].message.content.trim();
      await interaction.editReply(answer);

    } catch (err) {
      console.error('OpenAI error:', err);
      await interaction.editReply('❌ Sorry, I couldn’t process that right now.');
    }
  }
};
