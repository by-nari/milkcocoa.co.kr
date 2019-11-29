const cheerio = require('cheerio')
const axios = require('axios')
const p = require('path')
const fs = require('fs')

let section = JSON.parse(fs.readFileSync('section.json'))

const downloadImage = async url => {
    const path = p.resolve(__dirname, 'data', url.split('/').slice(-1).pop())
    const writer = fs.createWriteStream(path)
  
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })
  
    response.data.pipe(writer)
  
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

const getImageList = async list => {
    for (const product of list) {
        const res = await axios.get(product)
        const $ = cheerio.load(res.data)
        const rawdata = $('div.dtInfo.commonInfo').html()
        const result = rawdata.match(/src="(https:\/\/image\.milkcocoa\.co\.kr\/__manage__\/product_[^"]+)">/gm)
        if (result !== null) {
            for (const image of result) {
                console.log(`Downloading ${/src="(https:\/\/image\.milkcocoa\.co\.kr\/__manage__\/product_[^"]+)">/.exec(image)[1]}`)
                await downloadImage(/src="(https:\/\/image\.milkcocoa\.co\.kr\/__manage__\/product_[^"]+)">/.exec(image)[1])
            }
        }
    }
}

const buildProductURLList = async (baseUrl, list, page) => {
    const res = await axios.get(`${baseUrl}&page=${page}`)
    const $ = cheerio.load(res.data)
    if ($("a[href^='https://www.milkcocoa.co.kr/shop/detail.php']").length > 0) {
        for (i = 0; i < $("a[href^='https://www.milkcocoa.co.kr/shop/detail.php']").length; i++) {
            list.push($("a[href^='https://www.milkcocoa.co.kr/shop/detail.php']").eq(i).attr('href'))
        }
        buildProductURLList(baseUrl, list, page + 1)
    } else {
        getImageList([...new Set(list)])
    }
}

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
}

section.map(async item => {
    if (item.fetch === true) {
        console.log(`Crawling ${item.name} section`)
        buildProductURLList(item.baseUrl, [], 1)
    }
})