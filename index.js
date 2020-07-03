require('dotenv').config();
const { CronJob } = require('cron');
const { Client } = require('discord.js');
const { fetchUnansweredQuestions, difference, generateQuestionEmbeds, removeAll } = require('./util/util.js');
const { db } = require('./util/db.js');
const bot = new Client();

const watch = async () => {
    const oldQuestions = await fetchUnansweredQuestions();
    const testQuestions = await fetchUnansweredQuestions();
    testQuestions.set('600', { title: "is mayonaisse an instrument?", author: "battlesquid", timestamp: "1 week ago", url: "https://www.robotevents.com/VRC/2020-2021/QA/624" })

    // new CronJob("* * * * *", async () => {
    // const newQuestions = await fetchUnansweredQuestions();
    const answeredIDs = difference(testQuestions, oldQuestions);
    const channelsSnapshot = await db.get("/", "value");
    if (!channelsSnapshot.exists()) return;
    const channelIDs = channelsSnapshot.val();

    if (answeredIDs) {

        const embeds = generateQuestionEmbeds(answeredIDs, testQuestions);

        for (const [guild, channelID] of Object.entries(channelIDs)) {

            const channel = await bot.channels.fetch(channelID);

            channel.send(embeds);

            removeAll(testQuestions, answeredIDs);
            console.log(testQuestions);
        }
    }
    // }, null, true, "America/Phoenix")
}

bot.on('ready', () => {
    bot.user.setPresence({
        activity: {
            type: "WATCHING",
            name: "you prolly"
        }
    })
    watch();
})

bot.on('message', async message => {
    if (message.author.bot) return;
    const channel = message.mentions.channels.first();
    if (!channel) return;

    await db.set(`${message.guild.id}`, channel.id.match(/\d+/g)[0]);
    message.reply(`Updates will now be sent in ${channel}`);
})

bot.login(process.env.TOKEN);