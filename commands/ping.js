const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and host ping'),

    async execute(interaction) {
        try {
            const botPing = interaction.client.ws.ping;

            
            await interaction.deferReply({ ephemeral: true });

            
            exec('ping -n 1 discord.com', async (error, stdout) => {
                let hostPing = 'Unavailable';
                if (!error && stdout) {
                    const match = stdout.match(/Average = (\d+)ms/i);
                    if (match) hostPing = `${match[1]}ms`;
                }

                const embed = new EmbedBuilder()
                    .setTitle('Pong!')
                    .addFields(
                        { name: 'Bot Latency', value: `${botPing}ms`, inline: true },
                        { name: 'Discord API', value: hostPing, inline: true }
                    )
                    .setColor(0x00BFFF)
                    .setFooter({ text: 'Latency check complete' })
                    .setTimestamp();

                
                await interaction.channel.send({ embeds: [embed] });

                
                await interaction.deleteReply();
            });
        } catch (err) {
            console.error('[Ping Error]', err);
            await interaction.editReply({ content: '❌ Something went wrong while checking ping.' });
        }
    }
};
