const { generateOptions } = require('../utils');
const https = require('https');


function getAllCommits(user, reponame,branch) {
    const options = generateOptions('/repos/' + user + '/' + reponame + '/commits?sha='+branch)
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

module.exports = getAllCommits
