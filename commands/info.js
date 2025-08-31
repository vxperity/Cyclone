const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Displays information about the server and bot.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setDescription(`**# Information**
This will contain all of the necessary things to be on this server
and will show how to use all of the bot features through videos,
text, embed, etc. We offer creative services that are thoughtfully
made by our developers! Right below are all of the links and info
that you'll need for your bot and our server!`)
            .setColor(0x309279)
            .addFields(
                {
                    name: 'Community Tutorials',
                    value: '[**Welcome Message**](https://youtu.be/dr_neNVZgWU)', 
                    inline: true
                },
                {
                    name: 'Variables',
                    value: '`{server}`\n`{mention}`\n`{member}`',
                    inline: true
                }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};

