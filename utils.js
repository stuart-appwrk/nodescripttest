const constants=require('./constants');
var env = require("dotenv").config();

const generateOptions=(_path)=>{
    return options = {
        hostname: constants.hostname,
        path: _path,
        headers: {
            'User-Agent': constants.user_agent
        },
        OAUth: process.env.GH_TOKEN
    }
}

module.exports ={ generateOptions }