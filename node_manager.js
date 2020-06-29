const _debug = require("@nxn/debug");

const debug = _debug("NODE MANAGER");

let nodes = [];
class NodeManager
{
    constructor() 
    {
        this.nodes = [];
        this.components = {};
    }

    addNode(node) {
        this.nodes.push(node);
        return nodes.length-1;
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
            injections[key]=this._getInjectionsInString(id);
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
    _registerComponent(id,type,comp,path,confComp) {
        process[type][id] = comp;
        this.components[id] = {comp,path,confComp};
    }
}

module.exports = new NodeManager();