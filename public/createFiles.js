var fs = require('fs');

async function createNewFile(folderName, content, fileName) {
    let path = "../" + folderName;
    let msg = '';
    fs.access(path, (error) => {
        // To check if the given directory 
        // already exists or not
        if (error) {
            // If current directory does not exist
            // then create it
            fs.mkdir(path, (error) => {
                if (error) {
                    console.log(error);
                } else {
                    createSubFolders(fileName, path)
                    createFile(path, fileName, content)
                }
            });
        } else {
            createSubFolders(fileName, path)
            const isExists = fs.existsSync(path + '/' + fileName)
            if (isExists) {
                // delete file
                fs.unlink(path + '/' + fileName, async function (errr) {
                    if (errr) throw errr;
                    createFile(path, fileName, content)
                });
            }
            else {
                createFile(path, fileName, content)
            }
        }
    });

    return msg;
}
function createSubFolders(fileName, path) {
    let offset = fileName.lastIndexOf('/')
    fName = fileName.substring(offset + 1);
    const folderName = fileName.substring(0, offset);
    let folders = folderName.split('/');
    folders.forEach(element => {
        if (!fs.existsSync(path + '/' + element)) {
            fs.mkdirSync(path + '/' + element);
            
        }
        path += '/' + element;
    });
}
function createFile(path, fileName, content) {
    let msg ='';
    // appendFile function with filename, content and callback function
    fs.appendFile(path + '/' + fileName, content, async function (err) {
        if (err) throw err;
        msg = 'File is created successfully.';
    });
    console.log(msg)
}
module.exports = createNewFile