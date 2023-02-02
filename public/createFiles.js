var fs = require('fs');

async function createNewFile(folderName, content, fileName) {
    const path = "../" + folderName;
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
              
                        fs.appendFile(path + '/' + fileName, content, async function (err) {
                            if (err) throw err;
                            msg='File is created successfully.';
                        });
                    
                }
            });
        } else {
            const isExists = fs.existsSync(path + '/' + fileName)
            if (isExists) {
                // delete file
                fs.unlink(path + '/' + fileName, async function (errr) {
                    if (errr) throw errr;
                    // appendFile function with filename, content and callback function
                    fs.appendFile(path + '/' + fileName, content, async function (err) {
                        if (err) throw err;
                        msg='File is created successfully.';
                    });
                });
            }
            else {
                fs.appendFile(path + '/' + fileName, content, async function (err) {
                    if (err) throw err;
                    msg='File is created successfully.';
                });
            }
        }
    });
    console.log('message',msg)
    return msg;
}
module.exports = createNewFile