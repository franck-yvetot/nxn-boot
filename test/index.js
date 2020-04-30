// module alias : allow access to applications services from config files
// install : npm i --save module-alias
require('module-alias/register');

const {bootSce} = require("nxn-boot");

// init config reader from client data
var myArgs = process.argv.slice(2);
let client = myArgs[0] || 'default';
global.__clientDir = `${__dirname}/client_data/${client}/`;


// get config name and path
let configName = myArgs[1] || 'config.json';
if(configName.search(/[.](json|ya?ml)/)==-1)
    configName = 'config_'+configName+'.json';
    
const configPath = [__clientDir,__dirname];

bootSce.runConfig(configName,configPath);