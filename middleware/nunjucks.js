const nunjucks = require("nunjucks");
const {objectSce} = require("@nxn/ext");
const express = require("express");

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

            objectSce.forEachSync(dirs, (desc,url)=>{
                let dir = desc.path || desc;
                let vars = desc.vars || config.vars;

                const d = rootDir+'/'+dir;
                templateDirs.push(d);

                ctxt.app.get(url, function(req, res){
                    res.render('index.html', vars);
                });                
            });
        }
        else
            templateDirs = ['templates'];

        // add html render engine
        nunjucks.configure(templateDirs, {
            autoescape: true,
            express: ctxt.app
        });
    }
}

module.exports = new nunjucksPolicy();