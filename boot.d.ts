declare module '@nxn_boot' 
{
    export interface NxnComponent 
    {
        /**
         * 
         * @param config 
         * @param ctxt 
         * @param injections 
         */
        init(
            config:Record<string,any>,
            ctxt : {express,app},
            injections: NxnComponent[]
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
            isMultiple) : NxnComponent;

        /**
         * get injections, by name or else, get all injections
         * 
         * @param inj name of injection
         * @param isMultiple : is it a single injection or an array 
         */
        getInjections(
            inj : string,
            isMultiple : boolean);
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
            nodes : NxnComponent[]);

        
        /**
         * send a message to other nodes in async mode.
         * useful for sending messages in async await, so in sequential mode,
         * because it awaits each message before sending another one.
         * 
         * @param message : message to send
         * @param nodes : optional list of nodes, a
         * @returns {Promise<void>}
         */
        sendMessageAsync(message,nodes);

        /**
         * process a message received from another node.
         * 
         * @param message 
         * @returns {Promise<void>}
         */
        processMessage(message: IFlowNodeMessage) : Promise<void>;
    }

    import { Express } from 'express';

    interface ComponentConfig {
      [key: string]: any;
    }
    
    export default interface BootSce 
    {   
        /**
         * Set the environment name.
         * @param env - The environment name.
         */
        setEnv(env: string): void;

        /**
         * Run the BootSce with the specified configurations.
         * @param path - The path for configurations.
         * @param dirPaths - Array of directory paths.
         * @param app - Express app instance.
         * @param express - Express module.
         * @param withModuleAlias - Flag indicating whether to use module alias.
         * @returns Promise<void>
         */
        run(path: string, dirPaths: string[], app: Express | null, express: any, withModuleAlias?: boolean): Promise<void>;

        /**
         * Run the BootSce with a pre-loaded configuration.
         * @param config - The pre-loaded configuration.
         * @param app - Express app instance.
         * @param express - Express module.
         * @param withModuleAlias - Flag indicating whether to use module alias.
         */
        runConfig(config: any, app: Express | null, express: any, withModuleAlias?: boolean): void;

        /**
         * Load the configuration from files.
         * @param path - The path for configurations.
         * @param dirPaths - Array of directory paths.
         * @param env - The environment name.
         */
        loadConfig(path: string, dirPaths: string[], env: string): void;

        /**
         * Initialize all components, services, nodes, and routes.
         * @param app - Express app instance.
         * @param express - Express module.
         * @param withModuleAlias - Flag indicating whether to use module alias.
         * @returns Promise<void>
         */
        initAll(app: Express | null, express: any, withModuleAlias?: boolean): Promise<void>;

        /**
         * Initialize security policies.
         * @param policies - Comma-separated list of policies.
         * @returns Record<string, any>
         */
        initPolicies(policies?: string): Record<string, any>;

        /**
         * Initialize services.
         * @param policies - Comma-separated list of services.
         * @returns Promise<Record<string, any>>
         */
        initServices(policies?: string): Promise<Record<string, any>>;

        /**
         * Initialize nodes.
         * @param policies - Comma-separated list of nodes.
         * @returns Promise<Record<string, any>>
         */
        initNodes(policies?: string): Promise<Record<string, any>>;

        /**
         * Execute tests.
         * @param tests - Comma-separated list of tests.
         */
        execTests(tests?: string): void;

        /**
         * Execute run functions.
         * @param run - Comma-separated list of run functions.
         */
        execRun(run?: string): void;

        /**
         * Initialize modules based on the provided type.
         * @param policies - Comma-separated list of modules.
         * @param type - Type of modules (e.g., service, node, run).
         * @param section - Section for configuration.
         * @param fun - Function name to execute.
         * @returns Promise<Record<string, any>>
         */
        initModules(policies: string, type: string, section: string, fun?: string): Promise<Record<string, any>>;

        /**
         * Reorder dependencies.
         * @param aPolicies - List of policies.
         * @param comps - Record of components.
         * @param section - Section for configuration.
         * @returns Array of ordered policies.
         */
        reorderDeps(aPolicies: string[], comps: Record<string, { conf: ComponentConfig; path: string; comp: any }>, section: string): string[];

        /**
         * List missing injections.
         * @param aPolicies - List of policies.
         * @param comps - Record of components.
         */
        listMissingInjs(aPolicies: string[], comps: Record<string, { conf: ComponentConfig; path: string; comp: any }>): void;

        /**
         * Initialize routes.
         * @param policies - Comma-separated list of routes.
         * @returns Record<string, any>
         */
        initRoutes(policies?: string): Record<string, any>;

        /**
         * Get a component by ID.
         * @param id - Component ID.
         * @returns The component instance.
         */
        getComponent(id: string): any;

        /**
         * Show all routes.
         * @returns Array of route information.
         */
        showAllRoutes(): Record<string, any>[];

        /**
         * Show routes for a given router.
         * @param router - Express router instance.
         * @returns Array of route paths.
         */
        showRoutes(router: any): string[];
    }
}