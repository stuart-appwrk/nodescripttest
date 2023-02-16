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
var bodyParser = require('body-parser');
const archiver = require('archiver');
const decompress = require("decompress");
const sftp = require("./public/FTPClient");
let async = require('async');

var fs = require('fs');
const getAllRepo = require('./public/allRepoList');

let branch = '';
let shaKey = '';
let rollOut = '';
const user = 'stuart-appwrk';//req.params.user;
const reponame = 'nodescripttest' //req.params.reponame;

const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use(cors());
app.use(middlewares.setHeaders);
app.use('/github_api', routes);
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))
const siteList = [{ name: "Site1" }, { name: "Site2" }]
const envList = [{ name: "Dev" }, { name: "QA" }, { name: "Prod" }]


app.use(flash());
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    // res.locals.error_msg = req.flash('error_msg');
    // res.locals.error = req.flash('error');
    // res.locals.users = req.user || null;
    next();
});
app.get('/', async (req, res) => {
    //const repoList = await getAllRepo(user)
    const branchList = await getBranchesLists(user, reponame)
    res.render('pages/home', { response: branchList });
})

app.post('/branches', async (req, res) => {
    reponame = req.body.repo;
    const branchList = await getBranchesLists(user, reponame)
    res.render('pages/branches', { response: branchList });
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

    let path = 'hotfixes/' + rollOut;
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
    generateZipFolder(path, path + ".zip");
    // var util = require('util'),
    //     spawn = require('child_process').spawn,
    //     carrier = require('carrier'),
    //     pl_proc = spawn('perl', [path + '/' + 'rollout.pl',rollOut]),
    //     my_carrier;
    // my_carrier = carrier.carry(pl_proc.stdout);
    // my_carrier.on('line', function (line) {
    //     // Do stuff...
    //     console.log('line : ' + line);
    // })
    req.flash('success_msg', 'Files has been created/saved successfully.')
    //res.redirect('/')
    res.render('pages/deployRollout', { siteList: siteList, envList: envList });
});
app.post('/deploy', async function (req, res) {
    //zip the folder to the server 
    let path = 'hotfixes/' + rollOut;
    generateZipFolder(path, path + ".zip");
    transferZipFolder(path);
    // //unzip the folder on server 
    // decompress( path + ".zip", path)
    //     .then((files) => {
    //         console.log(files);
    //     })
    //     .catch((error) => {
    //         console.log(error);
    //     });
    res.redirect('/')
    //res.render('pages/deploy', { siteList: siteList, envList: envList });
});
async function createPackage(path, changedFiles, rollOutNumber) {
    var scriptFile = [];
    let mbuild = 0;
    scriptFile.push("# Extension ", rollOutNumber, "\n#\n# This script has been built automatically using RolloutBuilder.\n", "# Please check the actions taken by the script as they may not be entirely correct.\n", "# Also check the order of the actions taken if any dependencies might be\n", "# encountered\n", "#\n", "# Replacing files affected by extension.\n");
    scriptFile.push("\n\n")
    if (changedFiles.length > 0) {
        for (const file of changedFiles) {
            if (file.status !== 'removed') {
                let offset = file.filename.lastIndexOf('/')
                let fileName = file.filename.substring(offset + 1);
                let folderPath = file.filename.substring(0, offset);
                if (folderPath.includes('LES')) {
                    folderPath = folderPath.slice(4, folderPath.length);
                }
                let filePath = file.filename.replace('LES', 'pkg');

                const content = await getFileContent(user, reponame, shaKey, file.filename);

                const newFile = await createNewFile(path, content, filePath);

                scriptFile.push("REPLACE ", filePath, " ", "$LESDIR/" + folderPath, "\n");
                if (fileName.match(/\.(mcmd|mtrg)$/i)) {
                    mbuild++;
                }
            }
        }

        scriptFile.push("\n# Removing files removed by extension.\n", "\n", "\n# Run any SQL, MSQL, and other scripts.\n", generateProcessingScript(changedFiles), "\n", "\n# Load any data affected.  NOTE the assumption is that.\n", generateLoadDataScript(changedFiles), "\n", "\n# Import any Integrator data affected.\n", generateImportDataScript(changedFiles));
    }
    scriptFile.push("\n", "\n# Rebuilding C makefiles if necessary.\n", "\n# Perform any environment rebuilds if necessary.", "\n#ANT\n")
    if (mbuild > 0) {
        scriptFile.push("\nMBUILD\n")
    }
    scriptFile.push("\n# END OF AUTO-GENERATED SCRIPT.\n");
    const html = scriptFile.join("");

    fs.writeFile(path + "/" + rollOutNumber, html, function (err) {
        if (err) throw err;
        let msg = 'File is created successfully.';
    });
    fs.readdir('common/', (error, files) => {
        if (error) throw error;
        const directoriesInDIrectory = files;
        directoriesInDIrectory.forEach(file => {
            fs.copyFile('common/' + file, path + '/' + file, (err) => {
                if (err) throw err;
                //console.log('Files was copied to destination.');
            });
        })
    });
}
function generateProcessingScript(changedFiles) {
    let scriptFile = []
    for (const file of changedFiles) {
        if (file.status !== 'removed') {
            let offset = file.filename.lastIndexOf('/')
            let fileName = file.filename.substring(offset + 1);
            let filePath = file.filename.replace('LES', 'pkg');
            if (fileName.match(/\.(sql|tbl|idx|trg|hdr|prc|pck|seq)$/i)) {
                scriptFile.push("RUNSQL ", "$LESDIR/" + filePath, "\n");
            }

        }
    }
    const html = scriptFile.join("");
    return html;
}
function generateLoadDataScript(changedFiles) {
    let scriptFile = []
    for (const file of changedFiles) {
        if (file.status !== 'removed') {
            let offset = file.filename.lastIndexOf('/')
            let fileName = file.filename.substring(offset + 1);
            let folderPath = file.filename.substring(0, offset);
            if (folderPath.includes('LES')) {
                folderPath = folderPath.slice(4, folderPath.length);
            }
            let filePath = file.filename.replace('LES', '$LESDIR/');
            if (fileName.match(/\.(csv)$/i)) {
                let offset = fileName.indexOf('-');
                if (offset > 0) {
                    let filePrefix = fileName.substring(0, offset);
                    scriptFile.push("LOADDATA ", '$LESDIR/' + folderPath + "/" + filePrefix + ".ctl", " ", filePath, "\n");
                }
                else {
                    let offset = fileName.indexOf('.');
                    let filePrefix = fileName.substring(0, offset);
                    scriptFile.push("LOADDATA ", '$LESDIR/' + folderPath + "/" + filePrefix + ".ctl", " ", filePath, "\n");
                }
            }
        }
    }
    const html = scriptFile.join("");
    return html;
}
function generateImportDataScript(changedFiles) {
    let scriptFile = []
    for (const file of changedFiles) {
        if (file.status !== 'removed') {
            let offset = file.filename.lastIndexOf('/')
            let fileName = file.filename.substring(offset + 1);
            let filePath = file.filename.replace('LES', 'pkg');
            if (fileName.match(/\.(slexp)$/i)) {
                scriptFile.push("IMPORTSLDATA ", "$LESDIR/" + filePath, "\n");
            }
        }
    }
    const html = scriptFile.join("");
    return html;
}
function generateZipFolder(sourceDir, outPath) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', err => reject(err))
            .pipe(stream);
        stream.on('close', () => resolve());
        archive.finalize();
    });
}
async function transferZipFolder(path) {
    const client = new sftp('host', 21, 'username', 'password', false);
    client.upload(path + ".zip", 'LES/hotfixes/' + rollOut + ".zip");
    //client.decompress(path + ".zip", 'LES/hotfixes/' + rollOut);
    
}

// app.get('/', async (req,res)=>{
//     const user = 'stuart-appwrk';//req.params.user;
//     const reponame = 'nodescripttest'; //req.params.reponame;
//     const response = await getAllCommits(user,reponame)
//     res.render('pages/home',{response : response});
// })

app.listen(PORT, () => console.log(`Server started on port ${PORT}...`))