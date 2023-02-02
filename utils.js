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