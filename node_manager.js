const _debug = require("@nxn/debug");

const debug = _debug("NODE MANAGER");

let nodes = [];
let _id = 0;
class NodeManager
{
    constructor() 
    {
        this.nodes = [];
        this.components = {};
    }

    getNewId() {
        return _id++;
    }

    addNode(node) {
        this.components[node.id()]=node;
        this.nodes.push(node);
        return nodes.length-1;
    }

    invalidParam(p) {
        throw new Error("missing configuration attribute "+p);
    }

    getComponentById(id) {
        id = id.trim();
        if(this.components[id] && this.components[id].comp)
            return this.components[id].comp;

        if(process['services'] && process['services'][id])
            return process['services'][id];

        if(process['nodes'] && process['nodes'][id])
            return process['nodes'][id];

        return null;
    }

    loadComponents(components,idParent='node',defaultApp='shared',fun="init") {
        components.forEach(
            (compConf,idx) => 
                        {
                let id = compConf.id || idParent+'_'+this.getNewId();
                compConf.id = id;
                if(!compConf.comp)
                compConf.comp = this.loadComponent(compConf,defaultApp,fun) ;
        });
    }

    loadComponent(compConf,defaultApp='shared',fun="init") {
        if(compConf.comp)
            return compConf.comp;

        let id = compConf.id;
        let comp = this.getComponentById(id);
        if(comp)
            return this.components;

        let path = compConf.path;
        let app = null;
        if(!path) {
            let aId = id.split('@');
            app = aId.length>1 ? aId[1] : defaultApp;
            path = `applications/${app}/nodes/${id}.node`;
    }

        if(!path)
            return this.invalidParam('path or id');
        
        if(path.startsWith('applications'))
            comp = require(process.cwd()+'/'+path);
        else
            comp = require(path);

        // if it is a factory, get instance instead
        if(! (comp[fun] || comp.prototype && comp.prototype[fun]) && comp.getInstance)
            // create instance and init
            comp = comp.getInstance(id);

        this._registerComponent(id,'node',comp,path,compConf);
        return comp;
        }

    _registerComponent(id,type,comp,path,confComp) {
        if(!process[type])
            process[type]= {};
        
        process[type][id] = comp;
        if(!confComp.path)
            confComp.path = path;

        this.components[id] = {comp,path,confComp};
    }

    async initComponent(compConf,type='node',fun="init") {
        let self = this;
        let id = compConf.id;
        let path = compConf.path;

        // external policy defined as module/class in ../policies/
        try {
            // await fs.promises.access(path+'.js');
            debug.log('loading '+ type +' "'+id+'" : '+path);

            // require component or reuse
            let comp = compConf.comp;
            const injections = this.getInjections(compConf);
            
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
        
            
    // ============= INJECTIONS ================
            
    getInjections(compConf) {

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
    
    _getInjectionsInString(inj) {
        let injections=[];

        inj.toLowerCase().split(',').forEach(id => {
            const comp = this.getComponentById(id);
            if(comp)
                injections.push(comp);
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
}

module.exports = new NodeManager();