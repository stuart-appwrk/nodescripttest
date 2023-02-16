const express = require('express');
const cors = require('cors');
const middlewares = require('./middlewares');
const routes = require('./routes');
const { getBranchesLists, getAllFiles, getAllCommits, checkRollout } = require('./public/controllers');
const getFileContent = require('./public/content');
const createNewFile = require('./public/createFiles')
const flash = require('connect-flash');
var session = require('express-session');
var bodyParser = require('body-parser');
const archiver = require('archiver');
let Client = require('ssh2-sftp-client');
var fs = require('fs');
var rexec = require('remote-exec');
require('dotenv').config();
const sql = require("msnodesqlv8");

const connectionString = "server=DESKTOP-KUVG2Q9;Database=WMSAutomation;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";

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
app.use(express.static('public'))
app.use(middlewares.setHeaders);
app.use('/github_api', routes);
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
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
    const query = "select top 1 rollout_name from rollout_master where rollout_name='" + rollOut + "'";
    sql.query(connectionString, query, (err, rows) => {
        if (rows.length <= 0) {
            const rolloutQuery = "insert into rollout_master (rollout_name) values('" + rollOut + "')";
            sql.query(connectionString, rolloutQuery, (err, response) => {
                if (err) console.log('error : ', err);
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
                req.flash('message', "The rollout has been created.");
                const query = "select site_id as id,site_name as name from site_master";
                sql.query(connectionString, query, (err, siteList) => {
                    if (err) console.log(err);
                    res.render('pages/deployRollout', { siteList: siteList });
                });

            });
        }
        else {
            req.flash('message', "The rollout is already created.");
            const query = "select site_id as id,site_name as name from site_master";
            sql.query(connectionString, query, (err, siteList) => {
                if (err) console.log(err);
                res.render('pages/deployRollout', { siteList: siteList });
            });
        }
    });
});
app.post('/deploy', async function (req, res) {
    let siteId = req.body.site;
    let envId = req.body.environment;
    //zip the folder to the server 
    let path = 'hotfixes/' + rollOut;
    let serverPath = 'LES\\hotfixes\\' + rollOut;
    const query = "SELECT [site_env_host] as Host ,[site_env_port] as [Port] ,[site_env_username] as Username,[site_env_password] as [Password] FROM [dbo].[site_env_mapping] where site_env_siteid=" + siteId + " and site_env_envid=" + envId;
    sql.query(connectionString, query, (err, server) => {
        if (err) console.log(err);
        console.log("server : ", server)
        transferZipFolder(path, serverPath, server);
    });

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
            let filePath = file.filename.replace('LES', '$LESDIR');
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
async function transferZipFolder(path, serverPath, server) {
    try {
        let sftp = new Client();
        sftp.connect({ host: server.Host, port: server.Port, username: server.Username, password: server.Password }).then(() => {
            sftp.put(path + ".zip", 'LES/hotfixes/' + rollOut + ".zip");
        }).then(data => {
            console.log('File/Folder transfer successfully at selected server.');
        }).catch(err => {
            console.log(err, 'catch error');
        });

        var connection_options = {
            port: server.Port,
            username: server.Username,
            password: server.Password
        };

        var hosts = [server.Host
        ];

        var cmds = [
            "mkdir " + serverPath,
            "tar -xf " + serverPath + ".zip -C " + serverPath,
            "LES\\data\\env",
            //"perl "+serverPath+"\\rollout.pl " + rollOut,
            "perl " + serverPath + "\\script.pl"
        ];

        rexec(hosts, cmds, connection_options, async function () {
            console.log('Folder extracted successfully at selected server!');
        });
    }
    catch (ex) {

    }
}
app.route('/deployRollout')
    .get((req, res) => {
        res.render('pages/deployRollout', { siteList: siteList, envList: envList });
    })
app.get('/environment/:id', (req, res) => {
    const query = "SELECT [site_env_envid] as id, [env_name] as [name]  FROM [dbo].[site_env_mapping],env_master where site_env_siteid=" + req.params.id + " and env_id=site_env_envid";
    sql.query(connectionString, query, (err, rows) => {
        res.json(rows);
    });
});
app.listen(PORT, () => console.log(`Server started on port ${PORT}...`))