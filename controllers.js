const { generateOptions } = require('./utils');
const https = require('https');



const getUser = async function (req, res) {
    const user = req.params.user;
    const options = generateOptions('/users/' + user)

    https.get(options, function (apiResponse) {
        const resp = apiResponse.pipe(res);
    }).on('error', (e) => {
        console.log(e);
        res.status(500).send(constants.error_message);
    })
}

const getRepo = async function (req, res) {
    const user = req.params.user;
    const reponame = req.params.reponame;
    const options = generateOptions('/repos/' + user + '/' + reponame)

    https.get(options, function (apiResponse) {
        apiResponse.pipe(res);
    }).on('error', (e) => {
        console.log(e);
        res.status(500).send(constants.error_message);
    })
}

const getCommit = async function (req, res) {
    const user = req.params.user;
    const reponame = req.params.reponame;
    const options = generateOptions('/repos/' + user + '/' + reponame + '/commits')

    https.get(options, function (apiResponse) {
        apiResponse.pipe(res);
    }).on('error', (e) => {
        console.log(e);
        res.status(500).send(constants.error_message);
    })
}

const getBranch = async function (req, res) {
    const user = req.params.user;
    const reponame = req.params.reponame;
    const branchname = req.params.branchname;

    // const options = generateOptions('/repos/' + user + '/' + reponame + '/commits')
    const options = generateOptions('/repos/' + user + '/' + reponame + '/branch/' + branchname)

    https.get(options, function (apiResponse) {
        apiResponse.pipe(res);
    }).on('error', (e) => {
        console.log(e);
        res.status(500).send(constants.error_message);
    })
}

const getBranchesList = async function (req, res) {
    const user = req.params.user;
    const reponame = req.params.reponame;

    const options = generateOptions('/repos/' + user + '/' + reponame + '/branches')
    
    https.get(options, function (apiResponse) {
        apiResponse.pipe(res);
        var str = ''
        apiResponse.on('data', (data) => {
            str += data
        })
        apiResponse.on('end', async function() {
        var releases = JSON.parse(str)
        //console.log('releases',releases)
       // res.render('pages/home',{releases})
        })
    }).on('error', (e) => {
        console.log(e);
        res.status(500).send(constants.error_message);
    })
}

module.exports = { getUser, getRepo, getCommit, getBranch, getBranchesList }