const config = require('@nxn/config');

const fs = require('fs');
/*
var requireRoot = require('rfr');
requireRoot.setRoot(process.cwd());
*/

// const debug = require("./debug.service")("BOOT");
let debug= console;

class bootSce 
{
    constructor() {
        this.app = null;
        this.config = {};
        this.bootDir = '';
        this.ctxt = {};
        this.policies={};
        this.components={};
    }

    runConfig(path,dirPaths,app=null,express=null,withModuleAlias=true)
    {
        this.loadConfig(path,dirPaths);

        this.initAll(app,express,withModuleAlias);
    }

    loadConfig(path,dirPaths) {
        this.ctxt.config = this.config = config.loadConfig(path,dirPaths);
    }

    initAll(app,express,withModuleAlias) {
        if(express)
            this.ctxt.express = express;

        if(app)
            this.ctxt.app = app;
        
        // use module alias if needed
        if(!(withModuleAlias===false))
            require('module-alias/register');

        // security middleware
        this.initPolicies();

        debug=require("@nxn/debug")("BOOT");

        // init services
        this.initServices();

        // prepare routes
        this.initRoutes();

        // exec tests
        this.execTests();

        this.execRun() 
    }

    initPolicies(policies) { 
        let self = this;
        const section = 'middleware';
        const ENV_DIR = section+'_DIR';

        if(!self.config[section])
            self.config[section] = {};

        const configSection = self.config[section];

        if(!configSection["configuration"])
            configSection["configuration"] = {};
        const configComponents = configSection["configuration"];

        if(!policies)
            policies = self.config[section].load || '';

        if(!policies)
            return {};

        let defaultComponentPath = this._getDefaultComponentPath(section,ENV_DIR);

        const aPolicies = self._getActiveComponents(policies,section,section,'*');
        process[section] = {};
        aPolicies.forEach(id => {
            let conf = self._getComponentConfig(id,configComponents);
            let path = self._getComponentPath(id,conf,defaultComponentPath);
            self._initComponent(id,path,conf,"policy",section);
        });

        return process[section];
    }

    initServices(policies) { 
        return this.initModules(policies,'service','services','init');
    }

    execTests(tests) { 
        return this.initModules(tests,'test','tests');
    }

    execRun(run) { 
        return this.initModules(run,'run','run','run');
    }

    initModules(policies,type,section,fun="init") { 
        // default values
        type = type || 'module';
        section = section || type+'s';

        let self = this;

        const ENV_DIR = section+'_DIR';

        if(!self.config[section])
            self.config[section] = {};
        const configSection = self.config[section];

        if(!configSection["configuration"])
            configSection["configuration"] = {};
        const configComponents = configSection["configuration"];

        // rewrite config keys in lower case
        let configComponentsLower = {};
        let keys = Object.keys(configComponents);
        keys.forEach(k=>{ configComponentsLower[k.toLowerCase()] = configComponents[k]; });

        if(!policies)
            policies = self.config[section].run || self.config[section].load || '';

        if(!policies)
            return {};

        let defaultComponentPath = this._getDefaultComponentPath(section,ENV_DIR);

        const aPolicies = self._getActiveComponents(policies,section,section,'*');
        process[section] = {};
        aPolicies.forEach(id => {
            let conf = self._getComponentConfig(id,configComponentsLower);
            let path = self._getComponentPath(id,conf,defaultComponentPath);
            self._initComponent(id,path,conf,type,section,fun);
        });

        return process[section];
    }

    initRoutes(policies) { 
        let self = this;
        const section = 'routes';
        const ENV_DIR = section+'_DIR';

        if(!self.config[section])
            self.config[section] = {};
        const configSection = self.config[section];

        if(!configSection["configuration"])
            configSection["configuration"] = {};
        const configComponents = configSection["configuration"];

        if(!policies)
            policies = self.config[section].load || '';

        if(!policies)
            return {};

        let defaultComponentPath = this._getDefaultComponentPath(section,ENV_DIR);

        const aPolicies = self._getActiveComponents(policies,section,section,'*');
        process[section] = {};
        aPolicies.forEach(id => {
            let conf = self._getComponentConfig(id,configComponents);
            let path = self._getComponentPath(id,conf,defaultComponentPath);
            self._initRoute(id,path,conf,"route",section);
        });

        return process[section];
    }

