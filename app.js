const express = require('express');
const cors = require('cors');
const middlewares = require('./middlewares');
const routes = require('./routes');
const { generateOptions } = require('./utils');
const https = require('https');
const getBranchesLists = require('./public/branches');
const getAllCommits = require('./public/commits');
const getAllFiles = require('./public/allFiles');
const getFileContent = require('./public/content');
const createNewFile = require('./public/createFiles')
let branch ='';
let shaKey = '';
const user = 'stuart-appwrk';//req.params.user;
const reponame = 'nodescripttest'; //req.params.reponame;

const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');

app.use(express.json());
app.use(cors());
app.use(middlewares.setHeaders);
app.use('/github_api', routes);



app.get('/', async (req, res) => {
    const response = await getBranchesLists(user, reponame)
    res.render('pages/home', { response: response });
})
app.get('/commits', async (req, res) => {
    branch = req.query.branch
    const response1 = await getAllCommits(user, reponame,branch)
    res.render('pages/commits', { respCommit: response1 });
})
app.get('/files', async (req, res) => {
    shaKey = req.query.sha
    const response1 = await getAllFiles(user, reponame, shaKey)
    res.render('pages/files', { changedFiles: response1 });
})
app.get('/createFile', async (req, res) => {
    const fileName = req.query.fileName
    const content = await getFileContent(user, reponame,shaKey,fileName)
    const newFile = await createNewFile(branch,content,fileName)
    res.render('pages/createFile', { content: newFile });
})
// app.get('/', async (req,res)=>{
//     const user = 'stuart-appwrk';//req.params.user;
//     const reponame = 'nodescripttest'; //req.params.reponame;
//     const response = await getAllCommits(user,reponame)
    
//     res.render('pages/home',{response : response});
// })

app.listen(PORT, () => console.log(`Server started on port ${PORT}...`))