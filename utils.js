const constants=require('./constants');
var env = require("dotenv").config();

const generateOptions=(_path)=>{
    return options = {
        hostname: constants.hostname,
        path: _path,
        headers: {
            'User-Agent': constants.user_agent
        },
        OAUth: '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'
    }
}

module.exports ={ generateOptions }