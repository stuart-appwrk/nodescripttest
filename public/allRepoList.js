const { generateOptions } = require('../utils');
const https = require('https');


function getAllRepo(user) {
    const options = generateOptions('/users/'+user + '/repos')
    return new Promise((resolve) => {
        let data = ''
        https.get(options, res => {
            res.on('data', chunk => { data += chunk })
            res.on('end', () => {
                resolve(JSON.parse(data));                
            })
        })
    })
}

module.exports = getAllRepo
