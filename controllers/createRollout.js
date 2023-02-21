const { createNewFile, createSubFolders } = require('./createFiles')
const archiver = require('archiver');
const Client = require('ssh2-sftp-client');
const { NodeSSH } = require('node-ssh');
const getFileContent = require('./content');
var fs = require('fs');
const sql = require("msnodesqlv8");

async function createPackage(path, changedFiles, rollOutNumber,user, reponame, shaKey) {
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
async function makeUninstallDir(path, changedFiles, rollOutNumber,user, reponame, shaKey) {
    path += '/UNINSTALL_' + rollOutNumber;
    fs.access(path, (error) => {
        if (error) {
            fs.mkdir(path, async (error) => {
                if (error) {
                    console.log(error);
                } else {
                    buildUninstallPackage(path, changedFiles, rollOutNumber,user, reponame, shaKey)
                }
            })
        }
        else {
            buildUninstallPackage(path, changedFiles, rollOutNumber,user, reponame, shaKey);
        }
    });

}
async function buildUninstallPackage(path, changedFiles, rollOutNumber,user, reponame, shaKey) {
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
                            host: '172.16.1.230',
                            port: '22',
                            username: 'REMOTE-5 (YOUCAST)',
                            password: '123'
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
function deployScript(req, path, serverPath, siteId, envId,rollOut,connectionString) {
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
            }).then(function () {
                cmds.forEach(command => {
                    ssh.execCommand(command).then(function (result) {
                        if (result.stderr) { getToastAlert(req, 'error', result.stderr); }
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
function executeUninstall(req, serverPath, siteId, envId,connectionString) {
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
    if (type === 'error') {
        req.toastr.error(message, title = '', options = { positionClass: 'toast-bottom-right' });
    }
    else {
        req.toastr.success(message, title = '', options = { positionClass: 'toast-bottom-right' });
    }
}

module.exports = { createPackage, makeUninstallDir, generateZipDir, deployScript,executeUninstall,getToastAlert }