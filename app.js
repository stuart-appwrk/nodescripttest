const express = require('express');
const cors = require('cors');
const middlewares = require('./middlewares');
const routes = require('./routes');
const { getBranchesLists, getAllFiles, getAllCommits } = require('./public/controllers');
const getFileContent = require('./public/content');
const { createNewFile } = require('./public/createFiles')
const { createPackage, makeUninstallDir, generateZipDir, deployScript,executeUninstall,getToastAlert } = require('./public/createRollout')
const flash = require('connect-flash');
var session = require('express-session');
var bodyParser = require('body-parser');
var fs = require('fs');
require('dotenv').config();
const sql = require("msnodesqlv8");
const moment = require('moment');
var cookieParser = require('cookie-parser')
    // express-toastr
    , toastr = require('express-toastr');
    const connectionString = "server=DESKTOP-KUVG2Q9;Database=WMSAutomation;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";


let branch = '';
let shaKey = '';
let rollOut = '';
const user = 'gabby-g007';//req.params.user;
const reponame = 'Unilever' //req.params.reponame;

const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use(cors());
app.use(middlewares.setHeaders);
app.use('/github_api', routes);
app.use(cookieParser('secret'));
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}))

app.use(flash());
app.use(toastr());

app.get('/', async (req, res) => {
    //const repoList = await getAllRepo(user)
    const branchList = await getBranchesLists(user, reponame)
    res.render('pages/home', { response: branchList, req: req });
})

app.post('/branches', async (req, res) => {
    reponame = req.body.repo;
    const branchList = await getBranchesLists(user, reponame)
    res.render('pages/branches', { response: branchList });
})
app.get('/commits', async (req, res) => {
    branch = req.query.branch
    const response1 = await getAllCommits(user, reponame, branch)
    res.render('pages/commits', { respCommit: response1, moment: moment });
})
app.get('/files', async (req, res) => {
    shaKey = req.query.sha
    rollOut = req.query.commit;
    let offset = rollOut.indexOf('_')
    if (offset > 0) {
        rollOut = commit.substring(offset + 1, commit.length)
    }
    const allFiles = await getAllFiles(user, reponame, shaKey)
    res.render('pages/files', { changedFiles: allFiles, message: '' });
})
app.get('/createFile', async (req, res) => {
    const fileName = req.query.fileName
    const content = await getFileContent(user, reponame, shaKey, fileName)
    const newFile = await createNewFile(branch, content, fileName)
    res.render('pages/createFile', { content: newFile });
})
app.post('/deployRollout', async function (req, res) {
    const allFiles = await getAllFiles(user, reponame, shaKey)
    const changedFiles = allFiles.files;
    //const query = "select top 1 rollout_name from rollout_master where rollout_name='" + rollOut + "'";
    //sql.query(connectionString, query, (err, rows) => {
    //if (rows.length <= 0) {
    // const rolloutQuery = "insert into rollout_master (rollout_name) values('" + rollOut + "')";
    //sql.query(connectionString, rolloutQuery, (err, response) => {
    //   if (err) console.log('error : ', err);
    let path = 'hotfixes/' + rollOut;
    fs.access(path, (error) => {
        if (error) {
            fs.mkdir(path, async (error) => {
                if (error) {
                    console.log(error);
                } else {
                    createPackage(path, changedFiles, rollOut,user, reponame, shaKey);
                    makeUninstallDir(path, changedFiles, rollOut,user, reponame, shaKey)
                }
            })
        }
        else {
            createPackage(path, changedFiles, rollOut,user, reponame, shaKey);
            makeUninstallDir(path, changedFiles, rollOut,user, reponame, shaKey);
        }
    });

    getToastAlert(req, 'success', "The rollout has been created.");
    const query = "select site_id as id,site_name as name from site_master";
    sql.query(connectionString, query, async (err, siteList) => {
        if (err) console.log(err);
        res.render('pages/deployRollout', { siteList: siteList, req: req });
    });

    //});
    // }
    // else {
    //     req.flash('message', "The rollout is already created.");
    //     const query = "select site_id as id,site_name as name from site_master";
    //     sql.query(connectionString, query, (err, siteList) => {
    //         if (err) console.log(err);
    //         res.render('pages/deployRollout', { siteList: siteList });
    //     });
    // }
    //});
});
app.post('/deploy', async function (req, res) {
    let siteId = req.body.site;
    let envId = req.body.environment;
    let btnClicked = req.query.button;
    //zip the folder to the server 
    let path = 'hotfixes/' + rollOut;
    let serverPath = 'LES\\hotfixes\\' + rollOut;
    if (btnClicked === 'uni') {
        //path = 'hotfixes/' + rollOut //+ '/UNINSTALL_' + rollOut;
        serverPath = 'LES\\hotfixes\\' + rollOut + '\\UNINSTALL_' + rollOut;
        //generateZipFolder(zipPath, zipPath + ".zip")
        executeUninstall(req, serverPath, siteId, envId,connectionString);
    }
    else {
        generateZipDir(path, path + ".zip")
        deployScript(req, path, serverPath, siteId, envId,rollOut,connectionString);
    }
    //res.redirect('/')
    const branchList = await getBranchesLists(user, reponame)
    res.render('pages/home', { response: branchList, req: req });
});

app.route('/deployRollout')
    .get((req, res) => {
        res.render('pages/deployRollout', { siteList: siteList });
    })
app.get('/environment/:id', (req, res) => {
    const query = "SELECT [site_env_envid] as id, [env_name] as [name]  FROM [dbo].[site_env_mapping],env_master where site_env_siteid=" + req.params.id + " and env_id=site_env_envid";
    sql.query(connectionString, query, (err, rows) => {
        res.json(rows);
    });
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}...`))