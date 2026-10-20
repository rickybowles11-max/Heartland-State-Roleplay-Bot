require("dotenv").config();

const path = require("node:path");

const fs = require("node:fs");

const staffDB = require("./database");

const BOT_OWNER_ID = "1058171136183124018";

const {

    Client,

    GatewayIntentBits,

    Events,

    EmbedBuilder,

    AttachmentBuilder,

    ActionRowBuilder,

    ButtonBuilder,

    ButtonStyle,

    StringSelectMenuBuilder,

    ModalBuilder,

    TextInputBuilder,

    TextInputStyle,

    PermissionsBitField,

    ChannelType

} = require("discord.js");

const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers

    ]

});

const activeSessions = new Map();

const BRAND = {

    name: "Heartland State Roleplay",

    owner: "Rickybele",

    color: Number.parseInt(process.env.SESSION_ACCENT_COLOR || "1F8A8A", 16),

    footer: "HEARTLAND STATE ROLEPLAY"

};

const BANNER_PATH = path.join(__dirname, "heartland-banner.png");

const SHUTDOWN_BANNER_PATH = path.join(__dirname, "heartland-shutdown-banner.png");

const ROBLOX_GAME_URL =

    "https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County";

const AUTHORIZED_STAFF_ROLES = [

    "1561189573449482288",

    "1561189573483167810",

    "1561189573495881871",

    "1561189573495881874"

];

const INFRACTION_ACTIONS = [

    "Warning",

    "Strike",

    "Infraction",

    "Demotion",

    "Termination"

];

const STAFF_APPS_CHANNEL_ID =

    process.env.STAFF_APPS_CHANNEL_ID || "1561436056744763472";

const RESOURCES_ROLE_ID =

    process.env.RESOURCES_ROLE_ID || "1561436307568201798";

const STAFF_APPLICATION_URL =

    process.env.STAFF_APPLICATION_URL ||

    "https://melonly.com/forms/7517649214474555392";

const STAFF_APPS_STATE_PATH = path.join(

    __dirname,

    "staff-apps-state.json"

);

const TICKET_SUPPORT_IMAGE_PATH = path.join(__dirname, "ticket-support.png");

const TICKET_THANKYOU_IMAGE_PATH = path.join(__dirname, "ticket-thankyou.png");

const TICKET_CLOSED_IMAGE_PATH = path.join(__dirname, "ticket-closed.png");

const TICKET_CATEGORY_NAME = "HSRP SUPPORT TICKETS";

 

// ─────────────────────────────────────────────

// INFORMATION CENTER

// Place these three PNG files next to index.js.

// ─────────────────────────────────────────────

const INFO_MAIN_IMAGE = path.join(__dirname, "information-center.png");

const INFO_DEPARTMENTS_IMAGE = path.join(__dirname, "information-departments.png");

const INFO_RULES_IMAGE = path.join(__dirname, "information-rules.png");

const INFO_RULES_URL =

    "https://docs.google.com/document/d/1DASYOCKdTVwWEjk2ctAQbduRUJHqHqDsjXAgYoTvTy8/edit?usp=sharing";

 

function informationMenuRow() {

    return new ActionRowBuilder().addComponents(

        new StringSelectMenuBuilder()

            .setCustomId("hsrp_information_select")

            .setPlaceholder("Choose an information category...")

            .addOptions(

                {

                    label: "Departments",

                    description: "View the HSRP departments",

                    value: "departments",

                    emoji: "🏢"

                },

                {

                    label: "Rules and Regulations",

                    description: "View the rules and full document",

                    value: "rules",

                    emoji: "📜"

                }

            )

    );

}

// ─────────────────────────────────────────────

// GENERAL HELPERS

// ─────────────────────────────────────────────

function makeEmbed(guild, title, description) {

    return new EmbedBuilder()

        .setColor(BRAND.color)

        .setTitle(title)

        .setDescription(description)

        .setFooter({ text: BRAND.footer })

        .setTimestamp();

}

function privateReply(interaction, payload) {

    const data = typeof payload === "string"

        ? { content: payload }

        : payload;

    if (interaction.deferred || interaction.replied) {

        return interaction.editReply(data);

    }

    return interaction.reply({

        ...data,

        ephemeral: true

    });

}

function isAuthorizedStaff(interaction) {

    return AUTHORIZED_STAFF_ROLES.some(id =>

        interaction.member?.roles?.cache?.has(id)

    );

}

function hasSessionStaffRole(member) {

    const roleId = process.env.STAFF_ROLE_ID;

    return Boolean(

        roleId && member?.roles?.cache?.has(roleId)

    );

}

function hasResourcesRole(interaction) {

    return Boolean(

        interaction.member?.roles?.cache?.has(RESOURCES_ROLE_ID)

    );

}

function getSessionChannel(guild) {

    const id = process.env.SESSION_CHANNEL_ID;

    if (!id) return null;

    const channel = guild.channels.cache.get(id);

    return channel?.isTextBased() && channel.send

        ? channel

        : null;

}

async function getStaffActionsChannel(guild, action) {

    const isPromotion =

        String(action || "").toLowerCase() === "promotion";

    const id = isPromotion

        ? process.env.PROMOTIONS_CHANNEL_ID

        : process.env.STAFF_ACTIONS_CHANNEL_ID;

    if (!id) return null;

    try {

        const channel = await guild.channels.fetch(id);

        return channel?.isTextBased() && channel.send

            ? channel

            : null;

    } catch (error) {

        console.error("Could not fetch staff announcement channel:", error);

        return null;

    }

}

function getNotificationRole(guild) {

    const id = process.env.SESSION_NOTIFICATION_ROLE_ID;

    return id ? guild.roles.cache.get(id) || null : null;

}

function durationText(milliseconds) {

    const seconds = Math.max(0, Math.floor(milliseconds / 1000));

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    const remainingSeconds = seconds % 60;

    return `${hours}h ${minutes}m ${remainingSeconds}s`;

}

function formatCaseId(id) {

    return `HSRP-${String(id).padStart(4, "0")}`;

}

function parseCaseId(input) {

    const match = String(input).trim().match(/^(?:HSRP-)?(\d+)$/i);

    if (!match) return null;

    const id = Number(match[1]);

    return Number.isSafeInteger(id) && id > 0 ? id : null;

}

// ─────────────────────────────────────────────

// VERIFICATION AND SESSION BUTTONS

// ─────────────────────────────────────────────

function verificationRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()

            .setCustomId("heartland_verify")

            .setLabel("Verify Me")

            .setEmoji("✅")

            .setStyle(ButtonStyle.Success)

    );

}

function notificationRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()

            .setCustomId("session_notification_toggle")

            .setLabel("Session Notifications")

            .setEmoji("🔔")

            .setStyle(ButtonStyle.Secondary)

    );

}

function quickJoinRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()

            .setLabel("Quick Join")

            .setEmoji("🎮")

            .setStyle(ButtonStyle.Link)

            .setURL(ROBLOX_GAME_URL)

    );

}

// ─────────────────────────────────────────────

// TICKET SYSTEM HELPERS

function ticketPanelRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()

            .setCustomId("hsrp_ticket_open_general")

            .setLabel("General Support")

            .setEmoji("🎫")

            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()

            .setCustomId("hsrp_ticket_open_highcommand")

            .setLabel("High Command")

            .setEmoji("👑")

            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()

            .setCustomId("hsrp_ticket_open_ia")

            .setLabel("Internal Affairs")

            .setEmoji("⚖️")

            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()

            .setCustomId("hsrp_ticket_open_directorship")

            .setLabel("Directorship")

            .setEmoji("🏛️")

            .setStyle(ButtonStyle.Secondary)

    );

}

function ticketCloseRow() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()

            .setCustomId("hsrp_ticket_close")

            .setLabel("Close Ticket")

            .setEmoji("🔒")

            .setStyle(ButtonStyle.Danger)

    );

}

function getTicketStaffRoleIds(guild) {

    const ids = new Set(AUTHORIZED_STAFF_ROLES);

    if (process.env.STAFF_ROLE_ID) ids.add(process.env.STAFF_ROLE_ID);

    return [...ids].filter(id => guild.roles.cache.has(id));

}

async function getOrCreateTicketCategory(guild) {

    let category = guild.channels.cache.find(

        channel => channel.type === ChannelType.GuildCategory && channel.name === TICKET_CATEGORY_NAME

    );

    if (category) return category;

    const staffRoleIds = getTicketStaffRoleIds(guild);

    const permissionOverwrites = [

        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },

        ...staffRoleIds.map(id => ({

            id,

            allow: [

                PermissionsBitField.Flags.ViewChannel,

                PermissionsBitField.Flags.SendMessages,

                PermissionsBitField.Flags.ReadMessageHistory,

                PermissionsBitField.Flags.AttachFiles

            ]

        }))

    ];

    category = await guild.channels.create({

        name: TICKET_CATEGORY_NAME,

        type: ChannelType.GuildCategory,

        permissionOverwrites,

        reason: "Set up the HSRP support ticket system"

    });

    return category;

}

// STAFF APPLICATIONS PANEL

// ─────────────────────────────────────────────

function loadStaffAppsState() {

    try {

        return JSON.parse(

            fs.readFileSync(STAFF_APPS_STATE_PATH, "utf8")

        );

    } catch {

        return {};

    }

}

function saveStaffAppsState(state) {

    fs.writeFileSync(

        STAFF_APPS_STATE_PATH,

        JSON.stringify(state, null, 2)

    );

}

function makeStaffAppsEmbed(isOpen) {

    const embed = new EmbedBuilder()

        .setColor(0x1F8A8A)

        .setAuthor({

            name: "HEARTLAND STATE ROLEPLAY",

            ...(client.user

                ? { iconURL: client.user.displayAvatarURL() }

                : {})

        })

        .setTitle("STAFF APPLICATIONS")

        .setDescription(

            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +

            (

                isOpen

                    ? "🟢 **STAFF APPLICATIONS ARE OPEN**"

                    : "🔴 **STAFF APPLICATIONS ARE CLOSED**"

            ) +

            "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +

            (

                isOpen

                    ? "Heartland State Roleplay is looking for qualified, dedicated individuals to join our staff team. We want people who are willing to help our community grow while maintaining a professional and welcoming environment.\n\n" +

                      "If you believe you have what it takes, review the requirements below before submitting your application."

                    : "Staff recruitment is currently closed. Please keep an eye on announcements for updates about the next application period."

            )

        )

        .addFields(

            {

                name: "📋 APPLICATION REQUIREMENTS",

                value:

                    "**01. Age:** You must be at least **14 years old**.\n" +

                    "**02. Professionalism:** You must communicate respectfully and professionally.\n" +

                    "**03. Activity:** You must be consistently active within the community.\n" +

                    "**04. Maturity:** You must demonstrate sound judgment and handle situations appropriately.\n" +

                    "**05. Rules:** You must understand and follow all server rules and staff policies.\n" +

                    "**06. Teamwork:** You must be willing to assist members and cooperate with other staff."

            },

            {

                name: "⭐ WHAT WE EXPECT FROM OUR STAFF",

                value:

                    "Staff members are expected to be dependable, fair, approachable, and respectful. You should set a positive example, communicate clearly, handle reports responsibly, and remain unbiased when dealing with community members."

            },

            {

                name: "📝 BEFORE SUBMITTING",

                value:

                    "• Answer every question honestly and thoroughly.\n" +

                    "• Use clear, professional responses.\n" +

                    "• Make sure you can dedicate time to the community.\n" +

                    "• Do not apply if you cannot meet the requirements.\n" +

                    "• Submitting an application does not guarantee acceptance."

            }

        )

        .setFooter({

            text: "HSRP • STAFF RECRUITMENT"

        })

        .setTimestamp();

    return embed;

}

function staffAppsComponents(isOpen) {

    if (!isOpen) return [];

    return [

        new ActionRowBuilder().addComponents(

            new ButtonBuilder()

                .setLabel("Apply for Staff")

                .setEmoji("📝")

                .setStyle(ButtonStyle.Link)

                .setURL(STAFF_APPLICATION_URL)

        )

    ];

}

async function updateStaffAppsPanel(guild, isOpen) {

    if (

        isOpen &&

        (

            !STAFF_APPLICATION_URL ||

            !/^https:\/\/\S+$/i.test(STAFF_APPLICATION_URL)

        )

    ) {

        throw new Error(

            "STAFF_APPLICATION_URL must be a valid HTTPS link."

        );

    }

    const channel = await guild.channels.fetch(STAFF_APPS_CHANNEL_ID);

    if (!channel?.isTextBased() || !channel.messages) {

        throw new Error(

            "The staff applications channel could not be found or is not a text channel."

        );

    }

    const state = loadStaffAppsState();

    let message = null;

    const savedPanel = state[guild.id];

    if (savedPanel?.messageId) {

        try {

            const savedChannel = await guild.channels.fetch(

                savedPanel.channelId || STAFF_APPS_CHANNEL_ID

            );

            if (savedChannel?.isTextBased() && savedChannel.messages) {

                message = await savedChannel.messages.fetch(

                    savedPanel.messageId

                );

            }

        } catch {

            message = null;

        }

    }

    const payload = {

        embeds: [makeStaffAppsEmbed(isOpen)],

        components: staffAppsComponents(isOpen)

    };

    if (message && message.channelId === channel.id) {

        await message.edit(payload);

    } else {

        message = await channel.send(payload);

    }

    state[guild.id] = {

        channelId: channel.id,

        messageId: message.id,

        isOpen

    };

    saveStaffAppsState(state);

    return channel;

}

