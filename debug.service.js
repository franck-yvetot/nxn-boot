const debug = require("debug");
debug.log = console.info.bind(console);

let _config_ = {}

class DebugService
{
    constructor(cat) {
        this.cat = cat;
        this.debug = debug(this.cat);
    }

    init(config,ctxt) {
        if(config) 
            _config_ = config;
        else
            _config_ = process.env;

        debug.setup(_config_);
    }

    log(msg) {
        this.debug(msg);
    }
    error(msg) {
        this.debug("ERROR :" +msg);
    }
}

function factory(category)
{
    return new DebugService(category||"log");
}

factory.prototype.init = function(config,app,express) {
    if(config) 
        _config_ = config;
    else
        _config_ = process.env;

    if(_config_.DEBUG)
        debug.enable(_config_.DEBUG);
        
}

module.exports = factory;