require('dotenv').config();
const { job } = require('cron');
const { Client } = require('discord.js');
const { fetchUnansweredQuestions, difference, generateQuestionEmbeds, removeAll } = require('./util/util.js');
const db = require('./util/db.js');

const bot = new Client();

const watch = async () => {
    try {
        // make an initial request to fetch the unanswered questions
        console.log('initial req');
        let baseQuestionsRequest = await fetchUnansweredQuestions();

        job("0 */1 * * * *", async () => {

            //if it's a new day, refetch the base questions
            const time = new Date(Date.now());
            const hour = time.getUTCHours(), minutes = time.getUTCMinutes();
            if (hour === 7 && minutes === 0) { //az midnight time
                console.log('refetching questions');
                baseQuestionsRequest = await fetchUnansweredQuestions();
            }

            //get the most recent unanswered questions
            const newQuestionsRequest = await fetchUnansweredQuestions();

            // find if the newQuestionsRequest is missing a question from baseQuestionsRequest, 
            // if they are the same, return
            // if they aren't, the questions present in baseQuestionsRequest but 
            // not in newQuestionsRequest are the answered questions
            const answeredIDs = difference(baseQuestionsRequest, newQuestionsRequest);
            if (!answeredIDs) return;

            //get the server channel ids in the db
            const channelsSnapshot = await db.get("/", "value");
            if (!channelsSnapshot.exists()) return;
            const channelIDs = channelsSnapshot.val();

            //create embeds using the answered question ids
            const embeds = generateQuestionEmbeds(answeredIDs, baseQuestionsRequest);

          
            for (const [guildID, channelID] of Object.entries(channelIDs)) {
                // fetch each channel subscribed to updates, send each answered question
                const channel = await bot.channels.fetch(channelID);
                embeds.forEach(async embed => await channel.send(embed));

                // the questions are now answered, so remove them from baseQuestionsRequest 
                removeAll(answeredIDs, baseQuestionsRequest);
            }
        }, null, true, "America/Phoenix");
    } catch (e) { console.log(e); }
}

bot.on('ready', () => {
    bot.user.setPresence({
        activity: {
            type: "WATCHING",
            name: "you prolly"
        }
    })
     // when the bot is ready, watch for answered questions every minute
    watch();
})

bot.on('message', async message => {

    //if the author is a bot or there is no channel specified, return
    if (message.author.bot) return;
    const channel = message.mentions.channels.first();
    if (!channel) return;

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
})

bot.login(process.env.TOKEN);