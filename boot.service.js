const configSce = require('@nxn/config');
const fs = require('fs');
const envSce = require("./middleware/env");

/*
var requireRoot = require('rfr');
requireRoot.setRoot(process.cwd());
*/

const {objectSce,arraySce} = require("@nxn/ext");


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
        this.configImports = [];

        envSce.init();
    }

    // set env name that is initially replaced in config files before parsing the file yml, json
    setEnv(env) {
        this.env = env;
    }

    async run(path,dirPaths,app=null,express=null,withModuleAlias=true)
    {
        try 
        {
            // this.loadConfig(path,dirPaths,this.env||process.env.NODE_ENV);
            let config = configSce.loadConfig(path,dirPaths,process.env);

            this.ctxt.config = this.config = config;
            await this.initAll(app,express,withModuleAlias);
        }
        catch(error)
        {
            debug.error(error.message || error);
            throw error;
        }
    }

    runConfig(config,app=null,express=null,withModuleAlias=true) {
        this.ctxt.config = this.config = config;
        this.initAll(app,express,withModuleAlias);
    }

    loadConfig(path,dirPaths,env) {
        this.ctxt.config = this.config = configSce.loadConfig(path,dirPaths);

        // apply variables if any
        if(this.config.variables && this.config.variables.path)
        configSce.applyVariables(this.config, this.config.variables.path);
    }

    async initAll(app,express,withModuleAlias) {
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
        await this.initServices();

        // init services
        await this.initNodes();

        // prepare routes
        await this.initRoutes();

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

        const aPolicies = self._getActiveComponents(policies,section,section,'*',configComponents);
        debug.log("========== LOADING "+section+" : "+aPolicies.join(','));
        
        process[section] = {};
        let comps={};
        aPolicies.forEach(id => {
            let conf = self._getComponentConfig(id,configComponents);
            let path = self._getComponentPath(id,conf,defaultComponentPath,section);

            const comp = self._loadComponent(id,path,conf,"middleware",section);
            comps[id]={conf,path,comp};
        });

        // const aPolicies2 = this.reorderDeps(aPolicies,comps);
        const aPolicies2 = aPolicies;

        aPolicies2.forEach(id => {
            const {conf,path} = comps[id];
            self._initComponent(id,path,conf,"policy",section);
        });

        return process[section];
    }

    reorderDeps(aPolicies) {
        return aPolicies;
    }

    async initServices(policies) { 
        return await this.initModules(policies,'service','services','init');
    }

    async initNodes(policies) { 
        return await this.initModules(policies,'node','nodes','init');
    }

    execTests(tests) {
        if(process.env.TESTS && process.env.TESTS=="true")
            return this.initModules(tests,'test','tests');
    }

    execRun(run) { 
        return this.initModules(run,'run','run','run');
    }

    async initModules(policies,type,section,fun="init") { 
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
            policies = self.config[section].run || self.config[section].load || '*';

        if(!policies || policies=="none")
            return {};

        let defaultComponentPath = this._getDefaultComponentPath(section,ENV_DIR);

        let aPolicies = self._getActiveComponents(policies,section,section,'*',configComponentsLower);
        if(aPolicies.length==0)
            return;

        debug.log("========== LOADING "+section+" : "+aPolicies.join(','));

        process[section] = {};
        let comps={};
        arraySce.forEachSync(aPolicies, id => {
            let conf = self._getComponentConfig(id,configComponentsLower);
            let path = self._getComponentPath(id,conf,defaultComponentPath,section,type);
            const comp = self._loadComponent(id,path,conf,type,section,fun);
            comps[id]={conf,path,comp};
        });

        if(section == "services" || section == "nodes")
            aPolicies = this.reorderDeps(aPolicies,comps,section);

        await arraySce.forEachAsync(aPolicies, async id => {
            const {conf,path} = comps[id];
            await self._initComponent(id,path,conf,type,section,fun);
        });

        return process[section];
    }

    _listChildrenInj(inject) {
        let aInject=[];
        if(typeof inject == 'array')
            aInject = inject.join(",").toLowerCase().trim().split(',');
        else if(typeof inject == 'object')
        {
            objectSce.forEachSync(inject,v=> {
                if(typeof v == 'string')
                    aInject.push(v);
                else
                {
                    let aSubInj = this._listChildrenInj(v);
                    aInject = [...aInject,...aSubInj];
                }
            });
            aInject = aInject.join(',').toLowerCase().split(',');
        }
        else
            aInject=inject.toLowerCase().trim().split(',');

        return aInject;
    }

    // topological order : put in basket all components that have :
    // no injection, or all injections already in ordered basket.
    // detects cyclic injections.
    reorderDeps(aPolicies,comps,section) {
        let aSorted=[]; // ordered array
        let sorted={}; // check if in order array
        let unsorted=[];
        const n = aPolicies.length;
        let limit = n*2; // limit in case of cyclic dep
        while(aPolicies.length && limit--)
        {
            unsorted=[];
            for(let i=0;i<aPolicies.length;i++)
            {
                const id = aPolicies[i];
                const conf = comps[id].conf;
                const comp = comps[id].comp;
                const inject = (conf.injections||'');
                if(!inject) 
                    {
                    // no injection 
                    sorted[id]=true;
                    aSorted.push(id);
                    aPolicies.splice(i,1);
                    }
                    else
                {
                    let aInject=this._listChildrenInj(inject);
                    
                    let injSorted=true;
                    aInject.forEach(ij=>{
                        if(!sorted[ij] && !comp.__init)
                        {
                            if(section == "nodes")
                            {
                                // try getting injection from services
                                let comp2 = this.getComponent(ij);
                                if(!comp2 || !comp2.__init)
                                {
                                    injSorted=false; // deps not yet in sorted => fails this time
                                    unsorted.push(ij);    
                                }    
                            }
                            else 
                            {
                                injSorted=false; // deps not yet in sorted => fails this time
                                unsorted.push(ij);    
                            }
                        }
                    });
                    
                    if(injSorted)
                    {
                        // all injections already in ordered array => ok
                        sorted[id]=true;
                        aSorted.push(id);
                        aPolicies.splice(i,1); 
                    }
                }
            }
        }

        for (let i=0;i<aPolicies.length;i++)
        {
            const id = aPolicies[i];
            let comp = this.getComponent(id);
            if(comp)
            {
                aPolicies.splice(i,1);
            }
        }

        if(limit<=0 && aPolicies.length)
        {
            const fails = aPolicies.join(',');
            const missing = unsorted.join(',');
            this.listMissingInjs(aPolicies,comps);
            throw new Error("Cyclic or missing injection not allowed, check injections for : "+fails+" missing = "+missing);
        }

        return aSorted;
    }

    listMissingInjs(aPolicies,comps)
    {
        const n = aPolicies.length;
        for(let i=0;i<aPolicies.length;i++)
        {
            const id = aPolicies[i];
            const conf = comps[id].conf;
            const comp = comps[id].comp;
            const inject = (conf.injections||'');
            let missing={id,injections:{},unknown:{}};
            if(inject) 
            {
                let aInject=this._listChildrenInj(inject);
                aInject.forEach(ij=>{
                    let comp2 = this.getComponent(ij);
                    if(comp2)
                    {
                        if(!comp2.__init)
                        {
                            missing.injections[ij]={id:ij, loaded:true, init:false};
                        }
                    }
                    else
                    {
                        console.error("unknown injection "+ij);
                        missing.unknown[ij]={id:ij, loaded:false};
                    }
                });
            }
            console.error("Cant load comp",missing);
        }      
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

        const aPolicies = self._getActiveComponents(policies,section,section,'*',configComponents);
        debug.log("========== LOADING "+section+" : "+aPolicies.join(','));

        process[section] = {};
        aPolicies.forEach(id => {
            let conf = self._getComponentConfig(id,configComponents);
            let path = self._getComponentPath(id,conf,defaultComponentPath,section,'route');
            self._initRoute(id,path,conf,"route",section);
        });

        debug.log('ALL ROUTES loaded: ',this.showAllRoutes());

        return process[section];
    }

    _getActiveComponents(vals,section,env,defaultVal,components) {
        let csv = vals || process.env[env.toUpperCase()] || defaultVal || '*';

        if(csv == '*' || csv == 'all' || (csv.startsWith && csv.startsWith("all ")))
        {
            for(const c in components)
                if(components[c].active===false)
                    delete components[c];

            let keys = Object.keys(components);
            if(keys.length==0)
                return [];
                
            let filtered = keys.filter(function(value, index, arr){

                return value != 'default_path';
            
            });

            csv = filtered.join(',');
        }

        if(!csv.toLowerCase)
            return [];

        return csv.toLowerCase().trim().split(',') || [];
    }

    _getComponentPath(id,compConfig,defaultPath,section,type) {
        let path;

        if(compConfig['path'])
            path = this.bootDir+compConfig['path'];

        else if(compConfig['upath']) {
            const upath = compConfig['upath'];
            let aId = upath.split('@');
            const app = aId.length>1 ? aId[1] : null;
            if(app) {
                const id2 = aId[0];
                const aId2 = id2.split('.');
                section = aId2.length>1 ? aId2[1]+"s" : section;

                path = `applications/${app}/${section}/${id2}`;
                if(type && (upath.indexOf('.')==-1))
                    path += "."+type;       
            }
        }
    
        if(!path)
            if(defaultPath) {
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
            if(!config[id].id)
                config[id].id = id;
                
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

    _registerComponent(id,type,comp,path,confComp) {
        process[type][id] = comp;
        this.components[id] = {comp,path,confComp};
    }

    _requireComp(id,path,compConf) {

        // require component or reuse
        let comp;
        // get previously loaded service if same path or no path
        if(this.components[id] && (!compConf.path || this.components[id].path==compConf.path)) {
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

            // this.components[id] = {comp,path,compConf};
        }

        return comp;
    }

    getComponent(id) {
        id = id.trim();
        if(this.components[id] && this.components[id].comp)
            return this.components[id].comp;

        return null;
    }

    _getInjectionsInString(inj) {
        let injections=[];
        
        inj.toLowerCase().split(',').forEach(id => {
                    id = id.trim();
                    if(this.components[id] && this.components[id].comp)
                        injections.push(this.components[id].comp);
                    else
                        {
                            debug.error("trying to inject unintialised service "+id);
                            throw new Error("Injection Error unknown service "+id);
                        }
        });

        return injections;
    }


    _getInjectionsInObj(inj) {
        let injections = {};
        
        objectSce.forEachSync(inj,(id,key)=>{
            if(typeof id=="string")
                injections[key]=this._getInjectionsInString(id);
            else if(typeof id=="object")
                injections[key]=this._getInjectionsInObj(id);
        });

        return injections;       
    }

    _getInjections(compConf) {

        let injections=[];
        if(compConf.injections)
        {
            if(typeof compConf.injections=="string")
                injections = this._getInjectionsInString(compConf.injections);
            else if(typeof compConf.injections=="object")
                    injections.push(this._getInjectionsInObj(compConf.injections));
        }

        return injections;
    }

    async _initComponent(id,path,compConf,type,section,fun="init") {
        let self = this;

        if(!type)
            type = 'component';

        // external policy defined as module/class in ../policies/
        try {
            // await fs.promises.access(path+'.js');
            debug.log('loading '+ type +' "'+id+'" : '+path);

            // require component or reuse
            let comp = this._requireComp(id,path,compConf);
            const injections = this._getInjections(compConf);
            
            let res;
            if(comp[fun])
            {
                res = comp[fun](compConf,self.ctxt,...injections);
            }
            else if(comp.prototype && comp.prototype[fun])
            {
                res = comp.prototype[fun](compConf,self.ctxt,...injections);
            }
            /*
            // not init function but getInstance => factory
            else { 
                if(comp.getInstance)
                {
                    // create instance and init
                    comp = comp.getInstance(id);

                    if(comp[fun])
                    {
                        res = comp[fun](compConf,self.ctxt,...injections);
                    }
            else if(comp.prototype[fun])
            {
                res = comp.prototype[fun](compConf,self.ctxt,...injections);
            }
                }
            }
            */

            comp.__init=true;

            // if async, wait for the end of the service
            if(res && res.then)
                await res;

            debug.log(type +' initialised: "'+id);
            return true;
        } 
        catch(err) {
            debug.error('Error init component "'+id+'" : '+path+' '+(err.stack||err));
            throw err;
        }
    }
        
    _loadComponent(id,path,compConf,type,section,fun="init") {
        let self = this;

        if(!type)
            type = 'component';

        // external policy defined as module/class in ../policies/
        try {
            // await fs.promises.access(path+'.js');
            debug.log('required '+ type +' "'+id+'" : '+path);

            // require component or reuse
            let comp = this._requireComp(id,path,compConf);
            
            if(! (comp[fun] || comp.prototype && comp.prototype[fun]) && comp.getInstance)
                // create instance and init
                comp = comp.getInstance(id);
            
            // registers to global process
            self._registerComponent(id,section,comp,path,compConf);

            // debug.log(type +' required: "'+id+'"');
            return comp;
        } 
        catch(err) {
            debug.error('Error loading component : '+path+' '+(err.stack||err));
            throw err;
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
            debug.log('LOADING ROUTE "'+id+'"'+ type +' : '+path);

            if(compConf['url'])
            {
                let comp = this._requireComp(id,path,compConf);
                const injections = this._getInjections(compConf);

                let router;

                if(comp.post || comp.get)
                    // simple router
                    router = comp;
                else
                {
                    // service : route
                    if(comp.init || (comp.prototype && comp.prototype.init))
                        router = comp.init(compConf,self.ctxt.express,...injections);				
                    else if(comp.getInstance)
                    {
                        // factory : route

                        // create instance and init
                        comp = comp.getInstance(id);
                        if(comp.init || comp.prototype.init)
					router = comp.init(compConf,self.ctxt.express,...injections);				
				else
					router = comp;
                    }
                }

                if(!router)
                    throw new Error("Unknow route "+id);

                self.ctxt.app.use(compConf['url'],router);

                // registers to global process
                self._registerComponent(id,section,comp,path);

                debug.log('ROUTE loaded: '+compConf['url']+' -> '+path,this.showRoutes(router));
    
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

    showAllRoutes() 
    {
        let _routesInfos = [];
        this.ctxt.app._router.stack
        .filter(layer => layer.handle.stack)
        .forEach(layer1 => {
            let routes = [];
            layer1.handle.stack.forEach(layer => {
                const r = layer.route;
                routes.push(Object.keys(r.methods).join(",")+" : " +r.path);
            })
            _routesInfos.push({regexp:layer1.regexp, name:layer1.name, routes});
        });
        
        return _routesInfos;
    }

    showRoutes(router) 
    {
        var route, routes = [];

        if(router && router.stack)
            router.stack.forEach(function(middleware)
            {
                if(middleware.route){ // routes registered directly on the app
                    routes.push(middleware.route);
                } else if(middleware.name === 'router'){ // router middleware 
                    middleware.handle.stack.forEach(function(handler){
                        route = handler.route;
                        route && routes.push(route);
                    });
                }
            });

        routes = routes.map(r => Object.keys(r.methods).join(",")+" : " +r.path);
        return routes;     
    }
}

module.exports = new bootSce();