const { get } = require('axios');
const cheerio = require('cheerio');
const { MessageEmbed } = require('discord.js');

module.exports = {
    async fetchCurrentSeason() {
        const res = await get("https://www.vexrobotics.com/vexedr/competition/vrc-current-game");
        const $ = cheerio.load(res.data);
        const year = parseInt($('title').text().substr(0, 4));
        return `${year}-${year + 1}`;
    },
    async fetchPageCount(season) {
        const res = await get(`https://www.robotevents.com/VRC/${season}/QA`);
        const $ = cheerio.load(res.data);
        const pageCount = $('.pagination', '.panel-body').find('li').length - 2;
        return pageCount;
    },
    async fetchUnansweredQuestions() {
        const base = new Map();
        const season = await module.exports.fetchCurrentSeason();
        const pageCount = await module.exports.fetchPageCount(season);

        for (let i = 1; i <= pageCount; i++) {

            const res = await get(`https://www.robotevents.com/VRC/${season}/QA?page=${i}`);
            const $ = cheerio.load(res.data);
            const questionTitles = $('.panel-body').children('h4.title:not(:has(a span))');

            questionTitles.each((index, child) => {

                const title = module.exports.unformat($(child).text());
                const author = module.exports.unformat($(child).nextUntil('hr').children('.details').children('.author').text());
                const timestamp = module.exports.unformat($(child).nextUntil('hr').children('.details').children('.timestamp').text());

                const url = $(child)
                    .children('a')
                    .attr('href');

                const id = url.match(/QA\/(\d+)/)[1];

                base.set(id, { title, author, timestamp, url });

            });
        }
        return base;
    },
    generateQuestionEmbeds(ids, questions) {
        const n = [];
        ids.forEach(id => {
            const question = questions.get(id);
            const embed = new MessageEmbed();
            embed
                .setTitle("New Q&A Response!")
                .setDescription(`Asked by ${question.author} ${question.timestamp}`)
            .addField("Question: ", `[${question.title}](${question.url})`);

            n.push(embed);
        })
        return n;
    },
    difference(baseMap, newMap) {
        const keys = [];
        baseMap.forEach((value, key) => {
            if (!(newMap.get(key)))
                keys.push(key);
        })
        return keys.length ? keys : false;
    },
    removeAll(map, keys) {
        keys.forEach(key => map.delete(key));
    },
    unformat(string) {
        return string.split(/\n/g) //split on newline
            .map(n => n.trim()) //remove whitespace
            .filter(n => n.length)[0]; //remove the empty elements
    }
}