// ─────────────────────────────────────────────

// STAFF CASE EMBEDS

// ─────────────────────────────────────────────

function makeStaffActionEmbed({

    caseId,

    action,

    targetId,

    moderatorId,

    reason,

    rank,

    status = "ACTIVE"

}) {

    const promotion =

        String(action).toLowerCase() === "promotion";

    const termination =

        String(action).toLowerCase() === "termination";

    const voided = status === "VOIDED";

    const embed = new EmbedBuilder()

        .setColor(

            voided ? 0x747F8D :

            promotion ? 0x2ECC71 :

            termination ? 0x992D22 :

            BRAND.color

        )

        .setAuthor({

            name: `${BRAND.name} • Staff Personnel`,

            ...(client.user

                ? { iconURL: client.user.displayAvatarURL() }

                : {})

        })

        .setTitle(

            voided ? "⚪ STAFF CASE VOIDED" :

            promotion ? "⬆️ STAFF PROMOTION" :

            termination ? "🚫 STAFF TERMINATION" :

            `📋 STAFF ${String(action).toUpperCase()}`

        )

        .setDescription(

            voided

                ? "This personnel case has been marked as voided. The original record has been retained."

                : promotion

                    ? "An official staff promotion has been recorded. Congratulations!"

                    : "An official personnel action has been recorded."

        )

        .addFields(

            { name: "Case ID", value: String(caseId), inline: true },

            { name: "Status", value: voided ? "VOIDED" : "ACTIVE", inline: true },

            { name: "Staff Member", value: `<@${targetId}>`, inline: true },

            { name: "Action", value: String(action).slice(0, 1024), inline: true },

            { name: "Issued By", value: `<@${moderatorId}>`, inline: true },

            {

                name: "Reason",

                value: String(reason || "No reason provided").slice(0, 1024)

            }

        )

        .setFooter({

            text: "HSRP Staff Management • Official Personnel Record"

        })

        .setTimestamp();

    if (rank) {

        embed.addFields({

            name: promotion ? "New Rank" : "Recorded Rank",

            value: String(rank).slice(0, 1024),

            inline: true

        });

    }

    return embed;

}

function makeStaffNotice({

    caseId,

    promotion,

    action,

    targetId,

    moderatorId,

    reason,

    rank

}) {

    const embed = makeStaffActionEmbed({

        caseId,

        action: promotion ? "Promotion" : action,

        targetId,

        moderatorId,

        reason,

        rank

    });

    embed.setDescription(

        promotion

            ? "Congratulations! An official update has been made to your staff rank."

            : "An official staff action has been recorded for your account. Please review the details below."

    );

    return embed;

}

async function publishStaffAction(guild, details) {

    const channel = await getStaffActionsChannel(guild, details.action);

    if (!channel) {

        return {

            sent: false,

            message:

                String(details.action).toLowerCase() === "promotion"

                    ? "Promotions channel missing or unavailable. Check PROMOTIONS_CHANNEL_ID."

                    : "Staff actions channel missing or unavailable. Check STAFF_ACTIONS_CHANNEL_ID."

        };

    }

    try {

        await channel.send({

            embeds: [makeStaffActionEmbed(details)],

            allowedMentions: {

                parse: [],

                users: [],

                roles: []

            }

        });

        return {

            sent: true,

            message: `Posted in #${channel.name}`

        };

    } catch (error) {

        console.error("Public staff announcement failed:", error);

        return {

            sent: false,

            message: `Could not post in #${channel.name}. Check bot permissions.`

        };

    }

}

// ─────────────────────────────────────────────

// BOT READY AND JOIN ROLE

// ─────────────────────────────────────────────

client.once(Events.ClientReady, readyClient => {

    console.log(`Heartland bot is online as ${readyClient.user.tag}`);

});

client.on(Events.GuildMemberAdd, async member => {

    try {

        const roleId = process.env.UNVERIFIED_ROLE_ID;

        if (!roleId) {

            console.error("UNVERIFIED_ROLE_ID is missing from .env.");

            return;

        }

        const role = await member.guild.roles.fetch(roleId);

        if (!role) {

            console.error("Unverified role was not found.");

            return;

        }

        await member.roles.add(

            role,

            "Automatically assigned upon joining"

        );

        console.log(`Assigned Unverified to ${member.user.tag}`);

    } catch (error) {

        console.error("Failed to assign Unverified role:", error);

    }

});

// ─────────────────────────────────────────────

// INTERACTIONS

// ─────────────────────────────────────────────

