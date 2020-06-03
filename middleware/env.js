/*
const path = require("path");
const pathEnv = path.resolve(process.cwd(), '.env');
var dotenv = require('dotenv').config({ path: pathEnv});
*/

var dotenv = require('dotenv');
var dotenvExpand = require('dotenv-expand')

class envPolicy {
    constructor() {}

    init(config) {
        // load env variables in process.env
        var myEnv = dotenv.config()
        dotenvExpand(myEnv);

        // add env variables from config
        if(config)
        for (const k in config) {
            process.env[k] = config[k]
        }
            
        return process.env;
    }
}

module.exports = new envPolicy();