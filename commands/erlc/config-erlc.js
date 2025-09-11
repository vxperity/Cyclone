const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    RoleSelectMenuBuilder,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    WebhookClient
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const configPath = path.join(__dirname, 'erlcConfig.json');

const defaultConfig = {
    guilds: {}
};

const defaultGuildConfig = {
    apiKey: null,
    ssuRoles: [],
    boostRoles: [],
    commandPermissions: [],
    embedsConfig: {
        ssu: {
            enabled: true,
            title: 'Server Startup Required',
            description: '🚨 **{server-name}** needs more players!\n\n📊 **Current Players:** {current-players}/{max-players}',
            color: 0xFF0000,
            image: null,
            thumbnail: null,
            footer: 'Powered by ERLC Plugin',
            webhook: null,
            fields: [
                {
                    name: '🎮 Server Information',
                    value: '**Name:** {server-name}\n**Join Key:** `{join-key}`\n**Players:** {current-players}/{max-players}',
                    inline: true
                },
                {
                    name: '⚙️ Settings',
                    value: '**Team Balance:** {team-balance}\n**Verification:** {verification}',
                    inline: true
                }
            ],
            buttons: [
                {
                    label: "Join Server",
                    style: "Link", 
                    action: "link", 
                    value: "{join-key}" 
                }
            ]
        },
        boost: {
            enabled: true,
            title: 'Server Boost Needed',
            description: '⚡ Help boost **{server-name}**!\n\n📊 **Current Players:** {current-players}/{max-players}',
            color: 0xFFFF00,
            autoTrigger: false,
            autoTriggerThreshold: 5,
            image: null,
            thumbnail: null,
            footer: 'Powered by ERLC Plugin',
            webhook: null,
            fields: [
                {
                    name: '🎮 Server Information',
                    value: '**Name:** {server-name}\n**Join Key:** `{join-key}`\n**Players:** {current-players}/{max-players}',
                    inline: true
                },
                {
                    name: '📈 Boost Benefits',
                    value: '• Increased visibility\n• Better player retention\n• Community growth',
                    inline: true
                }
            ],
            buttons: [
                {
                    label: "Boost Now",
                    style: "Primary",
                    action: "none",
                    value: ""
                }
            ]
        },
        status: {
            enabled: true,
            title: '📊 {server-name} - Server Status',
            description: 'Current status of the server',
            color: 0x36FFDD,
            image: null,
            thumbnail: null,
            footer: 'ERLC Server Status',
            webhook: null,
            fields: [
                {
                    name: '🎮 Server Information',
                    value: '**Name:** {server-name}\n**Join Key:** `{join-key}`\n**Owner ID:** {owner-id}',
                    inline: true
                },
                {
                    name: '👥 Players',
                    value: '**Current:** {current-players}\n**Maximum:** {max-players}\n**Utilization:** {utilization}%',
                    inline: true
                },
                {
                    name: '⚙️ Settings',
                    value: '**Team Balance:** {team-balance}\n**Verification:** {verification}',
                    inline: true
                }
            ],
            buttons: [
                {
                    label: "Refresh Status",
                    style: "Secondary",
                    action: "none",
                    value: ""
                }
            ]
        }
    },
    commands: {
        ssu: true,
        boost: true,
        command: true,
        status: true
    }
};



async function loadConfig() {
    try {
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return defaultConfig;
    }
}

async function saveConfig(config) {
    try {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving ERLC config:', error);
    }
}

