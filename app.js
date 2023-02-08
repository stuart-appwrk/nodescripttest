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
const flash = require('connect-flash');
var session = require('express-session');
var fs = require('fs');

let branch = '';
let shaKey = '';
let rollOut = '';
const user = 'gabby-g007';//req.params.user;
const reponame = 'nodescripttest'; //req.params.reponame;

const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');

app.use(express.json());
app.use(cors());
app.use(middlewares.setHeaders);
app.use('/github_api', routes);
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))
app.use(flash());
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    // res.locals.error_msg = req.flash('error_msg');
    // res.locals.error = req.flash('error');
    // res.locals.users = req.user || null;
    next();
});
app.get('/', async (req, res) => {
    const response = await getBranchesLists(user, reponame)
    res.render('pages/home', { response: response });
})
app.get('/commits', async (req, res) => {
    branch = req.query.branch
    const response1 = await getAllCommits(user, reponame, branch)
    res.render('pages/commits', { respCommit: response1 });
})
app.get('/files', async (req, res) => {
    shaKey = req.query.sha
    rollOut = req.query.commit
    const allFiles = await getAllFiles(user, reponame, shaKey)
    //console.log('allFiles : ',allFiles.files)
    res.render('pages/files', { changedFiles: allFiles, message: '' });
})
app.get('/createFile', async (req, res) => {
    const fileName = req.query.fileName
    const content = await getFileContent(user, reponame, shaKey, fileName)
    const newFile = await createNewFile(branch, content, fileName)
    res.render('pages/createFile', { content: newFile });
})
app.post('/', async function (req, res) {
    const allFiles = await getAllFiles(user, reponame, shaKey)
    const changedFiles = allFiles.files;
    let path = '../' + branch + '/hotfixes/' + rollOut;
    fs.access(path, (error) => {
        if (error) {
            fs.mkdir(path, async (error) => {
                if (error) {
                    console.log(error);
                } else {
                    createPackage(path, changedFiles, rollOut);
                }
            })
        }
        else {
            createPackage(path, changedFiles, rollOut);
        }
    });

    req.flash('success_msg', 'Files has been created/saved successfully.')
    res.redirect('/')
    //res.render('pages/files', { changedFiles: allFiles, message: req.flash().success[0] });
});
async function createPackage(path, changedFiles, rollOutNumber) {
    var scriptFile = [];
    scriptFile.push("# Extension ", rollOutNumber, "\n#\n# This script has been built automatically using RolloutBuilder.\n", "# Please check the actions taken by the script as they may not be entirely correct.\n", "# Also check the order of the actions taken if any dependencies might be\n", "# encountered\n", "#\n", "# Replacing files affected by extension.\n");
    scriptFile.push("\n\n")
    for (const file of changedFiles) {
        if (file.status !== 'removed') {
            let offset = file.filename.lastIndexOf('/')
            let folderName = file.filename.substring(0, offset);
            const content = await getFileContent(user, reponame, shaKey, file.filename);
            const newFile = await createNewFile(path, content, file.filename);
            if (folderName.includes('pkg')) {
                folderName = folderName.slice(4, folderName.length);
            }
            scriptFile.push("REPLACE ", file.filename, " ", "$LESDIR/" + folderName, "\n");
        }
    }
    scriptFile.push("\n# Removing files removed by extension.\n");
    scriptFile.push("\n");
    //scriptFile.push(generateProcessingScript(scriptLocation));
    scriptFile.push("\n");
    scriptFile.push("\n# END OF AUTO-GENERATED SCRIPT.\n");
    const html = scriptFile.join("");

    fs.appendFile(path + "/" + rollOutNumber, html, function (err) {
        if (err) throw err;
        let msg = 'File is created successfully.';
        console.log('message : ', msg);
    });
}

// app.get('/', async (req,res)=>{
//     const user = 'stuart-appwrk';//req.params.user;
//     const reponame = 'nodescripttest'; //req.params.reponame;
//     const response = await getAllCommits(user,reponame)
//     res.render('pages/home',{response : response});
// })

app.listen(PORT, () => console.log(`Server started on port ${PORT}...`))