    _getActiveComponents(vals,section,env,defaultVal) {
        const csv = vals || process.env[env.toUpperCase()] || defaultVal || '*';

        if(csv == '*')
        {
            let keys = Object.keys(section);
            let filtered = keys.filter(function(value, index, arr){

                return value != 'default_path';
            
            });

            csv = filtered.join(',');
        }

        return csv.toLowerCase().trim().split(',');
    }

    _getComponentPath(id,compConfig,defaultPath) {
        let path;

        if(compConfig['path'])
            path = this.bootDir+compConfig['path'];

        else if(defaultPath) {
            path = defaultPath;
        }
        else
            path = this.bootDir+'$id';

        path = path.replace(/\$id/g,id).replace("//","/");

        return path;
    }

    _getComponentConfig(id,config) {
        if(config[id])
        {
            this.policies[id] = config[id];
            return config[id];
        }

        if(this.policies[id])
            return this.policies[id];

        return {};
    }

    _getDefaultComponentPath(section,env)
    {
        let path;

        env = env.toUpperCase();

        if(process.env[env])
            path = this.bootDir+process.env[env];

        else if(this.config[section] && this.config[section].defaultPath)
            path = this.bootDir+this.config[section].defaultPath;
        else
            path = "../"+section+"/";

        path = path.trim();
        
        if(path.indexOf('$id')==-1) {
            if(path[path.length-1] != '/')
                path += '/';

            path += "$id";
        }

        return path;
    }

    _registerComponent(id,type,comp,path) {
        process[type][id] = comp;
        this.components[id] = {comp,path};
    }

    async _initComponent(id,path,compConf,type,section,fun="init") {
        let self = this;

        if(!type)
            type = 'component';

        // external policy defined as module/class in ../policies/
        try {
            // await fs.promises.access(path+'.js');
            debug.log('loading '+ type +' : '+path);

            // require component or reuse
            let comp;
            if(this.components[id]) {
                comp = this.components[id].comp;
                path = this.components[id].path;
            }
            else
            {
                if(path.startsWith('applications'))
                    //comp = requireRoot(path);
                    comp = require(process.cwd()+'/'+path);
                else
                    comp = require(path);
            }
            
            let res;
            if(comp[fun])
            {
                res = comp[fun](compConf,self.ctxt);
            }
            else if(comp.prototype[fun])
            {
                res = comp.prototype[fun](compConf,self.ctxt);
            }

            // registers to global process
            self._registerComponent(id,section,comp,path);

            // if async, wait for the end of the service
            if(res && res.then)
                await res;

            debug.log('Policy loaded: '+path);
            return true;
        } 
        catch(err) {
            debug.error('Error loading compnent : '+path+' '+(err.stack||err));
            return false;
        }
    }

    async _initRoute(id,path,compConf,type,section) {
        let self = this;

        if(!self.ctxt.app)
        {
            self.ctxt.express = require("express");
            self.ctxt.app = self.ctxt.express();
        }

        if(!type)
            type = 'component';

        // external policy defined as module/class in ../policies/
        try {
            // await fs.promises.access(path+'.js');
            debug.log('loading route '+ type +' : '+path);

            if(compConf['url'])
            {
                const route = require(path);
                self.ctxt.app.use(compConf['url'],route);

                // registers to global process
                self._registerComponent(id,section,route);

                debug.log('Endpoint route loaded: '+compConf['url']+' -> '+path);
                return true;
            }
            else {
                debug.log('Route NOT loaded: '+id+' , no endpoint URL ');
            }
        } 
        catch(err) {
            debug.error('Error loading route : '+id+' '+err.stack);
            return false;
        }
    }
}

module.exports = new bootSce();