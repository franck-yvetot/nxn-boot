declare module '@nxn_boot' 
{

    import { BootSce} from "../boot.service";
    export { BootSce };

    export interface NxnComponent 
    {
        /**
         * 
         * @param config 
         * @param ctxt 
         * @param injections 
         */
        init(
            config:Record<string,any> = null,
            ctxt : {express,app} = null,
            injections: NxnComponent[] = null
            );


        /** is component intialised and ready to be used as an injection */
        isInit() : boolean;

        /** name of the component, from the config.name, or use its id */
        name() : string;
    
        /** unique component id, automatically created by boot or from the config declaration */
        id() : string;
    
        /** named instance, useful when a node is created from a factory */
        instance() : string;
    }

    /** Interface of components that can receive injections */
    export interface InjectableComponent extends NxnComponent
    {
        /**
         * get injected component.
         * 
         * @param inj name of injection
         * @param isMultiple : is it a single injection or an array 
         */
        getInjection(
            inj : string,
            isMultiple=false) : NxnComponent;

        /**
         * get injections, by name or else, get all injections
         * 
         * @param inj name of injection
         * @param isMultiple : is it a single injection or an array 
         */
        getInjections(
            inj : string=null,
            isMultiple : boolean = false);
    }

    export interface IFlowNodeMessage 
    {
        name: string;
        data?: any
    }

    /**
     * nodes selection fpor
     */
    export type TNodesSelection = string | NxnComponent[] | NxnComponent;

    /** Interface of components that can receive injections */
    export interface IFlowNode extends InjectableComponent
    {
        registerReceivers(injections : Record<string, NxnComponent>);

        /**
         * send a message to other nodes.
         * Does not manage async messages, so do not wait for them to finish.
         * 
         * @param message : message to send
         * @param nodes : optional list of nodes, a
         */
        sendMessage(
            message : IFlowNodeMessage,
            nodes : NxnComponent[] = null);

        
        /**
         * send a message to other nodes in async mode.
         * useful for sending messages in async await, so in sequential mode,
         * because it awaits each message before sending another one.
         * 
         * @param message : message to send
         * @param nodes : optional list of nodes, a
         */
        async sendMessageAsync(message,nodes);

        /**
         * process a message received from another node.
         * 
         * @param message 
         */
        async processMessage(message: IFlowNodeMessage);
    }
}