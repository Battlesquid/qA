const { get } = require('axios');
const cheerio = require('cheerio');
const questions = new Map();

const unformat = (string) => string
    .split(/\n/g) //split on newline
    .map(n => n.trim()) //remove whitespace
    .filter(n => n.length)[0]; //remove the empty elements

const fetchPageCount = async callback => {
    const res = await get("https://www.robotevents.com/VRC/2020-2021/QA");
    const $ = cheerio.load(res.data);
    const pageCount = $('.pagination', '.panel-body').find('li').length - 2;
    callback(pageCount);
}

fetchPageCount(async count => {
    for (let i = 1; i <= count; i++) {

        const res = await get(`https://www.robotevents.com/VRC/2020-2021/QA?page=${i}`);
        const $ = cheerio.load(res.data);
        const questionTitles = $('.panel-body').children('h4.title:not(:has(a span))');

        questionTitles.each((index, child) => {

            const title = unformat($(child).text());
            const author = unformat($(child).nextUntil('hr').children('.details').children('.author').text());
            const timestamp = unformat($(child).nextUntil('hr').children('.details').children('.timestamp').text());

            const id = $(child)
                .children('a')
                .attr('href')
                .match(/QA\/(\d+)/)[1];

            questions.set(id, { title, author, timestamp });

        });
    }
    console.log(questions);
})