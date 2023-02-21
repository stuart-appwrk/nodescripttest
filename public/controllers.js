const { generateOptions } = require('../utils');
const https = require('https');
const fetch = require('node-fetch');

function getAllRepo(user) {
    const options = generateOptions('/users/' + user + '/repos')
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
function getAllCommits(user, reponame, branch) {
    const options = generateOptions('/repos/' + user + '/' + reponame + '/commits?sha=' + branch)
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
function getAllFiles(user, reponame, shaKey) {
    const options = generateOptions('/repos/' + user + '/' + reponame + '/commits/' + shaKey)
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

module.exports = { getAllRepo, getBranchesLists, getAllCommits, getAllFiles }
