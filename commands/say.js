const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say a message anonymously')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What should the bot say?')
                .setRequired(true)
        ),

    async execute(interaction) {
        const text = interaction.options.getString('message');

        try {
            
            await interaction.deferReply({ ephemeral: true });

            
            await interaction.channel.send(text);

            
            await interaction.deleteReply();
        } catch (err) {
            console.error('[Say Command Error]', err);
            await interaction.editReply({
                content: '❌ Failed to say the message. Try again later.',
                ephemeral: true
            });
        }
    }
};
