const express = require("express");
const app = express();

class ExpressSce {

    init(config,ctxt)
    {
        this.config = config;

        ctxt.express = express;
        ctxt.app = app;
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