client.on(Events.InteractionCreate, async interaction => {

    try {

        if (interaction.isChatInputCommand()) {

            const command = interaction.commandName;

            // OPEN / CLOSE STAFF APPLICATIONS

            if (

                command === "open-staff-apps" ||

                command === "close-staff-apps"

            ) {

                if (!hasResourcesRole(interaction)) {

                    return privateReply(

                        interaction,

                        "🔒 Only members with the Resources role can open or close staff applications."

                    );

                }

                const isOpen = command === "open-staff-apps";

                await interaction.deferReply({ ephemeral: true });

                try {

                    const channel = await updateStaffAppsPanel(

                        interaction.guild,

                        isOpen

                    );

                    return interaction.editReply(

                        isOpen

                            ? `✅ Staff applications are now OPEN. The panel was updated in ${channel}.`

                            : `🔒 Staff applications are now CLOSED. The panel was updated in ${channel}.`

                    );

                } catch (error) {

                    console.error("Staff applications update failed:", error);

                    return interaction.editReply(

                        `❌ Could not update the staff applications panel: ${error.message}`

                    );

                }

            }

            // PING

            if (command === "ping") {

                return privateReply(interaction, {

                    embeds: [

                        makeEmbed(

                            interaction.guild,

                            "🟢 Heartland Online",

                            `**Status:** Operational\n**Latency:** ${client.ws.ping} ms`

                        )

                    ]

                });

            }

            // STAFF MANAGEMENT

            if (

                ["promote", "infraction-issue", "staff-history"].includes(command)

            ) {

                if (!isAuthorizedStaff(interaction)) {

                    return privateReply(

                        interaction,

                        "🔒 You are not authorized to use HSRP staff management."

                    );

                }

                // STAFF HISTORY

                if (command === "staff-history") {

                    const input = interaction.options.getString("case-id", true);

                    const actionType = interaction.options.getString("action", true);

                    const numericId = parseCaseId(input);

                    if (!numericId) {

                        return privateReply(

                            interaction,

                            "Invalid case ID. Use a format like `HSRP-0001`."

                        );

                    }

                    const record = staffDB.getCaseById.get(

                        interaction.guildId,

                        numericId

                    );

                    if (!record) {

                        return privateReply(

                            interaction,

                            `No case matching ${formatCaseId(numericId)} was found in this server.`

                        );

                    }

                    const caseId = formatCaseId(record.id);

                    if (actionType === "void") {

                        const voidReason =

                            interaction.options.getString("void-reason");

                        if (!voidReason || !voidReason.trim()) {

                            return privateReply(

                                interaction,

                                "You must provide a `void-reason` when voiding a case."

                            );

                        }

                        if (record.status === "VOIDED") {

                            return privateReply(

                                interaction,

                                `Case ${caseId} has already been voided.`

                            );

                        }

                        const result = staffDB.voidCase.run(

                            interaction.user.id,

                            voidReason.trim(),

                            interaction.guildId,

                            record.id

                        );

                        if (!result.changes) {

                            return privateReply(

                                interaction,

                                "The case could not be voided. It may already have been updated."

                            );

                        }

                        const voidDetails = {

                            caseId,

                            action: record.action,

                            targetId: record.user_id,

                            moderatorId: record.moderator_id,

                            reason: record.reason,

                            rank: record.new_rank,

                            status: "VOIDED"

                        };

                        const channel = await getStaffActionsChannel(

                            interaction.guild,

                            record.action

                        );

                        if (channel) {

                            const voidEmbed = makeStaffActionEmbed(voidDetails)

                                .addFields(

                                    {

                                        name: "Voided By",

                                        value: `<@${interaction.user.id}>`,

                                        inline: true

                                    },

                                    {

                                        name: "Void Reason",

                                        value: voidReason.trim().slice(0, 1024)

                                    }

                                );

                            await channel.send({

                                embeds: [voidEmbed],

                                allowedMentions: { parse: [] }

                            }).catch(error =>

                                console.error("Void announcement failed:", error)

                            );

                        }

                        try {

                            const affectedUser = await client.users.fetch(

                                record.user_id

                            );

                            await affectedUser.send({

                                embeds: [

                                    makeEmbed(

                                        interaction.guild,

                                        "⚪ STAFF CASE VOIDED",

                                        `Your staff case **${caseId}** has been voided.\n\n` +

                                        `**Original action:** ${record.action}\n` +

                                        `**Void reason:** ${voidReason.trim()}\n` +

                                        `**Voided by:** ${interaction.user.tag}`

                                    )

                                ]

                            });

                        } catch (error) {

                            console.log(

                                "Could not DM member about voided case:",

                                error.message

                            );

                        }

                        return privateReply(interaction, {

                            embeds: [

                                makeEmbed(

                                    interaction.guild,

                                    "✅ Case Voided",

                                    `**Case ID:** ${caseId}\n` +

                                    "**Status:** VOIDED\n" +

                                    `**Void reason:** ${voidReason.trim()}\n\n` +

                                    "The original record remains in the database."

                                )

                            ]

                        });

                    }

                    const status = record.status || "ACTIVE";

                    const embed = makeStaffActionEmbed({

                        caseId,

                        action: record.action,

                        targetId: record.user_id,

                        moderatorId: record.moderator_id,

                        reason: record.reason,

                        rank: record.new_rank,

                        status

                    });

                    embed.addFields(

                        {

                            name: "Created",

                            value: String(record.created_at || "Unknown"),

                            inline: true

                        },

                        {

                            name: "Previous Rank",

                            value: record.previous_rank || "Not recorded",

                            inline: true

                        }

                    );

                    if (status === "VOIDED") {

                        embed.addFields(

                            {

                                name: "Voided By",

                                value: record.voided_by

                                    ? `<@${record.voided_by}>`

                                    : "Unknown",

                                inline: true

                            },

                            {

                                name: "Void Reason",

                                value: String(

                                    record.void_reason || "Not recorded"

                                ).slice(0, 1024)

                            },

                            {

                                name: "Voided At",

                                value: String(record.voided_at || "Unknown")

                            }

                        );

                    }

                    return privateReply(interaction, {

                        embeds: [embed]

                    });

                }

                // PROMOTION / INFRACTION

                const target = interaction.options.getUser("member", true);

                if (target.bot || target.id === interaction.user.id) {

                    return privateReply(

                        interaction,

                        "You cannot use staff actions on a bot or yourself."

                    );

                }

                let action;

                let reason;

                let rank = null;

                const promotion = command === "promote";

                if (promotion) {

                    action = "Promotion";

                    rank = interaction.options.getString("rank", true).trim();

                    reason = interaction.options.getString("reason", true).trim();

                } else {

                    action = interaction.options.getString("action", true);

                    reason = interaction.options.getString("reason", true).trim();

                    if (!INFRACTION_ACTIONS.includes(action)) {

                        return privateReply(

                            interaction,

                            "That staff action is not supported."

                        );

                    }

                    if (action === "Demotion") {

                        rank = interaction.options.getString("new-rank");

                        if (!rank || !rank.trim()) {

                            return privateReply(

                                interaction,

                                "Enter the new rank with the `new-rank` option for a demotion."

                            );

                        }

                        rank = rank.trim();

                    }

                }

                if (!reason) {

                    return privateReply(

                        interaction,

                        "Please provide a reason for this action."

                    );

                }

                const result = staffDB.addStaffRecord.run(

                    interaction.guildId,

                    target.id,

                    action.toLowerCase(),

                    reason,

                    interaction.user.id,

                    null,

                    rank

                );

                const caseId = formatCaseId(

                    Number(result.lastInsertRowid)

                );

                const details = {

                    caseId,

                    action,

                    targetId: target.id,

                    moderatorId: interaction.user.id,

                    reason,

                    rank,

                    status: "ACTIVE"

                };

                const announcement = await publishStaffAction(

                    interaction.guild,

                    details

                );

                let roleStatus = "Not applicable";

                if (!promotion) {

                    const roleId = process.env.INFRACTION_ROLE_ID;

                    const role = roleId

                        ? interaction.guild.roles.cache.get(roleId)

                        : null;

                    if (!role) {

                        roleStatus =

                            "Not assigned — check INFRACTION_ROLE_ID";

                    } else {

                        try {

                            const member =

                                await interaction.guild.members.fetch(target.id);

                            const botMember = interaction.guild.members.me;

                            if (

                                !botMember?.permissions.has(

                                    PermissionsBitField.Flags.ManageRoles

                                ) ||

                                role.managed ||

                                role.position >= botMember.roles.highest.position

                            ) {

                                roleStatus =

                                    "Not assigned — check bot permissions and role hierarchy";

                            } else {

                                await member.roles.add(

                                    role,

                                    `HSRP ${action} ${caseId} issued by ${interaction.user.tag}`

                                );

                                roleStatus = "Assigned successfully";

                            }

                        } catch (error) {

                            console.error(

                                "Failed to assign infraction role:",

                                error

                            );

                            roleStatus =

                                "Assignment failed — check bot permissions";

                        }

                    }

                }

                let dmSent = true;

                try {

                    await target.send({

                        embeds: [

                            makeStaffNotice({

                                ...details,

                                promotion

                            })

                        ]

                    });

                } catch (error) {

                    dmSent = false;

                    console.log(

                        `Could not DM ${target.tag}: ${error.message}`

                    );

                }

                return privateReply(interaction, {

                    embeds: [

                        makeEmbed(

                            interaction.guild,

                            promotion

                                ? "✅ Promotion Recorded"

                                : "✅ Staff Action Recorded",

                            `**Case ID:** ${caseId}\n` +

                            `**Member:** <@${target.id}>\n` +

                            `**Action:** ${action}\n` +

                            (rank ? `**Rank:** ${rank}\n` : "") +

                            `**Reason:** ${reason}\n\n` +

                            "**Database:** Saved successfully\n" +

                            `**Public announcement:** ${

                                announcement.sent

                                    ? announcement.message

                                    : `Not posted — ${announcement.message}`

                            }\n` +

                            (promotion

                                ? ""

                                : `**Infraction role:** ${roleStatus}\n`) +

                            `**DM notification:** ${

                                dmSent

                                    ? "Sent successfully"

                                    : "Could not be delivered; DMs may be disabled."

                            }`

                        )

                    ]

                });

            }

    
            // INFORMATION CENTER SETUP

            if (command === "information-setup") {
                if (interaction.user.id !== BOT_OWNER_ID) {
    return privateReply(
        interaction,
        "❌ Only the bot owner can use this command."
    );
}
                await interaction.deferReply({ ephemeral: true });

                if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
                    return interaction.editReply(
                        "You need Manage Server permission to set up the Information Center."
                    );
                }

                const channel = interaction.options.getChannel("channel", true);

                if (channel.type !== ChannelType.GuildText) {
                    return interaction.editReply(
                        "Please select a regular text channel."
                    );
                }

                const imagePaths = [
                    INFO_MAIN_IMAGE,
                    INFO_DEPARTMENTS_IMAGE,
                    INFO_RULES_IMAGE
                ];

                const missing = imagePaths.find(file => !fs.existsSync(file));

                if (missing) {
                    return interaction.editReply(
                        `Missing image file: ${path.basename(missing)}. Put all three images in the bot folder.`
                    );
                }

                try {
                    const mainImage = new AttachmentBuilder(
                        INFO_MAIN_IMAGE,
                        { name: "information-center.png" }
                    );

                    const embed = new EmbedBuilder()
                        .setColor(0x087BFF)
                        .setImage("attachment://information-center.png");

                    await channel.send({
                        embeds: [embed],
                        files: [mainImage],
                        components: [informationMenuRow()]
                    });

                    return interaction.editReply(
                        `✅ Information Center posted in ${channel}.`
                    );

                } catch (error) {
                    console.error("Information Center setup failed:", error);

                    return interaction.editReply(
                        "❌ Could not post the Information Center. Check the bot's channel permissions."
                    );
                }
            }

            // TICKET SETUP


            if (command === "ticket-setup") {
                if (interaction.user.id !== BOT_OWNER_ID) {
    return privateReply(
        interaction,
        "❌ Only the bot owner can use this command."
    );
}

                if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {

                    return privateReply(interaction, "You need **Manage Server** permission to set up tickets.");

                }

                const panelChannel = interaction.options.getChannel("channel", true);

                if (panelChannel.type !== ChannelType.GuildText) {

                    return privateReply(interaction, "Please select a valid text channel for the ticket panel.");

                }

                await interaction.deferReply({ ephemeral: true });

                try {

                    await getOrCreateTicketCategory(interaction.guild);

                    const panelEmbed = makeEmbed(

                        interaction.guild,

                        "🎫 Heartland Support Center",

                        "Welcome to the **Heartland State Roleplay Support Center**. Choose the option that best fits your request below.\n\n" +

                        "🎫 **General Support** — questions, server help, or general assistance.\n" +

                        "👑 **High Command** — leadership matters or command-level concerns.\n" +

                        "⚖️ **Internal Affairs** — complaints or confidential staff concerns.\n\n" +

                        "Each ticket creates a private channel. Please provide details and wait for an authorized staff member to respond."

                    );

                    const payload = { embeds: [panelEmbed], components: [ticketPanelRow()] };

                    if (fs.existsSync(TICKET_SUPPORT_IMAGE_PATH)) {

                        const image = new AttachmentBuilder(TICKET_SUPPORT_IMAGE_PATH, { name: "ticket-support.png" });

                        panelEmbed.setImage("attachment://ticket-support.png");

                        payload.files = [image];

                    }

                    await panelChannel.send(payload);

                    return interaction.editReply(`✅ Ticket category is ready and the support panel was posted in ${panelChannel}.`);

                } catch (error) {

                    console.error("Ticket setup failed:", error);

                    return interaction.editReply("❌ Ticket setup failed. Check that the bot has Manage Channels, View Channel, Send Messages, Embed Links, and Attach Files permissions.");

                }

            }

            // VERIFICATION SETUP

            if (command === "setup-verification") {
if (interaction.user.id !== BOT_OWNER_ID) {
    return privateReply(
        interaction,
        "❌ Only the bot owner can use this command."
    );
}
                if (

                    !interaction.memberPermissions?.has(

                        PermissionsBitField.Flags.ManageGuild

                    )

                ) {

                    return privateReply(

                        interaction,

                        "You need **Manage Server** permission to set up verification."

                    );

                }

                const channel =

                    interaction.options.getChannel("channel", true);

                if (channel.type !== ChannelType.GuildText) {

                    return privateReply(

                        interaction,

                        "Please select a valid text channel."

                    );

                }

                await channel.send({

                    embeds: [

                        makeEmbed(

                            interaction.guild,

                            "🛡️ Member Verification",

                            "Welcome to **Heartland State Roleplay**.\n\nPress the button below to verify and unlock community access."

                        )

                    ],

                    components: [verificationRow()]

                });

                return privateReply(

                    interaction,

                    `✅ Verification panel posted in ${channel}.`

                );

            }

            // SESSION COMMANDS

            if (

                ["session-start", "session-end", "session-status"].includes(command)

            ) {

                if (!hasSessionStaffRole(interaction.member)) {

                    return privateReply(

                        interaction,

                        "🔒 You need the authorized Heartland staff role to use session commands."

                    );

                }

                const guild = interaction.guild;

                const channel = getSessionChannel(guild);

                const notificationRole = getNotificationRole(guild);

                if (!channel) {

                    return privateReply(

                        interaction,

                        "Check `SESSION_CHANNEL_ID` in your `.env` file."

                    );

                }

                if (!notificationRole) {

                    return privateReply(

                        interaction,

                        "Check `SESSION_NOTIFICATION_ROLE_ID` in your `.env` file."

                    );

                }

                const guildId = interaction.guildId;

                const session = activeSessions.get(guildId);

                // SESSION START

                if (command === "session-start") {

                    if (session) {

                        return privateReply(interaction, {

                            embeds: [

                                makeEmbed(

                                    guild,

                                    "⚠️ Session Already Active",

                                    "A session is already running. Use `/session-end` first."

                                )

                            ]

                        });

                    }

                    if (!fs.existsSync(BANNER_PATH)) {

                        return privateReply(

                            interaction,

                            "The file `heartland-banner.png` is missing from the bot folder."

                        );

                    }

                    const banner = new AttachmentBuilder(BANNER_PATH, {

                        name: "heartland-banner.png"

                    });

                    const message = await channel.send({

                        content: `<@&${notificationRole.id}>`,

                        allowedMentions: {

                            roles: [notificationRole.id]

                        },

                        files: [banner],

                        components: [quickJoinRow()]

                    });

                    activeSessions.set(guildId, {

                        messageId: message.id,

                        channelId: channel.id,

                        startedAt: Date.now()

                    });

                    return privateReply(interaction, {

                        embeds: [

                            makeEmbed(

                                guild,

                                "✅ Session Started",

                                `The SSU banner was posted in ${channel}.`

                            )

                        ]

                    });

                }

                // SESSION END

                if (command === "session-end") {

                    if (!session) {

                        return privateReply(interaction, {

                            embeds: [

                                makeEmbed(

                                    guild,

                                    "⚠️ No Active Session",

                                    "There is no active session to shut down."

                                )

                            ]

                        });

                    }

                    await interaction.deferReply({ ephemeral: true });

                    const summary =

                        interaction.options.getString("summary") ||

                        "Thank you to everyone who participated.";

                    const duration =

                        durationText(Date.now() - session.startedAt);

                    if (!fs.existsSync(SHUTDOWN_BANNER_PATH)) {

                        return interaction.editReply(

                            "The file `heartland-shutdown-banner.png` is missing from the bot folder."

                        );

                    }

                    const banner = new AttachmentBuilder(

                        SHUTDOWN_BANNER_PATH,

                        { name: "heartland-shutdown-banner.png" }

                    );

                    await channel.send({

                        content:

                            "**SESSION SHUTDOWN**\n\n" +

                            "**Heartland State Roleplay (HSRP) has shut down.**\n\n" +

                            `${summary}\n\n` +

                            `**Session Duration:** ${duration}\n\n` +

                            "Thank you for being part of the session. We hope to see you at the next one.",

                        files: [banner]

                    });

                    activeSessions.delete(guildId);

                    return interaction.editReply({

                        embeds: [

                            makeEmbed(

                                guild,

                                "✅ Session Shut Down",

                                `The SSD announcement was posted in ${channel}.`

                            )

                        ]

                    });

                }

                // SESSION STATUS

                if (command === "session-status") {

                    if (!session) {

                        return privateReply(interaction, {

                            embeds: [

                                makeEmbed(

                                    guild,

                                    "SESSION STATUS",

                                    "⚪ **No active session**\n\nHeartland is currently on standby."

                                )

                            ]

                        });

                    }

                    return privateReply(interaction, {

                        embeds: [

                            makeEmbed(

                                guild,

                                "SESSION STATUS",

                                "🟢 **Session Active**"

                            ).addFields(

                                {

                                    name: "SERVER",

                                    value: BRAND.name,

                                    inline: true

                                },

                                {

                                    name: "DURATION",

                                    value: durationText(

                                        Date.now() - session.startedAt

                                    ),

                                    inline: true

                                }

                            )

                        ]

                    });

                }

            }

        }

        // TICKET BUTTONS: collect the reason before creating a ticket.

        if (

            interaction.isButton() &&

            [

                "hsrp_ticket_open_support",

                "hsrp_ticket_open_general",

                "hsrp_ticket_open_highcommand",

                "hsrp_ticket_open_ia",

                "hsrp_ticket_open_directorship"

            ].includes(interaction.customId)

        ) {

            const ticketTypes = {

                hsrp_ticket_open_support: { label: "General Support", slug: "general" },

                hsrp_ticket_open_general: { label: "General Support", slug: "general" },

                hsrp_ticket_open_highcommand: { label: "High Command", slug: "high-command" },

                hsrp_ticket_open_ia: { label: "Internal Affairs", slug: "internal-affairs" },

                hsrp_ticket_open_directorship: { label: "Directorship", slug: "directorship" }

            };

            const ticketType = ticketTypes[interaction.customId];

            const modal = new ModalBuilder()

                .setCustomId(`hsrp_ticket_reason:${ticketType.slug}`)

                .setTitle(`${ticketType.label} Ticket`);

            const reasonInput = new TextInputBuilder()

                .setCustomId("ticket_reason")

                .setLabel("What do you need help with?")

                .setStyle(TextInputStyle.Paragraph)

                .setPlaceholder("Explain the reason for opening this ticket...")

                .setMinLength(5)

                .setMaxLength(1000)

                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

            return interaction.showModal(modal);

        }

 

        if (interaction.isModalSubmit() && interaction.customId.startsWith("hsrp_ticket_reason:")) {

            const guild = interaction.guild;

            if (!guild) return privateReply(interaction, "Tickets can only be opened inside the server.");

            const slug = interaction.customId.split(":")[1];

            const ticketTypes = {

                general: { label: "General Support", slug: "general" },

                "high-command": { label: "High Command", slug: "high-command" },

                "internal-affairs": { label: "Internal Affairs", slug: "internal-affairs" },

                directorship: { label: "Directorship", slug: "directorship" }

            };

            const ticketType = ticketTypes[slug];

            if (!ticketType) return privateReply(interaction, "That ticket department is not recognized.");

            const reason = interaction.fields.getTextInputValue("ticket_reason").trim();

            await interaction.deferReply({ ephemeral: true });

            try {

                const existing = guild.channels.cache.find(channel =>

                    channel.type === ChannelType.GuildText &&

                    channel.topic?.startsWith(`hsrp-ticket-owner:${interaction.user.id}`)

                );

                if (existing) return interaction.editReply(`You already have an open ticket: ${existing}`);

                const category = await getOrCreateTicketCategory(guild);

                const staffRoleIds = getTicketStaffRoleIds(guild);

                const permissionOverwrites = [

                    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },

                    {

                        id: interaction.user.id,

                        allow: [

                            PermissionsBitField.Flags.ViewChannel,

                            PermissionsBitField.Flags.SendMessages,

                            PermissionsBitField.Flags.ReadMessageHistory,

                            PermissionsBitField.Flags.AttachFiles,

                            PermissionsBitField.Flags.EmbedLinks

                        ]

                    },

                    {

                        id: guild.members.me.id,

                        allow: [

                            PermissionsBitField.Flags.ViewChannel,

                            PermissionsBitField.Flags.SendMessages,

                            PermissionsBitField.Flags.ReadMessageHistory,

                            PermissionsBitField.Flags.AttachFiles,

                            PermissionsBitField.Flags.ManageChannels

                        ]

                    },

                    ...staffRoleIds.map(id => ({

                        id,

                        allow: [

                            PermissionsBitField.Flags.ViewChannel,

                            PermissionsBitField.Flags.SendMessages,

                            PermissionsBitField.Flags.ReadMessageHistory,

                            PermissionsBitField.Flags.AttachFiles

                        ]

                    }))

                ];

                const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 18) || "member";

                const ticketChannel = await guild.channels.create({

                    name: `ticket-${ticketType.slug}-${safeName}`.slice(0, 95),

                    type: ChannelType.GuildText,

                    parent: category.id,

                    topic: `hsrp-ticket-owner:${interaction.user.id}|department:${ticketType.label}`,

                    permissionOverwrites,

                    reason: `Support ticket opened by ${interaction.user.tag}`

                });

 

                // Image first, followed by the solid ticket-information embed.

                if (fs.existsSync(TICKET_THANKYOU_IMAGE_PATH)) {

                    const topImage = new AttachmentBuilder(TICKET_THANKYOU_IMAGE_PATH, { name: "ticket-thankyou.png" });

                    const imageMessage = await ticketChannel.send({ files: [topImage] });

                    await imageMessage.pin().catch(error => console.error("Could not pin ticket image:", error));

                }

 

                const infoEmbed = new EmbedBuilder()

                    .setColor(0x202225)

                    .setTitle("🎫 Ticket Information")

                    .setDescription("Thank you for opening a ticket with Heartland State Roleplay. Please wait for a staff member to assist you.")

                    .addFields(

                        { name: "OPENED BY", value: `${interaction.user} (${interaction.user.tag})`, inline: false },

                        { name: "REASON", value: reason.slice(0, 1024), inline: false },

                        { name: "DEPARTMENT", value: ticketType.label, inline: false }

                    )

                    .setFooter({ text: "HEARTLAND STATE ROLEPLAY • SUPPORT SERVICES" })

                    .setTimestamp();

 

                const infoMessage = await ticketChannel.send({

                    content: `${interaction.user} ${staffRoleIds.map(id => `<@&${id}>`).join(" ")}`.trim(),

                    allowedMentions: { users: [interaction.user.id], roles: staffRoleIds },

                    embeds: [infoEmbed],

                    components: [ticketCloseRow()]

                });

                await infoMessage.pin().catch(error => console.error("Could not pin ticket details:", error));

                return interaction.editReply(`✅ Your private ${ticketType.label} ticket has been created: ${ticketChannel}`);

            } catch (error) {

                console.error("Ticket creation failed:", error);

                return interaction.editReply("❌ I couldn't create your ticket. Please tell staff and ask them to check the bot's channel permissions.");

            }

        }

 

        if (interaction.isButton() && interaction.customId === "hsrp_ticket_close") {

            const channel = interaction.channel;

            if (!channel || channel.type !== ChannelType.GuildText || !channel.topic?.startsWith("hsrp-ticket-owner:")) {

                return privateReply(interaction, "This button can only be used in an HSRP support ticket.");

            }

            const topicParts = channel.topic.slice("hsrp-ticket-owner:".length).split("|");

            const ownerId = topicParts[0];

            const department = (topicParts.find(part => part.startsWith("department:")) || "department:Unknown").slice("department:".length);

            const isOwner = interaction.user.id === ownerId;

            const isStaff = isAuthorizedStaff(interaction) || interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels);

            if (!isOwner && !isStaff) {

                return privateReply(interaction, "Only the ticket opener or authorized staff can close this ticket.");

            }

            await interaction.deferReply({ ephemeral: true });

            try {

                const closedEmbed = new EmbedBuilder()

                    .setColor(0x202225)

                    .setTitle("🔒 Your Ticket Has Been Closed")

                    .setDescription(

                        `Hello! Your ticket with **Heartland State Roleplay** has been closed.\n\n` +

                        `**Department:** ${department}\n` +

                        `**Closed by:** ${interaction.user.tag}\n\n` +

                        "Thank you for contacting our staff team. If you still need assistance, you are welcome to open another ticket. We appreciate your patience and cooperation!"

                    )

                    .setFooter({ text: "HEARTLAND STATE ROLEPLAY • SUPPORT SERVICES" })

                    .setTimestamp();

                const owner = await client.users.fetch(ownerId);

                const dmPayload = { embeds: [closedEmbed] };

                if (fs.existsSync(TICKET_CLOSED_IMAGE_PATH)) {

                    dmPayload.files = [new AttachmentBuilder(TICKET_CLOSED_IMAGE_PATH, { name: "ticket-closed.png" })];

                }

                await owner.send(dmPayload).catch(error => {

                    console.log(`Could not DM ticket owner ${ownerId}: ${error.message}`);

                });

 

                const closedChannelEmbed = makeEmbed(

                    interaction.guild,

                    "🔒 Ticket Closed",

                    `This ticket was closed by ${interaction.user}. The ticket opener has been notified by DM if their privacy settings allow it.`

                );

                await channel.send({ embeds: [closedChannelEmbed] });

                await interaction.editReply("🔒 Ticket closed. A closure DM was attempted, and this channel will be deleted in 10 seconds.");

                setTimeout(() => {

                    channel.delete("HSRP support ticket closed").catch(error => console.error("Ticket channel deletion failed:", error));

                }, 10000);

                return;

            } catch (error) {

                console.error("Ticket closure failed:", error);

                return interaction.editReply("❌ I couldn't close this ticket. Check the bot's channel permissions.");

            }

        }

 

        // VERIFICATION BUTTON

        if (

            interaction.isButton() &&

            interaction.customId === "heartland_verify"

        ) {

            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;

            const unverifiedId = process.env.UNVERIFIED_ROLE_ID;

            const verifiedId = process.env.VERIFIED_ROLE_ID;

            const communityId = process.env.COMMUNITY_MEMBER_ROLE_ID;

            const unverified = unverifiedId

                ? guild.roles.cache.get(unverifiedId)

                : null;

            const verified = verifiedId

                ? guild.roles.cache.get(verifiedId)

                : null;

            const community = communityId

                ? guild.roles.cache.get(communityId)

                : null;

            const botMember = guild.members.me;

            if (!unverified || !verified || !community) {

                return interaction.editReply(

                    "⚠️ A verification role is missing. Contact staff."

                );

            }

            if (

                !botMember?.permissions.has(

                    PermissionsBitField.Flags.ManageRoles

                )

            ) {

                return interaction.editReply(

                    "⚠️ The bot needs Manage Roles permission."

                );

            }

            if (

                [unverified, verified, community].some(role =>

                    role.managed ||

                    role.position >= botMember.roles.highest.position

                )

            ) {

                return interaction.editReply(

                    "⚠️ Move the bot role above Unverified, Verified, and Community Member."

                );

            }

            const member = await guild.members.fetch(interaction.user.id);

            if (

                member.roles.cache.has(verifiedId) &&

                member.roles.cache.has(communityId)

            ) {

                return interaction.editReply(

                    "✅ You are already verified. Welcome to Heartland!"

                );

            }

            await member.roles.add(

                [verified, community],

                "Completed verification"

            );

            if (member.roles.cache.has(unverifiedId)) {

                await member.roles.remove(

                    unverified,

                    "Completed verification"

                );

            }

            return interaction.editReply({

                embeds: [

                    makeEmbed(

                        guild,

                        "✅ Verification Complete",

                        "You now have your Verified and Community Member roles. Welcome to Heartland!"

                    )

                ]

            });

        }

        // INFORMATION CENTER DROPDOWN — responses are private to the person selecting.

        if (

            interaction.isStringSelectMenu() &&

            interaction.customId === "hsrp_information_select"

        ) {

            const selection = interaction.values[0];

            if (selection === "departments") {

                if (!fs.existsSync(INFO_DEPARTMENTS_IMAGE)) {

                    return privateReply(interaction, "The departments image is missing. Please contact staff.");

                }

                const image = new AttachmentBuilder(

                    INFO_DEPARTMENTS_IMAGE,

                    { name: "information-departments.png" }

                );

                const embed = new EmbedBuilder()

                    .setColor(0x087BFF)

                    .setImage("attachment://information-departments.png");

                return privateReply(interaction, {

                    embeds: [embed],

                    files: [image]

                });

            }

            if (selection === "rules") {

                if (!fs.existsSync(INFO_RULES_IMAGE)) {

                    return privateReply(interaction, "The rules image is missing. Please contact staff.");

                }

                const image = new AttachmentBuilder(

                    INFO_RULES_IMAGE,

                    { name: "information-rules.png" }

                );

                const embed = new EmbedBuilder()

                    .setColor(0x087BFF)

                    .setImage("attachment://information-rules.png");

                const linkRow = new ActionRowBuilder().addComponents(

                    new ButtonBuilder()

                        .setLabel("Read the Full Rules & Regulations")

                        .setEmoji("📖")

                        .setStyle(ButtonStyle.Link)

                        .setURL(INFO_RULES_URL)

                );

                return privateReply(interaction, {

                    embeds: [embed],

                    files: [image],

                    components: [linkRow]

                });

            }

        }

        // SESSION NOTIFICATION TOGGLE

        if (

            interaction.isButton() &&

            interaction.customId === "session_notification_toggle"

        ) {

            const guild = interaction.guild;

            const role = getNotificationRole(guild);

            const botMember = guild.members.me;

            if (!role) {

                return privateReply(

                    interaction,

                    "The Session Notification role could not be found."

                );

            }

            if (

                !botMember?.permissions.has(

                    PermissionsBitField.Flags.ManageRoles

                ) ||

                role.managed ||

                role.position >= botMember.roles.highest.position

            ) {

                return privateReply(

                    interaction,

                    "The bot needs Manage Roles permission and must be above the Session Notification role."

                );

            }

            const member = await guild.members.fetch(interaction.user.id);

            if (member.roles.cache.has(role.id)) {

                await member.roles.remove(

                    role,

                    "Opted out of session notifications"

                );

                return privateReply(interaction, {

                    embeds: [

                        makeEmbed(

                            guild,

                            "🔕 Notifications Disabled",

                            "You will no longer receive session pings."

                        )

                    ]

                });

            }

            await member.roles.add(

                role,

                "Opted into session notifications"

            );

            return privateReply(interaction, {

                embeds: [

                    makeEmbed(

                        guild,

                        "🔔 Notifications Enabled",

                        "You will now receive Heartland session pings."

                    )

                ]

            });

        }

    } catch (error) {

        console.error("Interaction error:", error);

        const message =

            "Something went wrong. Check the bot logs for details.";

        if (interaction.deferred || interaction.replied) {

            await interaction.editReply({

                content: message

            }).catch(() => {});

        } else if (interaction.isRepliable()) {

            await interaction.reply({

                content: message,

                ephemeral: true

            }).catch(() => {});

        }

    }

});

// ─────────────────────────────────────────────

// LOGIN

// ─────────────────────────────────────────────

if (!process.env.DISCORD_TOKEN) {

    console.error("Missing DISCORD_TOKEN in .env.");

    process.exit(1);

}

client.login(process.env.DISCORD_TOKEN);