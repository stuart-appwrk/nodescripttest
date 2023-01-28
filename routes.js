const express = require('express');
const controllers=require('./controllers');

const router = express.Router();

router.get('/user/:user', controllers.getUser)

router.get('/repo/:user/:reponame', controllers.getRepo)

router.get('/commit/:user/:reponame', controllers.getCommit)

router.get('/:user/:reponame/:branchname', controllers.getBranches)

module.exports = router;