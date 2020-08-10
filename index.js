require('dotenv').config();
const { job } = require('cron');
const { Client, Permissions } = require('discord.js');
const { fetchUnansweredQuestions, difference, generateQuestionEmbeds, removeAll, fetchCurrentURL } = require('./util/util.js');
const db = require('./util/db.js');

const bot = new Client({ messageCacheMaxSize: 0 });

const watch = async () => {
    try {
        // make an initial request to fetch the unanswered questions
        console.log('initial req');
        let baseURL = await fetchCurrentURL();
        let baseQuestionsRequest = await fetchUnansweredQuestions(baseURL);

        job("0 0 */1 * * *", async () => {

            //if it's a new day, refetch the base questions
            const time = new Date(Date.now());
            const hour = time.getUTCHours();
            console.log(`Job fired at ${hour}:00 UTC`);

            if (hour === 5) { //az 10:00 time
                console.log('refetching questions');
                baseURL = await fetchCurrentURL();
                baseQuestionsRequest = await fetchUnansweredQuestions(baseURL);

            }
            console.log(baseQuestionsRequest);
            //get the most recent unanswered questions
            const newQuestionsRequest = await fetchUnansweredQuestions(baseURL);

            // find if the newQuestionsRequest is missing a question from baseQuestionsRequest, 
            // if they are the same, return
            // if they aren't, the questions present in baseQuestionsRequest but 
            // not in newQuestionsRequest are the answered questions
            const answeredIDs = difference(baseQuestionsRequest, newQuestionsRequest);
            if (!answeredIDs)
                return console.log("No new responses");
            console.log("New response!!");

            //get the server channel ids in the db
            const channelsSnapshot = await db.get("/", "value");
            if (!channelsSnapshot.exists()) return;
            const channelIDs = channelsSnapshot.val();

            //create embeds using the answered question ids
            const embeds = generateQuestionEmbeds(answeredIDs, baseQuestionsRequest);

            for (const [guildID, channelID] of Object.entries(channelIDs)) {
                console.log(channelID);
                // fetch each channel subscribed to updates, send each answered question
                const channel = await bot.channels.fetch(channelID);
                embeds.forEach(async embed => await channel.send(embed));

                // the questions are now answered, so remove them from baseQuestionsRequest 
                removeAll(answeredIDs, baseQuestionsRequest);
            }
        }, null, true, "America/Phoenix");
    } catch (e) { return console.log(e); }
}

bot.on('ready', () => {
    bot.user.setPresence({
        activity: {
            type: "WATCHING",
            name: `the GDC 👀 | ${bot.guilds.cache.size} servers`
        }
    })
    // when the bot is ready, watch for answered questions every minute
    watch();
})

bot.on('message', async message => {
    try {
        // if the author is a bot or qA isn't mentioned or there isn't a mention or the mention's ID isn't qA's ID
        // return
        if (message.author.bot) return;
        const mention = message.mentions.users.first();
        if (!mention) return;
        if (!(mention.id === bot.user.id)) return;

        const isMayowa = message.author.id === '423699849767288853';
        const manageServerWebhooks = message.member.hasPermission(Permissions.FLAGS.MANAGE_WEBHOOKS);
        const manageChannelWebhooks = message.channel.permissionsFor(message.member).has(Permissions.FLAGS.MANAGE_WEBHOOKS);

        //a valid user means it's either me or a person who has server/channel webhook perms
        const validUser = (isMayowa || manageServerWebhooks || manageChannelWebhooks);
        if (!validUser) return;

        // if there's no channel, get the subscribed channel, if any, and return
        const channel = message.mentions.channels.first();
        if (!channel) {
            const channelSnapshot = await db.get(message.guild.id, "value");
            if (channelSnapshot.exists()) {
                return message.channel.send(`Q&A updates are being sent to <#${channelSnapshot.val()}>`);
            } else {
                return message.channel.send("Q&A updates are disabled for this server. Enable them by sending <@728411099652816897> `[#channel]`");
            }
        }

        //get the channel id
        const channelID = channel.id.match(/\d+/g)[0];

        // get the channel that the server is using for updates, if there is none set an empty string
        const channelSnapshot = await db.get(message.guild.id, "value");
        const guildChannel = channelSnapshot.exists() ? channelSnapshot.val() : "";

        // if the channel is the same as the one in the db, remove it
        // else, add the channel id, this will override any channel previously stored
        if (guildChannel === channelID) {
            await db.delete(message.guild.id);
            message.reply("Updates will no longer be sent in the server.");
        } else {
            await db.set(message.guild.id, channelID);
            message.reply(`Updates will now be sent in ${channel}`);
        }
        // }
    } catch (e) { return console.log(e); }
})

bot.login(process.env.TOKEN);