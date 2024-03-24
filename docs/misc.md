## 03/02/2024 added components in config

it is now possible to create a sub config file with services, routes etc.

can then be loaded in "components" section
ex.
```yaml

components:
  load: all

  configuration:
    # components : include services, routes, tests
    glabels: $ref(/applications/googleapi/config/glabel.component) # labels
    gbuckets: $ref(/applications/googleapi/config/gbuckets.component) # buckets

```

with : /applications/googleapi/config/glabel.component.yml 

```yaml

# google labels component : service and test suite

services:
  glabels:
    upath: glabels@googleapi
    labels:
      confidentiality:
        #match: "DLP"
        enums: 
          confidential: "(confidential|secret)"
          internal: "(intern[ae])"
          public: "Public"
tests:
  glabel_test:
    upath: glabels@googleapi
    token: ${{TEST_TOKEN||""}}
    injections:
      glabels: glabels
```
and:

/applications/googleapi/config/gbuckets.component.yml

```yaml
  
  # filestore buckets component : service and test suite

services:
  # filestore buckets service
  gbuckets:
    upath: gbuckets@googleapi
    conPath: .filestore
    bucket_name: "pdoc_file_revisions_${GED_CLIENT_ID}"
    secret_id: "gbuckets-${SECRET_SUFFIX_FIRESTORE}" # ex. gbuckets-env
    injections:
        secrets: googleSecretsYAML

tests:
  gbuckets_tests:
    upath: gbuckets@googleapi
    token: ${{TEST_TOKEN||""}}
    injections:
      gbuckets: gbuckets # use service account for storage
```

module configs are simply added to main config by sections.

## Test suite

Here is an example of a test.

A test is basically like a service. It gets ijected resources to test, and
runs at startup. It uses "assert" to check if everything runs as expected.

```js
var assert = require('assert');
const {bootSce} = require("@nxn/boot");

const FlowNode = require("@nxn/boot/node");
const debug = require("@nxn/debug")('TEST GGROUPS');

class Tests extends FlowNode
{
    constructor() {
        super();
    }

    init(config,ctxt,...injections)
    {
        super.init(config,ctxt,injections);

        /** @type {import('../services/gbuckets.service').GBucketInstance} */
        this.gbuckets = 
            this.getInjection('gbuckets'); // get injection
        
        if(!(config.active === false))
            this.run();
    }

    async run() 
    {
        try 
        {
            // await for services init to finish
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // init tests data
            let gbuckets = this.gbuckets;

            /** @type {import('../types/types').gUser} */
            let user = {email:"franck@presencemedia.ma", gToken:null};

            // search for groups starting with dev
            debug.log("test 0 : list files in buckets");   
            try 
            {
                assert.ok(gbuckets,"Bucket injection not valid");
                assert.ok(gbuckets,"Bucket name not set");
                debug.log("Bucket OK : name : "+gbuckets.bucketName);

                const files = await gbuckets.listFiles();
                console.log("Files",files);

                const filename = "TEST.txt";

                debug.log("Add file "+filename);
                let file = await gbuckets.writeFileData(filename,"simple test",{version:"1", revision:"1"});
                assert.ok(file,"file couldnt be added to bucket");

                const files2 = await gbuckets.listFiles();
                console.log("Files after adding "+filename,files2);

                assert.ok(await gbuckets.fileExists(filename),"Added file does not exist");

                await gbuckets.deleteFile(filename);

                assert.ok(!await gbuckets.fileExists(filename),"removed file still exists");

                debug.log("test  ok");
            } 
            catch (error) 
            {
                throw error;               
            }

            debug.log("ALL TESTS COMPLETED WITH SUCCESS!!");                
        } 
        catch (error) 
        {
            debug.log("TEST FAILURE :  exception "+error.message||error);
            throws error;  
        }    
    }
}

module.exports = new Tests()
```

## Managing injections

Injections are other services that have been initialised and can be used in a service, a route, a test, or a node.

Injections are declared in the configuration.

example:
```yml
    # database
    firestore:
      upath: firestore@googleapi
      conPath: .firestore
      # apply_client_id = coll_prefix | coll_suffix | none | db
      apply_client_id: coll_suffix

    # i8n locale
    gdrive_locale:
      path: "@nxn/db/locale.service"
      default: en
      langs:
        en: $ref(applications/drive_indexer/locales/en_gdrive.strings)

    # db model class : manage queries to the database. Abstracts the actual db and queries.
    gdrive_model:
      path: "@nxn/db/db_model.service"
      schema: $ref(applications/drive_indexer/models/gdrive.schema)
      injections:
        db: firestore
        locale: gdrive_locale

    # File service : manage gFile objects. It interacts with storage by using above db model
    gdrive_sce:
      upath: gdrive@drive_indexer
      injections:
        model: gdrive_model        
```

**gdrive_model** service uses **firestore** and **gdrive_locale** services as injections.

And **gdrive_sce** gets **gdrive_model** as injection.

### How are injections available in services

Injections and config parameters are provided to the objects declared with their init() function.

```js
/** my service description here */
class GFileSce extends FlowNode
{
    /**
     * DB model
     * @type {DbModel} */
    model;

    constructor(instName) {
        super(instName);
    }

    /** init the service with a config */
    async init(config,ctxt,...injections) {
        super.init(config,ctxt,injections); 

        /** get DB Model */
        this.model = this.getInjection('model');
    }
    ...
}

```
the **super.init()** function gets injections and organise them in the object.
The **GFileSce** service adds the **model** injection as a member variable, by using **getInjection()**.

```js
    /** get DB Model */
    this.model = this.getInjection('model');
```

NB. injections can be **AUTOMATICALLY added as member variables** if:
1) the local variable is **declared** in the class
2) the local variable has the **same name as the injection**
3) the variable is not yet defined (its **value must be undefined**)

The above example can then be rewritten without adding a getInjection() call in the init:

```js
/** my service description here */
class GFileSce extends FlowNode
{
    /**
     * DB model (automatically loaded from injection)
     * @type {DbModel} */
    model;

    constructor(instName) {
        super(instName);
    }

    /** init the service with a config */
    async init(config,ctxt,...injections) {
        super.init(config,ctxt,injections); 
    }
    ...
}

```
