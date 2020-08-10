const { get } = require('axios');
const cheerio = require('cheerio');
const { MessageEmbed } = require('discord.js');

module.exports = {
    async fetchCurrentURL() {
        const res = await get('https://www.robotevents.com/robot-competitions/vex-robotics-competition');
        const $ = cheerio.load(res.data);
        const url = $('i.fa-question').parent().attr('href');
        return url;

    },
    async fetchPageCount(url) {
        const res = await get(`${url}`);
        const $ = cheerio.load(res.data);
        const pageCount = $('.pagination', '.panel-body').find('li').length - 2;
        return pageCount;
    },
    async fetchUnansweredQuestions(url) {
        const base = new Map();
        const pageCount = await module.exports.fetchPageCount(url);

        for (let i = 1; i <= pageCount; i++) {

            const res = await get(`${url}?page=${i}`);
            const $ = cheerio.load(res.data);
            const questionTitles = $('.panel-body').children('h4.title:not(:has(a span))');

            questionTitles.each((index, child) => {
                //ps i hate scraping
                const title = module.exports.unformat($(child).text());
                const author = module.exports.unformat($(child).nextUntil('hr').children('.details').children('.author').text());
                const timestamp = module.exports.unformat($(child).nextUntil('hr').children('.details').children('.timestamp').text());
                const tags = module.exports.unformat($(child).next().next('.tags').text(), false);
                const url = $(child).children('a').attr('href');
                const id = url.match(/QA\/(\d+)/)[1];

                base.set(id, { title, author, timestamp, url, tags });

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
                .addField("Question: ", `[${question.title}](${question.url})`)
                .setFooter(`Tags 🏷️ | ${question.tags.length ? question.tags.join(', ') : "none"}`);

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
    removeAll(keys, map) {
        keys.forEach(key => map.delete(key));
    },
    unformat(string, firstIndex = true) {
        string = string.split(/\n/g) //split on newline
            .map(n => n.trim()) //remove whitespace
            .filter(n => n.length); //remove the empty elements

        if (string === undefined) return;
        return firstIndex ? string[0] : string;
    }
}