async function getGuildConfig(guildId) {
    const config = await loadConfig();
    if (!config.guilds[guildId]) {
        config.guilds[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
        await saveConfig(config);
    }
    return config.guilds[guildId];
}

async function saveGuildConfig(guildId, guildConfig) {
    const config = await loadConfig();
    config.guilds[guildId] = guildConfig;
    await saveConfig(config);
}


async function getServerStatus(apiKey) {
    try {
        const response = await fetch('https://api.policeroleplay.community/v1/server', {
            headers: {
                'server-key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching server status:', error);
        return null;
    }
}

async function getServerPlayers(apiKey) {
    try {
        const response = await fetch('https://api.policeroleplay.community/v1/server/players', {
            headers: {
                'server-key': apiKey
            }
        });

        if (!response.ok) {
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching server players:', error);
        return [];
    }
}

async function executeServerCommand(apiKey, command) {
    try {
        const response = await fetch('https://api.policeroleplay.community/v1/server/command', {
            method: 'POST',
            headers: {
                'server-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        });

        return {
            success: response.status === 200 || response.status === 204,
            status: response.status,
            error: (response.status !== 200 && response.status !== 204) ? `HTTP ${response.status}` : null
        };
    } catch (error) {
        console.error('Error executing server command:', error);
        return {
            success: false,
            error: error.message
        };
    }
}


function replaceVariables(text, serverData, playersData = []) {
    
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    let result = text
        .replace(/{server-name}/g, serverData?.Name || 'Unknown Server')
        .replace(/{current-players}/g, (serverData?.CurrentPlayers || 0).toString())
        .replace(/{max-players}/g, (serverData?.MaxPlayers || 0).toString())
        .replace(/{join-key}/g, serverData?.JoinKey || 'N/A')
        .replace(/{owner-id}/g, serverData?.OwnerId || 'N/A')
        .replace(/{team-balance}/g, serverData?.TeamBalance ? '✅ Enabled' : '❌ Disabled')
        .replace(/{verification}/g, serverData?.AccVerifiedReq || 'N/A')
        .replace(/{utilization}/g, Math.round(((serverData?.CurrentPlayers || 0) / (serverData?.MaxPlayers || 1)) * 100).toString() || '0');


    if (serverData?.CoOwnerIds && serverData.CoOwnerIds.length > 0) {
        result = result.replace(/{co-owners}/g, serverData.CoOwnerIds.join(', '));
    } else {
        result = result.replace(/{co-owners}/g, 'None');
    }


    if (playersData && playersData.length > 0) {
        const playerList = playersData
            .slice(0, 10)
            .map(player => {
                const [name] = player.Player?.split(':') || ['Unknown'];
                const permission = player.Permission?.replace('Server ', '') || 'Unknown';
                const team = player.Team ? ` (${player.Team})` : '';
                const callsign = player.Callsign ? ` [${player.Callsign}]` : '';
                
                return `**${name}** - ${permission}${team}${callsign}`;
            })
            .join('\n');

        result = result.replace(/{player-list}/g, playerList || 'No players online')
                      .replace(/{player-count}/g, playersData.length.toString());
    } else {
        result = result.replace(/{player-list}/g, 'No players online')
                      .replace(/{player-count}/g, '0');
    }

    return result;
}

function hasPermission(member, allowedRoles) {
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    
    return member.roles.cache.some(role => allowedRoles.includes(role.id));
}


async function checkAutoBoost(client) {
    try {
        const config = await loadConfig();
        
        for (const [guildId, guildConfig] of Object.entries(config.guilds || {})) {
            const guild = client.guilds.cache.get(guildId);
            if (!guild || !guildConfig.apiKey) continue;
            
            const boostConfig = guildConfig.embedsConfig?.boost;
            if (!boostConfig?.autoTrigger || !boostConfig?.enabled) continue;
            
            const serverData = await getServerStatus(guildConfig.apiKey);
            if (!serverData) continue;
            
            if (serverData.CurrentPlayers >= boostConfig.autoTriggerThreshold) continue;
            
            // Use webhook if configured
            if (boostConfig.webhook) {
                try {
                    const webhookClient = new WebhookClient({ url: boostConfig.webhook });
                    const embed = createEmbedFromConfig(boostConfig, serverData);
                    
                    let pingMessage = '';
                    if (guildConfig.boostRoles && guildConfig.boostRoles.length > 0) {
                        const rolePings = guildConfig.boostRoles
                            .map(roleId => `<@&${roleId}>`)
                            .join(' ');
                        pingMessage = rolePings;
                    }

                    const content = pingMessage || '@everyone';

                    await webhookClient.send({
                        content: content,
                        embeds: [embed]
                        
                    });
                    
                    console.log(`Auto boost triggered via webhook for guild ${guildId}`);
                    continue;
                } catch (error) {
                    console.error('Error sending auto boost via webhook:', error);
                    
                }
            }
            
            const channel = guild.channels.cache.find(ch => 
                ch.isTextBased() && 
                ch.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
            );
            
            if (!channel) continue;
            
            const embed = createEmbedFromConfig(boostConfig, serverData);
            embed.addFields(
                {
                    name: '⚡ Auto Triggered',
                    value: `Player count fell below ${boostConfig.autoTriggerThreshold}`,
                    inline: true
                }
            );

            let pingMessage = '';
            if (guildConfig.boostRoles && guildConfig.boostRoles.length > 0) {
                const rolePings = guildConfig.boostRoles
                    .map(roleId => `<@&${roleId}>`)
                    .join(' ');
                pingMessage = rolePings;
            }

            const content = pingMessage || '@everyone';

            await channel.send({
                content: content,
                embeds: [embed]
            });
            
            console.log(`Auto boost triggered for guild ${guildId}`);
        }
    } catch (error) {
        console.error('Error in auto boost check:', error);
    }
}


function createEmbedFromConfig(embedConfig, serverData, playersData = []) {
    const embed = new EmbedBuilder()
        .setTitle(replaceVariables(embedConfig.title, serverData, playersData) || 'Server Status')
        .setDescription(replaceVariables(embedConfig.description, serverData, playersData) || 'No description provided.')
        .setColor(embedConfig.color || 0x36FFDD)
        .setTimestamp();

    if (embedConfig.footer) {
    const footerText = replaceVariables(embedConfig.footer, serverData, playersData);
    if (footerText && footerText.trim().length > 0) {
        embed.setFooter({ text: footerText });
    }
}
    if (embedConfig.image) embed.setImage(embedConfig.image);
    if (embedConfig.thumbnail) embed.setThumbnail(embedConfig.thumbnail);

    if (embedConfig.fields && embedConfig.fields.length > 0) {
        embedConfig.fields.forEach(field => {
            embed.addFields({
                name: replaceVariables(field.name, serverData, playersData),
                value: replaceVariables(field.value, serverData, playersData),
                inline: field.inline || false
            });
        });
    }

   
    let actionRows = [];
    if (embedConfig.buttons && embedConfig.buttons.length > 0) {
        const builtButtons = embedConfig.buttons.map(btn => {
            const label = replaceVariables(btn.label || "Button", serverData, playersData);
            const safeLabel = label.replace(/\s+/g, "_").toLowerCase();

            let style = ButtonStyle.Secondary;
            switch ((btn.style || "").toLowerCase()) {
                case "primary": style = ButtonStyle.Primary; break;
                case "success": style = ButtonStyle.Success; break;
                case "danger": style = ButtonStyle.Danger; break;
                case "link": style = ButtonStyle.Link; break;
            }

            if (btn.action === "link" && btn.value) {
                return new ButtonBuilder()
                    .setLabel(label)
                    .setStyle(ButtonStyle.Link)
                    .setURL(replaceVariables(btn.value, serverData, playersData));
            }

            return new ButtonBuilder()
                .setCustomId(`btn_${safeLabel}_${Date.now()}`)
                .setLabel(label)
                .setStyle(style);
        });

        
        for (let i = 0; i < builtButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(builtButtons.slice(i, i + 5)));
        }
    }

    return { embed, actionRows };
}


async function sendEmbed(interaction, embedConfig, serverData, playersData, pingRoles, commandType) {
    
    const { embed, actionRows } = createEmbedFromConfig(embedConfig, serverData, playersData);

    let pingMessage = '';
    if (pingRoles && pingRoles.length > 0) {
        const rolePings = pingRoles
            .map(roleId => `<@&${roleId}>`)
            .join(' ');
        pingMessage = rolePings;
    }

    const content = pingMessage || '@everyone';

    const payload = {
        content: content,
        embeds: [embed],
        components: actionRows || []
    };

    
    if (embedConfig.webhook) {
        try {
            const webhookClient = new WebhookClient({ url: embedConfig.webhook });
            await webhookClient.send(payload);
            return { success: true, method: 'webhook' };
        } catch (error) {
            console.error('Error sending via webhook:', error);
        
        }
    }

    
    const message = await interaction.editReply(payload);

    return { success: true, method: 'channel', message };
}


const commands = [
    
    {
        data: new SlashCommandBuilder()
            .setName('erlc-config')
            .setDescription('Configure ERLC Plugin settings')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

        async execute(interaction) {
            const embed = new EmbedBuilder()
                .setTitle('Configure ERLC Plugin')
                .setDescription('Below there are dropdown that allow you to configurate\nmany things. Go to our documents for more info about \nthis plugin.\n\nERLC API: ✅ \nEmbeds: ✅ \nCommands: ✅')
                .setColor(0x36FFDD);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('erlc_config_main')
                .setPlaceholder('Select configuration option')
                .addOptions([
                    {
                        label: 'ERLC API',
                        description: 'Configure API key and server settings',
                        value: 'api',
                        emoji: '🔑'
                    },
                    {
                        label: 'Embeds',
                        description: 'Configure SSU, Boost, and Status embed messages',
                        value: 'embeds',
                        emoji: '💬'
                    },
                    {
                        label: 'Commands',
                        description: 'Enable/disable commands and permissions',
                        value: 'commands',
                        emoji: '⚙️'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({ 
                embeds: [embed], 
                components: [row], 
                ephemeral: true 
            });
        }
    },

    
    {
        data: new SlashCommandBuilder()
            .setName('ssu')
            .setDescription('Launch Server Startup (SSU) notification'),

        async execute(interaction) {
            const config = await getGuildConfig(interaction.guildId);

            if (!config.apiKey) {
                return await interaction.reply({
                    content: '❌ ERLC plugin is not configured. Please use `/erlc-config` first.',
                    ephemeral: true
                });
            }

            if (!config.commands.ssu) {
                return await interaction.reply({
                    content: '❌ SSU command is disabled.',
                    ephemeral: true
                });
            }

            if (!hasPermission(interaction.member, config.commandPermissions)) {
                return await interaction.reply({
                    content: '❌ You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const serverData = await getServerStatus(config.apiKey);
            
            if (!serverData) {
                return await interaction.editReply({
                    content: '❌ Failed to fetch server status. Please check your API key configuration.'
                });
            }

            const embedConfig = config.embedsConfig.ssu;
            
            
            const result = await sendEmbed(interaction, embedConfig, serverData, [], config.ssuRoles, 'ssu');
            
            if (!result.success) {
                return await interaction.editReply({
                    content: '❌ Failed to send SSU notification.'
                });
            }

            if (result.method === 'channel') {
                const updateInterval = setInterval(async () => {
                    try {
                        const updatedServerData = await getServerStatus(config.apiKey);
                        if (!updatedServerData) return;

                        const updatedEmbed = createEmbedFromConfig(embedConfig, updatedServerData);
                        
                        await result.message.edit({
                            content: result.message.content,
                            embeds: [updatedEmbed]
                        });
                    } catch (error) {
                        console.error('Error updating SSU embed:', error);
                        clearInterval(updateInterval);
                    }
                }, 15000); 

                
                setTimeout(() => {
                    clearInterval(updateInterval);
                }, 600000); 
            }
        }
    },

   
    {
        data: new SlashCommandBuilder()
            .setName('boost')
            .setDescription('Launch Server Boost notification'),

        async execute(interaction) {
            const config = await getGuildConfig(interaction.guildId);

            if (!config.apiKey) {
                return await interaction.reply({
                    content: '❌ ERLC plugin is not configured. Please use `/erlc-config` first.',
                    ephemeral: true
                });
            }

            if (!config.commands.boost) {
                return await interaction.reply({
                    content: '❌ Boost command is disabled.',
                    ephemeral: true
                });
            }

            if (!hasPermission(interaction.member, config.commandPermissions)) {
                return await interaction.reply({
                    content: '❌ You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const serverData = await getServerStatus(config.apiKey);
            
            if (!serverData) {
                return await interaction.editReply({
                    content: '❌ Failed to fetch server status. Please check your API key configuration.'
                });
            }

            const embedConfig = config.embedsConfig.boost;
            
            
            const result = await sendEmbed(interaction, embedConfig, serverData, [], config.boostRoles, 'boost');
            
            if (!result.success) {
                return await interaction.editReply({
                    content: '❌ Failed to send Boost notification.'
                });
            }

            
            if (result.method === 'channel') {
                const updateInterval = setInterval(async () => {
                    try {
                        const updatedServerData = await getServerStatus(config.apiKey);
                        if (!updatedServerData) return;

                        const updatedEmbed = createEmbedFromConfig(embedConfig, updatedServerData);
                        
                        await result.message.edit({
                            content: result.message.content,
                            embeds: [updatedEmbed]
                        });
                    } catch (error) {
                        console.error('Error updating Boost embed:', error);
                        clearInterval(updateInterval);
                    }
                }, 15000); 

                
                setTimeout(() => {
                    clearInterval(updateInterval);
                }, 600000); 
            }
        }
    },

    
    {
        data: new SlashCommandBuilder()
            .setName('command')
            .setDescription('Execute ERLC server commands')
            .addStringOption(option =>
                option.setName('cmd')
                    .setDescription('The command to execute (e.g., :h Hello everyone!)')
                    .setRequired(true)
                    .setMaxLength(100)
            ),

        async execute(interaction) {
            const config = await getGuildConfig(interaction.guildId);

            if (!config.apiKey) {
                return await interaction.reply({
                    content: '❌ ERLC plugin is not configured. Please use `/erlc-config` first.',
                    ephemeral: true
                });
            }

            if (!config.commands.command) {
                return await interaction.reply({
                    content: '❌ Server command execution is disabled.',
                    ephemeral: true
                });
            }

            if (!hasPermission(interaction.member, config.commandPermissions)) {
                return await interaction.reply({
                    content: '❌ You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            const command = interaction.options.getString('cmd');

            if (!command.startsWith(':')) {
                return await interaction.reply({
                    content: '❌ Server commands must start with `:` (e.g., `:h Hello everyone!`)',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const result = await executeServerCommand(config.apiKey, command);

            const embed = new EmbedBuilder()
                .setTitle('🖥️ Server Command Execution')
                .setTimestamp()
                .setFooter({ text: `Executed by ${interaction.user.tag}` });

            if (result.success) {
                embed
                    .setColor(0x00FF00)
                    .setDescription(`✅ Command executed successfully!`)
                    .addFields({
                        name: 'Command',
                        value: `\`${command}\``,
                        inline: false
                    });
            } else {
                embed
                    .setColor(0xFF0000)
                    .setDescription(`❌ Command execution failed`)
                    .addFields(
                        {
                            name: 'Command',
                            value: `\`${command}\``,
                            inline: false
                        },
                        {
                            name: 'Error',
                            value: result.error || 'Unknown error',
                            inline: false
                        }
                    );

                if (result.status === 401) {
                    embed.addFields({
                        name: 'Possible Solution',
                        value: 'Check your API key configuration with `/erlc-config`',
                        inline: false
                    });
                } else if (result.status === 400) {
                    embed.addFields({
                        name: 'Possible Solution',
                        value: 'Check your command syntax. Commands should start with `:` followed by the command.',
                        inline: false
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });
        }
    },

    
    {
        data: new SlashCommandBuilder()
            .setName('erlc-status')
            .setDescription('Get current ERLC server status and player information'),

        async execute(interaction) {
            const config = await getGuildConfig(interaction.guildId);

            if (!config.apiKey) {
                return await interaction.reply({
                    content: '❌ ERLC plugin is not configured. Please use `/erlc-config` first.',
                    ephemeral: true
                });
            }

            if (!config.commands.status) {
                return await interaction.reply({
                    content: '❌ Status command is disabled.',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const [serverData, playersData] = await Promise.all([
                getServerStatus(config.apiKey),
                getServerPlayers(config.apiKey)
            ]);
            
            if (!serverData) {
                return await interaction.editReply({
                    content: '❌ Failed to fetch server status. Please check your API key configuration.'
                });
            }

            const embedConfig = config.embedsConfig.status;
            
            
            const result = await sendEmbed(interaction, embedConfig, serverData, playersData, [], 'status');
            
            if (!result.success) {
                return await interaction.editReply({
                    content: '❌ Failed to send status information.'
                });
            }
        }
    }
];


function handleInteractions(client) {
    client.on('interactionCreate', async (interaction) => {
        try {
            
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'erlc_config_main') {
                    const config = await getGuildConfig(interaction.guildId);
                    
                    switch (interaction.values[0]) {
                        case 'api':
                            await handleAPIConfig(interaction, config);
                            break;
                        case 'embeds':
                            await handleEmbedsConfig(interaction, config);
                            break;
                        case 'commands':
                            await handleCommandsConfig(interaction, config);
                            break;
                    }
                } else if (interaction.customId === 'erlc_embed_config') {
                    await handleEmbedTypeConfig(interaction, interaction.values[0]);
                } else if (interaction.customId === 'erlc_command_toggle') {
                    await handleCommandToggle(interaction, interaction.values);
                }
            }
            
            
            else if (interaction.isRoleSelectMenu()) {
                const config = await getGuildConfig(interaction.guildId);
                
                if (interaction.customId === 'erlc_ssu_roles') {
                    config.ssuRoles = interaction.values;
                    await saveGuildConfig(interaction.guildId, config);
                    await interaction.reply({ 
                        content: `✅ SSU notification roles updated! Selected ${interaction.values.length} role(s).`, 
                        ephemeral: true 
                    });
                } else if (interaction.customId === 'erlc_boost_roles') {
                    config.boostRoles = interaction.values;
                    await saveGuildConfig(interaction.guildId, config);
                    await interaction.reply({ 
                        content: `✅ Boost notification roles updated! Selected ${interaction.values.length} role(s).`, 
                        ephemeral: true 
                    });
                } else if (interaction.customId === 'erlc_command_permissions') {
                    config.commandPermissions = interaction.values;
                    await saveGuildConfig(interaction.guildId, config);
                    await interaction.reply({ 
                        content: `✅ Command permissions updated! Selected ${interaction.values.length} role(s).`, 
                        ephemeral: true 
                    });
                }
            }
            
            
            else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'erlc_api_config') {
                    await handleAPIModalSubmit(interaction);
                } else if (interaction.customId.startsWith('erlc_embed_')) {
                    await handleEmbedModalSubmit(interaction);
                } else if (interaction.customId.startsWith('erlc_json_')) {
                    await handleJsonModalSubmit(interaction);
                } else if (interaction.customId.startsWith('erlc_webhook_')) {
                    await handleWebhookModalSubmit(interaction);
                }
            }
            
            
            else if (interaction.isButton()) {
                if (interaction.customId.startsWith('erlc_json_')) {
                    const embedType = interaction.customId.replace('erlc_json_', '');
                    await handleJsonEditor(interaction, embedType);
                } else if (interaction.customId.startsWith('erlc_preview_')) {
                    const embedType = interaction.customId.replace('erlc_preview_', '');
                    await handleEmbedPreview(interaction, embedType);
                } else if (interaction.customId.startsWith('erlc_form_')) {
                    const embedType = interaction.customId.replace('erlc_form_', '');
                    await handleFormEditor(interaction, embedType);
                } else if (interaction.customId.startsWith('erlc_webhook_')) {
                    const embedType = interaction.customId.replace('erlc_webhook_', '');
                    await handleWebhookConfig(interaction, embedType);
                }
            }
        } catch (error) {
            console.error('Error handling ERLC interaction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true });
            }
        }
    });
}


async function handleAPIConfig(interaction, config) {
    const modal = new ModalBuilder()
        .setCustomId('erlc_api_config')
        .setTitle('ERLC API Configuration');

    const apiKeyInput = new TextInputBuilder()
        .setCustomId('api_key')
        .setLabel('ERLC API Key')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your ERLC API key')
        .setValue(config.apiKey || '')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(apiKeyInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

async function handleAPIModalSubmit(interaction) {
    const config = await getGuildConfig(interaction.guildId);
    const apiKey = interaction.fields.getTextInputValue('api_key');
    
    try {
        const response = await fetch('https://api.policeroleplay.community/v1/server', {
            headers: {
                'server-key': apiKey
            }
        });

        if (response.ok) {
            config.apiKey = apiKey;
            await saveGuildConfig(interaction.guildId, config);

            const embed = new EmbedBuilder()
                .setTitle('✅ API Configuration')
                .setDescription('API key has been successfully configured and validated!')
                .setColor(0x00FF00);

            const roleSelectMenu = new RoleSelectMenuBuilder()
                .setCustomId('erlc_ssu_roles')
                .setPlaceholder('Select SSU notification roles')
                .setMinValues(0)
                .setMaxValues(10);

            const row1 = new ActionRowBuilder().addComponents(roleSelectMenu);

            const boostRoleSelectMenu = new RoleSelectMenuBuilder()
                .setCustomId('erlc_boost_roles')
                .setPlaceholder('Select Boost notification roles')
                .setMinValues(0)
                .setMaxValues(10);

            const row2 = new ActionRowBuilder().addComponents(boostRoleSelectMenu);

            await interaction.reply({ 
                embeds: [embed], 
                components: [row1, row2], 
                ephemeral: true 
            });
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ API Configuration Error')
            .setDescription('Invalid API key provided. Please check your key and try again.')
            .setColor(0xFF0000);

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleEmbedsConfig(interaction, config) {
    const embed = new EmbedBuilder()
        .setTitle('🎨 Embed Configuration')
        .setDescription('Configure your SSU, Boost, and Status embed messages with custom variables!')
        .addFields(
            {
                name: '📋 Available Variables',
                value: '`{server-name}` - Server name\n`{current-players}` - Current player count\n`{max-players}` - Maximum players\n`{join-key}` - Server join key\n`{owner-id}` - Server owner ID\n`{team-balance}` - Team balance status\n`{verification}` - Verification status\n`{utilization}` - Server utilization percentage\n`{player-count}` - Number of online players\n`{player-list}` - List of online players\n`{co-owners}` - List of co-owners',
                inline: false
            }
        )
        .setColor(0x36FFDD);

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('erlc_embed_config')
        .setPlaceholder('Select embed to configure')
        .addOptions([
            {
                label: 'SSU Embed',
                description: 'Configure Server Startup embed',
                value: 'ssu',
                emoji: '🚨'
            },
            {
                label: 'Boost Embed',
                description: 'Configure Server Boost embed',
                value: 'boost',
                emoji: '⚡'
            },
            {
                label: 'Status Embed',
                description: 'Configure Status embed',
                value: 'status',
                emoji: '📊'
            }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({ embeds: [embed], components: [row] });
}

async function handleEmbedTypeConfig(interaction, embedType) {
    const config = await getGuildConfig(interaction.guildId);
    const embedConfig = config.embedsConfig[embedType];

    const embed = new EmbedBuilder()
        .setTitle(`${embedType.toUpperCase()} Embed Configuration`)
        .setDescription('Configure your embed using the options below.')
        .setColor(0x36FFDD)
        .addFields(
            {
                name: '📋 Available Variables',
                value: '`{server-name}` - Server name\n`{current-players}` - Current player count\n`{max-players}` - Maximum players\n`{join-key}` - Server join key\n`{owner-id}` - Server owner ID\n`{team-balance}` - Team balance status\n`{verification}` - Verification status\n`{utilization}` - Server utilization percentage\n`{player-count}` - Number of online players\n`{player-list}` - List of online players\n`{co-owners}` - List of co-owners',
                inline: false
            }
        );

    const formButton = new ButtonBuilder()
        .setCustomId(`erlc_form_${embedType}`)
        .setLabel('Form Editor')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝');

    const jsonButton = new ButtonBuilder()
        .setCustomId(`erlc_json_${embedType}`)
        .setLabel('JSON Editor')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔧');

    const previewButton = new ButtonBuilder()
        .setCustomId(`erlc_preview_${embedType}`)
        .setLabel('Preview Embed')
        .setStyle(ButtonStyle.Success)
        .setEmoji('👁️');

    const webhookButton = new ButtonBuilder()
        .setCustomId(`erlc_webhook_${embedType}`)
        .setLabel('Webhook Settings')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔗');

    const row = new ActionRowBuilder().addComponents(formButton, jsonButton, previewButton, webhookButton);

    await interaction.update({ embeds: [embed], components: [row] });
}

async function handleFormEditor(interaction, embedType) {
    const config = await getGuildConfig(interaction.guildId);
    const embedConfig = config.embedsConfig[embedType];

    const modal = new ModalBuilder()
        .setCustomId(`erlc_embed_${embedType}`)
        .setTitle(`${embedType.toUpperCase()} Form Editor`);

    const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Embed Title')
        .setStyle(TextInputStyle.Short)
        .setValue(embedConfig.title || '')
        .setRequired(true);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Embed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(embedConfig.description || '')
        .setRequired(true);

    // Fix: Convert hex color properly and handle null values
    let colorValue = '36FFDD'; // default
    if (embedConfig.color !== null && embedConfig.color !== undefined) {
        colorValue = embedConfig.color.toString(16).padStart(6, '0');
    }

    const colorInput = new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Embed Color (hex code without #)')
        .setStyle(TextInputStyle.Short)
        .setValue(colorValue)
        .setRequired(false);

    const footerInput = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setValue(embedConfig.footer || '')
        .setRequired(false);

    const imageInput = new TextInputBuilder()
        .setCustomId('image')
        .setLabel('Image URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setValue(embedConfig.image || '')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(footerInput),
        new ActionRowBuilder().addComponents(imageInput)
    );

    await interaction.showModal(modal);
}

async function handleJsonEditor(interaction, embedType) {
    const config = await getGuildConfig(interaction.guildId);
    const embedConfig = config.embedsConfig[embedType];

    const modal = new ModalBuilder()
        .setCustomId(`erlc_json_${embedType}`)
        .setTitle(`${embedType.toUpperCase()} JSON Editor`);

    const jsonInput = new TextInputBuilder()
        .setCustomId('json_data')
        .setLabel('Embed JSON Configuration')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(JSON.stringify(embedConfig, null, 2) || '{}')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(jsonInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

async function handleJsonModalSubmit(interaction) {
    const embedType = interaction.customId.replace('erlc_json_', '');
    const config = await getGuildConfig(interaction.guildId);

    try {
        const jsonData = interaction.fields.getTextInputValue('json_data');
        const parsedConfig = JSON.parse(jsonData);
        
        // Validate the JSON structure
        if (typeof parsedConfig !== 'object') {
            throw new Error('Invalid JSON structure');
        }

        config.embedsConfig[embedType] = { ...config.embedsConfig[embedType], ...parsedConfig };
        await saveGuildConfig(interaction.guildId, config);

        const embed = new EmbedBuilder()
            .setTitle('✅ JSON Configuration Updated')
            .setDescription(`${embedType.toUpperCase()} embed has been successfully configured via JSON!`)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ JSON Error')
            .setDescription('Invalid JSON provided. Please check your syntax and try again.')
            .setColor(0xFF0000);

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleEmbedModalSubmit(interaction) {
    const embedType = interaction.customId.replace('erlc_embed_', '');
    const config = await getGuildConfig(interaction.guildId);

    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const colorHex = interaction.fields.getTextInputValue('color') || '36FFDD';
    const footerText = interaction.fields.getTextInputValue('footer') || '';
    const imageUrl = interaction.fields.getTextInputValue('image') || null;

    // Fix: Ensure valid hex color parsing
    let colorValue = 0x36FFDD; // default
    try {
        const cleanHex = colorHex.replace('#', '');
        colorValue = parseInt(cleanHex, 16);
        if (isNaN(colorValue)) {
            colorValue = 0x36FFDD;
        }
    } catch (e) {
        colorValue = 0x36FFDD;
    }

    config.embedsConfig[embedType].title = title;
    config.embedsConfig[embedType].description = description;
    config.embedsConfig[embedType].color = colorValue;
    config.embedsConfig[embedType].footer = footerText;
    config.embedsConfig[embedType].image = imageUrl;

    await saveGuildConfig(interaction.guildId, config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Embed Configuration Updated')
        .setDescription(`${embedType.toUpperCase()} embed has been successfully configured!`)
        .addFields({
            name: '🎨 Preview',
            value: `**Title:** ${title}\n**Color:** #${colorHex.toUpperCase()}\n**Footer:** ${footerText || 'None'}\n**Image:** ${imageUrl ? 'Set' : 'None'}`,
            inline: false
        })
        .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleEmbedPreview(interaction, embedType) {
    const config = await getGuildConfig(interaction.guildId);
    const embedConfig = config.embedsConfig[embedType];

    if (!config.apiKey) {
        return await interaction.reply({
            content: '❌ API key is not configured. Please configure it first to preview the embed.',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const [serverData, playersData] = await Promise.all([
        getServerStatus(config.apiKey),
        getServerPlayers(config.apiKey)
    ]);

    if (!serverData) {
        return await interaction.editReply({
            content: '❌ Failed to fetch server status. Please check your API key configuration.'
        });
    }

    const embed = createEmbedFromConfig(embedConfig, serverData, playersData);
    
    await interaction.editReply({
        content: `**Preview of ${embedType.toUpperCase()} Embed:**`,
        embeds: [embed]
    });
}

async function handleWebhookConfig(interaction, embedType) {
    const config = await getGuildConfig(interaction.guildId);
    const embedConfig = config.embedsConfig[embedType];

    const modal = new ModalBuilder()
        .setCustomId(`erlc_webhook_${embedType}`)
        .setTitle(`${embedType.toUpperCase()} Webhook Configuration`);

    const webhookInput = new TextInputBuilder()
        .setCustomId('webhook_url')
        .setLabel('Webhook URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://discord.com/api/webhooks/...')
        .setValue(embedConfig.webhook || '')
        .setRequired(false);

    const firstActionRow = new ActionRowBuilder().addComponents(webhookInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

async function handleWebhookModalSubmit(interaction) {
    const embedType = interaction.customId.replace('erlc_webhook_', '');
    const config = await getGuildConfig(interaction.guildId);

    const webhookUrl = interaction.fields.getTextInputValue('webhook_url') || null;

    config.embedsConfig[embedType].webhook = webhookUrl;
    await saveGuildConfig(interaction.guildId, config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Webhook Configuration Updated')
        .setDescription(`${embedType.toUpperCase()} webhook has been ${webhookUrl ? 'configured' : 'removed'}!`)
        .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCommandsConfig(interaction, config) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Commands Configuration')
        .setDescription('Enable/disable ERLC commands and set permissions')
        .addFields(
            {
                name: '📝 Available Commands',
                value: '`/ssu` - Launch SSU embed with pings\n`/boost` - Launch boost embed with pings\n`/command` - Execute ERLC server commands\n`/erlc-status` - Get server status information',
                inline: false
            },
            {
                name: '🔧 Current Status',
                value: `SSU Command: ${config.commands.ssu ? '✅ Enabled' : '❌ Disabled'}\nBoost Command: ${config.commands.boost ? '✅ Enabled' : '❌ Disabled'}\nServer Command: ${config.commands.command ? '✅ Enabled' : '❌ Disabled'}\nStatus Command: ${config.commands.status ? '✅ Enabled' : '❌ Disabled'}`,
                inline: false
            }
        )
        .setColor(0x36FFDD);

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('erlc_command_toggle')
        .setPlaceholder('Select commands to enable/disable')
        .setMinValues(0)
        .setMaxValues(4)
        .addOptions([
            {
                label: 'SSU Command',
                description: 'Toggle /ssu command',
                value: 'ssu',
                emoji: '🚨'
            },
            {
                label: 'Boost Command',
                description: 'Toggle /boost command',
                value: 'boost',
                emoji: '⚡'
            },
            {
                label: 'Server Command',
                description: 'Toggle /command command',
                value: 'command',
                emoji: '🖥️'
            },
            {
                label: 'Status Command',
                description: 'Toggle /erlc-status command',
                value: 'status',
                emoji: '📊'
            }
        ]);

    const roleSelectMenu = new RoleSelectMenuBuilder()
        .setCustomId('erlc_command_permissions')
        .setPlaceholder('Select roles that can use ERLC commands')
        .setMinValues(0)
        .setMaxValues(10);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(roleSelectMenu);

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function handleCommandToggle(interaction, selectedCommands) {
    const config = await getGuildConfig(interaction.guildId);
    
    
    config.commands.ssu = false;
    config.commands.boost = false;
    config.commands.command = false;
    config.commands.status = false;
    
    
    selectedCommands.forEach(cmd => {
        config.commands[cmd] = true;
    });

    await saveGuildConfig(interaction.guildId, config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Commands Updated')
        .setDescription(`Command status has been updated!`)
        .addFields({
            name: '🔧 New Status',
            value: `SSU Command: ${config.commands.ssu ? '✅ Enabled' : '❌ Disabled'}\nBoost Command: ${config.commands.boost ? '✅ Enabled' : '❌ Disabled'}\nServer Command: ${config.commands.command ? '✅ Enabled' : '❌ Disabled'}\nStatus Command: ${config.commands.status ? '✅ Enabled' : '❌ Disabled'}`,
            inline: false
        })
        .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}


function initializeERLC(client) {
    
    handleInteractions(client);
    
    r
    setInterval(() => {
        checkAutoBoost(client);
    }, 5 * 60 * 1000); 
    
    console.log('✅ ERLC system initialized');
}


module.exports = [
    ...commands,
    initializeERLC
];
