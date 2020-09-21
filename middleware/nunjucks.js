const nunjucks = require("nunjucks");
const {objectSce} = require("@nxn/ext");
const express = require("express");
const debug = require("@nxn/debug")('nunjucks');

class nunjucksPolicy {
    constructor() {}

    init(config,ctxt) {
        if(!ctxt.express)
            ctxt.express = express;

        if(!ctxt.app)
            ctxt.app = express();

        config.vars = config.vars || {};
        const dirs = config.static||config.dirs;
        let templateDirs = [];

        if(dirs) 
        {
            const rootDir = process.cwd();

            objectSce.forEachSync(dirs, (desc,url1)=>{
                let dir = desc.path || desc;
                let vars = desc.vars || config.vars;

                const d = rootDir+'/'+dir;
                templateDirs.push(d);

                ctxt.app.get(url1, function(req, res){
                    const { url, path: routePath }  = req ;
                    debug.log("serving :"+url);
                    res.render('index.html', vars);
                });                
            });
        }
        else
            templateDirs = ['templates'];

        let options = {
            autoescape: true,
            express: ctxt.app
        };

        if(config.noCache)
            options.noCache = true;

        // change tags for avoiding conflicts w/ angularJS ?
        if(config.tags)
            options.tags = config.tags;
            
        // add html render engine
        nunjucks.configure(templateDirs, options);
    }
}

module.exports = new nunjucksPolicy();