const ftp = require('basic-ftp');
const fs = require('fs');

class FTPClient {
    constructor(host, port, username, password, secure) {
        this.client = new ftp.Client();
        this.settings = {
            host: host,
            port: port,
            user: username,
            password: password,
            secure: secure
        };
    }

    upload(sourcePath, remotePath, permissions) {
        let self = this;
        (async () => {
            try {
                await self.client.access(self.settings);
                const res = await self.client.upload(fs.createReadStream(sourcePath), remotePath);
                console.log('ok');
            } catch (err) {
                console.log("error : ", err);
            }
            //self.client.close();
        })();
    }
    decompress(sourcePath, remotePath) {
        let self = this;
        (async () => {
            try {
                await self.client.access(self.settings);
                await self.client.pipe(sourcePath, remotePath);
                console.log('ok');
            } catch (err) {
                console.log(err);
            }
            self.client.close();
        })();
    }
    close() {
        this.client.close();
    }
}

module.exports = FTPClient;