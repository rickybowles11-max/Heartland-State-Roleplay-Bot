require("dotenv").config();

 

const {

    REST,

    Routes,

    SlashCommandBuilder,

    PermissionFlagsBits,

    ChannelType

} = require("discord.js");

 

const commands = [

    new SlashCommandBuilder()

        .setName("ping")

        .setDescription("Check whether the bot is online."),

 

    new SlashCommandBuilder()

        .setName("promote")

        .setDescription("Record a staff promotion.")

        .addUserOption(option =>

            option.setName("member")

                .setDescription("Staff member being promoted")

                .setRequired(true))

        .addStringOption(option =>

            option.setName("rank")

                .setDescription("Their new rank")

                .setRequired(true))

        .addStringOption(option =>

            option.setName("reason")

                .setDescription("Reason for the promotion")

                .setRequired(true)),

 

    new SlashCommandBuilder()

        .setName("infraction-issue")

        .setDescription("Issue a staff infraction or personnel action.")

        .addUserOption(option =>

            option.setName("member")

                .setDescription("Staff member")

                .setRequired(true))

        .addStringOption(option =>

            option.setName("action")

                .setDescription("Personnel action")

                .setRequired(true)

                .addChoices(

                    { name: "Warning", value: "Warning" },

                    { name: "Strike", value: "Strike" },

                    { name: "Infraction", value: "Infraction" },

                    { name: "Demotion", value: "Demotion" },

                    { name: "Termination", value: "Termination" }

                ))

        .addStringOption(option =>

            option.setName("reason")

                .setDescription("Reason for the action")

                .setRequired(true))

        .addStringOption(option =>

            option.setName("new-rank")

                .setDescription("New rank, if this is a demotion")

                .setRequired(false)),

 

    new SlashCommandBuilder()

        .setName("staff-history")

        .setDescription("View or void a staff case.")

        .addStringOption(option =>

            option.setName("case-id")

                .setDescription("Case ID, such as HSRP-0001")

                .setRequired(true))

        .addStringOption(option =>

            option.setName("action")

                .setDescription("View or void the case")

                .setRequired(true)

                .addChoices(

                    { name: "View", value: "view" },

                    { name: "Void", value: "void" }

                ))

        .addStringOption(option =>

            option.setName("void-reason")

                .setDescription("Required when voiding a case")

                .setRequired(false)),

 

    new SlashCommandBuilder()

        .setName("setup-verification")

        .setDescription("Post the member verification panel.")

        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addChannelOption(option =>

            option.setName("channel")

                .setDescription("Text channel for the verification panel")

                .setRequired(true)

                .addChannelTypes(ChannelType.GuildText)),

 

    new SlashCommandBuilder()

        .setName("session-start")

        .setDescription("Start an HSRP session (SSU)."),

 

    new SlashCommandBuilder()

        .setName("session-end")

        .setDescription("End the active HSRP session (SSD).")

        .addStringOption(option =>

            option.setName("summary")

                .setDescription("Optional session shutdown message")

                .setRequired(false)),

 

    new SlashCommandBuilder()

        .setName("session-status")

        .setDescription("Check the current HSRP session status."),

 

    new SlashCommandBuilder()

        .setName("open-staff-apps")

        .setDescription("Open staff applications (Resources team only)."),

 

    new SlashCommandBuilder()

        .setName("close-staff-apps")

        .setDescription("Close staff applications (Resources team only)."),

 

    new SlashCommandBuilder()

        .setName("ticket-setup")

        .setDescription("Create ticket categories and post the support panel.")

        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addChannelOption(option =>

            option.setName("channel")

                .setDescription("Channel where the support panel will be posted")

                .setRequired(true)

                .addChannelTypes(ChannelType.GuildText)),

 

    new SlashCommandBuilder()

        .setName("information-setup")

        .setDescription("Post the HSRP Information Center.")

        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addChannelOption(option =>

            option.setName("channel")

                .setDescription("Channel where the Information Center will be posted")

                .setRequired(true)

                .addChannelTypes(ChannelType.GuildText))

];

 

async function main() {

    const token = process.env.DISCORD_TOKEN;

    const clientId = process.env.CLIENT_ID;

    const guildId = process.env.GUILD_ID;

 

    if (!token || !clientId || !guildId) {

        throw new Error(

            "Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in your .env file."

        );

    }

 

    const rest = new REST({ version: "10" }).setToken(token);

 

    await rest.put(

        Routes.applicationGuildCommands(clientId, guildId),

        { body: commands.map(command => command.toJSON()) }

    );

 

    console.log(`Successfully registered ${commands.length} slash commands.`);

}

 

main().catch(error => {

    console.error("Failed to register commands:", error);

    process.exitCode = 1;

});