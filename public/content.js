const fetch = require('node-fetch');

async function getFileContent(user, reponame,shakey,fileName)
{
    url = 'https://raw.githubusercontent.com/'+user+'/'+reponame+'/'+shakey+'/'+fileName;
    const names = await fetch(url);
    const textData = names.text();
    return textData;

}
module.exports = getFileContent