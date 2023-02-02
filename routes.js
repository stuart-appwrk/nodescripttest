const express = require('express');
const controllers=require('./controllers');

const router = express.Router();

router.get('/user/:user', controllers.getUser)

router.get('/repo/:user/:reponame', controllers.getRepo)

router.get('/repos/:user/:reponame/commits', controllers.getCommit)

router.get('/:user/:reponame/:branchname', controllers.getBranch)

router.get('/repos/:user/:reponame/branches', controllers.getBranchesList)

module.exports = router;