const constants = require('./constants');
require('dotenv').config();

const generateOptions=(_path)=>{
    return options = {
        hostname: constants.hostname,
        path: _path,
        headers: { 
            'User-Agent': constants.user_agent
            //authorization: "token " + process.env.GH_TOKEN
        }
        //OAuth: process.env.GH_TOKEN
    }
}

module.exports ={ generateOptions }