const express = require('express');
const cors = require('cors');
const middlewares = require('./middlewares');
const routes = require('./routes');
const { getBranchesLists, getAllFiles, getAllCommits } = require('./public/controllers');
const getFileContent = require('./public/content');
const { createNewFile, createSubFolders } = require('./public/createFiles')
const flash = require('connect-flash');
var session = require('express-session');
var bodyParser = require('body-parser');
const archiver = require('archiver');
let Client = require('ssh2-sftp-client');
var fs = require('fs');
require('dotenv').config();
const sql = require("msnodesqlv8");
const moment = require('moment');
const { NodeSSH } = require('node-ssh');
var cookieParser = require('cookie-parser')
    // express-toastr
    , toastr = require('express-toastr');

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
                    createPackage(path, changedFiles, rollOut);
                    makeUninstallDir(path, changedFiles, rollOut)
                }
            })
        }
        else {
            createPackage(path, changedFiles, rollOut);
            makeUninstallDir(path, changedFiles, rollOut);
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
        executeUninstall(req, serverPath, siteId, envId);
    }
    else {
        generateZipDir(path, path + ".zip")
        deployScript(req, path, serverPath, siteId, envId);
    }
    //res.redirect('/')
    const branchList = await getBranchesLists(user, reponame)
    res.render('pages/home', { response: branchList, req: req });
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
                if (!fileName.includes('UNINSTALL_')) {
                    const content = await getFileContent(user, reponame, shaKey, file.filename);

                    const newFile = await createNewFile(path, content, filePath);

                    scriptFile.push("REPLACE ", filePath, " ", "$LESDIR/" + folderPath, "\n");
                    if (fileName.match(/\.(mcmd|mtrg|json|resource|action|jrxml)$/i)) {
                        mbuild++;
                    }
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
async function makeUninstallDir(path, changedFiles, rollOutNumber) {
    path += '/UNINSTALL_' + rollOutNumber;
    fs.access(path, (error) => {
        if (error) {
            fs.mkdir(path, async (error) => {
                if (error) {
                    console.log(error);
                } else {
                    buildUninstallPackage(path, changedFiles, rollOutNumber)
                }
            })
        }
        else {
            buildUninstallPackage(path, changedFiles, rollOutNumber);
        }
    });

}
async function buildUninstallPackage(path, changedFiles, rollOutNumber) {
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
                if (fileName.includes('UNINSTALL_')) {
                    const content = await getFileContent(user, reponame, shaKey, file.filename);
                    const newFile = await createNewFile(path, content, filePath);
                    scriptFile.push("REPLACE ", filePath, " ", "$LESDIR/" + folderPath, "\n");
                }
                else {
                    if (fileName.match(/\.(ctl)$/i)) {
                        const content = await getFileContent(user, reponame, shaKey, file.filename);
                        const newFile = await createNewFile(path, content, filePath);
                        scriptFile.push("REPLACE ", filePath, " ", "$LESDIR/" + folderPath, "\n");
                    }
                    if (fileName.match(/\.(mcmd|mtrg|json|resource|action|jrxml)$/i)) {
                        let sftp = new Client();
                        let isAvailable = false;
                        await sftp.connect({
                            host: 'host',
                            port: 'port',
                            username: 'username',
                            password: 'pwd'
                        }).then(() => {
                            return sftp.get(file.filename);
                        }).then(res => {
                            createSubFolders(filePath, path);
                            sftp.get(file.filename, path + '/' + filePath);
                            isAvailable = true;
                            scriptFile.push("REPLACE ", filePath, " ", "$LESDIR/" + folderPath, "\n");
                        }).catch(e => {
                            if (!isAvailable) {
                                scriptFile.push("REMOVE ", filePath, " ", "$LESDIR/" + folderPath, "\n");
                            }
                        });
                        mbuild++;
                    }
                }
            }
        }
        scriptFile.push("\n# Removing files removed by extension.\n", "\n", "\n# Run any SQL, MSQL, and other scripts.\n", generateProcessingScript(changedFiles), "\n", "\n# Load any data affected.  NOTE the assumption is that.\n", generateLoadDataScriptUninstall(changedFiles), "\n", "\n# Import any Integrator data affected.\n", generateImportDataScript(changedFiles));
    }
    scriptFile.push("\n", "\n# Rebuilding C makefiles if necessary.\n", "\n# Perform any environment rebuilds if necessary.", "\n#ANT\n")
    if (mbuild > 0) {
        scriptFile.push("\nMBUILD\n")
    }
    scriptFile.push("\n# END OF AUTO-GENERATED SCRIPT.\n");
    const html = scriptFile.join("");

    fs.writeFile(path + "/UNINSTALL_" + rollOutNumber, html, function (err) {
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
            if (!fileName.includes('UNINSTALL_')) {
                if (fileName.match(/\.(sql|tbl|idx|trg|hdr|prc|pck|seq)$/i)) {
                    scriptFile.push("RUNSQL ", "$LESDIR/" + filePath, "\n");
                }
            } else if (fileName.includes('UNINSTALL_')) {
                if (fileName.match(/\.(sql|tbl|idx|trg|hdr|prc|pck|seq)$/i)) {
                    scriptFile.push("RUNSQL ", "$LESDIR/" + filePath, "\n");
                }
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
                if (!fileName.includes('UNINSTALL_')) {
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
    }
    const html = scriptFile.join("");
    return html;
}
function generateLoadDataScriptUninstall(changedFiles) {
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
                if (fileName.includes('UNINSTALL_')) {
                    let offset1 = fileName.indexOf('_');
                    let offset = fileName.indexOf('-');
                    if (offset > 0) {
                        let filePrefix = fileName.substring(offset1 + 1, offset);
                        scriptFile.push("LOADDATA ", '$LESDIR/' + folderPath + "/" + filePrefix + ".ctl", " ", filePath, "\n");
                    }
                    else {
                        let offset = fileName.indexOf('.');
                        let filePrefix = fileName.substring(offset1 + 1, offset);
                        scriptFile.push("LOADDATA ", '$LESDIR/' + folderPath + "/" + filePrefix + ".ctl", " ", filePath, "\n");
                    }
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
            if (!fileName.includes('UNINSTALL_')) {
                if (fileName.match(/\.(slexp)$/i)) {
                    scriptFile.push("IMPORTSLDATA ", "$LESDIR/" + filePath, "\n");
                }
            }
            else if (fileName.includes('UNINSTALL_')) {
                if (fileName.match(/\.(slexp)$/i)) {
                    scriptFile.push("IMPORTSLDATA ", "$LESDIR/" + filePath, "\n");
                }
            }
        }
    }
    const html = scriptFile.join("");
    return html;
}
function generateZipDir(sourceDir, outPath) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise(async (resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', err => reject(err))
            .pipe(stream);
        stream.on('close', () => resolve());
        archive.finalize();
    });
}
function deployScript(req, path, serverPath, siteId, envId) {
    const query = "SELECT [site_env_host] as Host ,[site_env_port] as [Port] ,[site_env_username] as Username,[site_env_password] as [Password] FROM [dbo].[site_env_mapping] where site_env_siteid=" + siteId + " and site_env_envid=" + envId;
    sql.query(connectionString, query, async (err, server) => {
        if (err) console.log(err);
        let sftp = new Client();
        sftp.connect({
            host: server[0].Host,
            port: server[0].Port,
            username: server[0].Username,
            password: server[0].Password
        }).then(() => {
            return sftp.put(path + ".zip", 'LES/hotfixes/' + rollOut + ".zip");
        }).then(data => {
            const ssh = new NodeSSH()

            var cmds = [
                "mkdir " + serverPath,
                "tar -xf " + serverPath + ".zip -C " + serverPath,
                "LES\\data\\env",
                //"perl "+serverPath+"\\rollout.pl " + rollOut,
                "perl " + serverPath + "\\script.pl"
            ];
            ssh.connect({
                host: server[0].Host,
                username: server[0].Username,
                password: server[0].Password
            }).then(()=> {
                cmds.forEach(command => {
                    ssh.execCommand(command).then(function (result) {
                        
                        if (result.stderr) {  getToastAlert(req, 'error', result.stderr); }
                        else if (result.stdout) { getToastAlert(req, 'success', 'The script rollout process has been completed successfuly.'); }
                    })
                });
            })
            getToastAlert(req, 'success', 'The script rollout process has been completed successfuly.');
        }).catch(err => {
            getToastAlert(req, 'error', err);
        });

    })
    
}
function executeUninstall(req, serverPath, siteId, envId) {
    const query = "SELECT [site_env_host] as Host ,[site_env_port] as [Port] ,[site_env_username] as Username,[site_env_password] as [Password] FROM [dbo].[site_env_mapping] where site_env_siteid=" + siteId + " and site_env_envid=" + envId;
    sql.query(connectionString, query, (err, server) => {
        if (err) console.log(err);
        const ssh = new NodeSSH()
        var cmds = [
            "LES\\data\\env",
            "perl " + serverPath + "\\script.pl"
        ];
        ssh.connect({
            host: server[0].Host,
            username: server[0].Username,
            password: server[0].Password
        }).then(function () {
            cmds.forEach(command => {
                ssh.execCommand(command).then(function (result) {
                    if (result.stderr) { getToastAlert(req, 'error', result.stderr) }
                    else if (result.stdout) { getToastAlert(req, 'success', 'The rollback process has been completed successfuly.'); }
                })
            });
        })
    })
}
function getToastAlert(req, type, message) {
    console.log(req,message)
    if (type === 'error') {
        req.toastr.error(message, title = '', options = { positionClass: 'toast-bottom-right' });
    }
    else {
       req.toastr.success(message, title = '', options = { positionClass: 'toast-bottom-right' });
    }
}
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