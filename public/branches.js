const { generateOptions } = require('../utils');
const https = require('https');


function getBranchesLists(user, reponame) {
    const options = generateOptions('/repos/' + user + '/' + reponame + '/branches')
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

module.exports = getBranchesLists
