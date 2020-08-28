const express = require("express");
const app = express();
const {objectSce} = require("@nxn/ext");


class ExpressSce {

    init(config,ctxt)
    {
        const rootDir = process.cwd();
        const dirs = config.dirs;
        objectSce.forEachSync(dirs, (dir,url)=>{
            const d = rootDir+'/'+dir;
            ctxt.app.use(url,ctxt.express.static(d))
            console.log("Serving static files "+url+" => "+d);            
        });        
    }   
}

module.exports = new ExpressSce();