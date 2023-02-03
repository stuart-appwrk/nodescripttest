const { generateOptions } = require('../utils');
const https = require('https');


function getAllFiles(user, reponame,shaKey) {
    const options = generateOptions('/repos/' + user + '/' + reponame + '/commits/'+shaKey)
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

module.exports = getAllFiles
