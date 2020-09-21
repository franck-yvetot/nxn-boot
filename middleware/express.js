const express = require("express");
const {objectSce} = require("@nxn/ext");
const debug = require("@nxn/debug")('EXPRESS');

class ExpressSce {

    init(config,ctxt)
    {
        this.config = config;

        if(!ctxt.express)
        ctxt.express = express;

        if(!ctxt.app)
            ctxt.app = express();

        if(config.static) 
        {
            if(config.log)
                ctxt.app.use( function ( req, res, next ) {
                    const { url, method, path: routePath }  = req ;
                    debug.log(method.toUpperCase()+':'+url) ;
                    next();
                } ) ;            

            const rootDir = process.cwd();
            const dirs = config.static;
            objectSce.forEachSync(dirs, (dir,url)=>{
                const d = rootDir+'/'+dir;
                ctxt.app.use(url,ctxt.express.static(d))
                console.log("Serving static files "+url+" => "+d);            
            });        
        }
    }

    run(config, ctxt) {
        const port = this.getPort(this.config.port);
        let message = this.config.message || "Express Server run on port";
        message = message + " "+port;
        ctxt.app.listen(port, () => console.log(message));
    }

    // normalize port
    getPort(port) {
        port = this._normalizePort(port || process.env.PORT || 3000);
        return port;
    }

    _normalizePort(val) {
        const port = parseInt(val, 10);
      
        // NAMED PORT
        if (isNaN(port)) {
          return val;
        }
      
        // CUSTOM PORT
        if (port >= 0) {
          return port;
        }
      
        return false;
    }    
}

module.exports = new ExpressSce();