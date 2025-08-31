const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField,
    ChannelType,
} = require('discord.js');
const { loadWelcomeConfig, saveWelcomeConfig } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure welcome messages and member roles.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    async execute(interaction) {
        
        const welcomeConfig = loadWelcomeConfig();

        try {
            
            const modal = new ModalBuilder()
                .setCustomId('welcomeSetupStep1')
                .setTitle('Setup Welcome Message');

            const welcomeMessageInput = new TextInputBuilder()
                .setCustomId('welcomeMessage')
                .setLabel('Welcome Message')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder(
                    'Example: Welcome {user-mention} to {server-name}! We are now {member-count} members.'
                )
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(welcomeMessageInput)
            );
            await interaction.showModal(modal);

            const modalSubmitInteraction = await interaction.awaitModalSubmit({
                time: 60000,
                filter: (i) =>
                    i.customId === 'welcomeSetupStep1' &&
                    i.user.id === interaction.user.id,
            });

            const welcomeMessage = modalSubmitInteraction.fields.getTextInputValue(
                'welcomeMessage'
            );
            const guildId = interaction.guild.id;

            if (!welcomeConfig[guildId]) welcomeConfig[guildId] = {};
            welcomeConfig[guildId].message = welcomeMessage;
            saveWelcomeConfig(welcomeConfig);

            
            const channels = modalSubmitInteraction.guild.channels.cache
                .filter((ch) => ch.type === ChannelType.GuildText)
                .map((ch) => ({ label: ch.name, value: ch.id }));

            if (channels.length === 0) {
                return modalSubmitInteraction.reply({
                    content: 'No text channels available to select.',
                    ephemeral: true,
                });
            }

            const channelSelect = new StringSelectMenuBuilder()
                .setCustomId('welcomeChannelSelect')
                .setPlaceholder(
                    'Select a channel to send welcome messages.'
                )
                .addOptions(channels);

            const embed = new EmbedBuilder()
                .setTitle('Step 2: Select a Welcome Channel!')
                .setDescription(
                    'Choose the channel where new members are greeted upon joining your server.'
                )
                .setColor(0x2e8b57);

            if (
                !modalSubmitInteraction.replied &&
                !modalSubmitInteraction.deferred
            ) {
                await modalSubmitInteraction.reply({
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder().addComponents(channelSelect),
                    ],
                    ephemeral: true,
                });
            }

            const selectMenuInteraction =
                await modalSubmitInteraction.channel.awaitMessageComponent({
                    filter: (i) =>
                        i.customId === 'welcomeChannelSelect' &&
                        i.user.id === interaction.user.id,
                    time: 60000,
                });

            const channelId = selectMenuInteraction.values[0];
            welcomeConfig[guildId].channelId = channelId;
            saveWelcomeConfig(welcomeConfig);

            
            const roles = selectMenuInteraction.guild.roles.cache
                .filter(
                    (role) =>
                        !role.managed && role.id !== selectMenuInteraction.guild.id
                )
                .map((role) => ({ label: role.name, value: role.id }));

            if (roles.length === 0) {
                return selectMenuInteraction.reply({
                    content: 'No assignable roles found.',
                    ephemeral: true,
                });
            }

            const roleSelect = new StringSelectMenuBuilder()
                .setCustomId('welcomeRoleSelect')
                .setPlaceholder('Select a role to assign to new members.')
                .addOptions(roles);

            const embedRole = new EmbedBuilder()
                .setTitle('Step 3: Select a Role for New Members!')
                .setDescription(
                    'Choose a role to automatically assign to new members when they join.'
                )
                .setColor(0x2e8b57);

            await selectMenuInteraction.update({
                embeds: [embedRole],
                components: [
                    new ActionRowBuilder().addComponents(roleSelect),
                ],
                ephemeral: true,
            });

            const roleSelectMenuInteraction =
                await selectMenuInteraction.channel.awaitMessageComponent({
                    filter: (i) =>
                        i.customId === 'welcomeRoleSelect' &&
                        i.user.id === interaction.user.id,
                    time: 60000,
                });

            const roleId = roleSelectMenuInteraction.values[0];
            welcomeConfig[guildId].roleId = roleId;
            saveWelcomeConfig(welcomeConfig);

            
            const embedButton = new EmbedBuilder()
                .setTitle('Optional Step: Add Buttons')
                .setDescription(
                    'You can add a linked button, member count button label, and more.'
                );

            await roleSelectMenuInteraction.update({
                embeds: [embedButton],
                components: [],
            });

            await roleSelectMenuInteraction.followUp({
                content: 'Click below to configure optional buttons.',
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('openOptionalButtonsModal')
                            .setLabel('Configure Optional Buttons')
                            .setStyle(ButtonStyle.Primary)
                    ),
                ],
                ephemeral: true,
            });

            const buttonInteraction =
                await roleSelectMenuInteraction.channel.awaitMessageComponent({
                    filter: (i) =>
                        i.customId === 'openOptionalButtonsModal' &&
                        i.user.id === interaction.user.id,
                    time: 60000,
                });

            const optionalModal = new ModalBuilder()
                .setCustomId('optionalButtons')
                .setTitle('Optional Buttons Configuration')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('linkButton')
                            .setLabel('Link Button URL (Optional)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('https://example.com')
                            .setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('buttonLabel')
                            .setLabel('Link Button Label (Optional)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('memberCountLabel')
                            .setLabel(
                                'Member Count Button Label (Optional)'
                            )
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder(
                                'Example: We now have {member-count} members!'
                            )
                            .setRequired(false)
                    )
                );

            await buttonInteraction.showModal(optionalModal);

            const buttonModalSubmit =
                await buttonInteraction.awaitModalSubmit({
                    time: 60000,
                    filter: (i) =>
                        i.customId === 'optionalButtons' &&
                        i.user.id === interaction.user.id,
                });

            const linkUrl = buttonModalSubmit.fields.getTextInputValue(
                'linkButton'
            );
            const buttonLabel =
                buttonModalSubmit.fields.getTextInputValue('buttonLabel');
            const memberCountLabel =
                buttonModalSubmit.fields.getTextInputValue(
                    'memberCountLabel'
                );

            if (linkUrl) welcomeConfig[guildId].linkUrl = linkUrl;
            if (buttonLabel)
                welcomeConfig[guildId].buttonLabel = buttonLabel;
            if (memberCountLabel)
                welcomeConfig[guildId].memberCountLabel =
                    memberCountLabel;
            saveWelcomeConfig(welcomeConfig);

            await buttonModalSubmit.reply({
                content:
                    '🎉 Configuration complete! Your welcome system is now fully set up.',
                ephemeral: true,
            });
        } catch (error) {
            console.error('[Config Setup Error]', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content:
                            '🚨 Something went wrong during setup. Please try again!',
                        ephemeral: true,
                    });
                }
            } catch (err) {
                console.error('[Reply Error]', err);
            }
        }
    },
};
