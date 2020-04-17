import {ObjUtil, PathUtil} from "./DBUtil";
import {eEvents, Ref} from "./Ref"
import TaskUtil from "../misc/TaskUtil";


//NOTE:
// - "container" contains all childs managed by Database
// - key starts with '_' will not be stringify

interface ContainerInterface {
    [key: string] : any
}

class _Database {

    static instance : any;

    private pathPrefix! : string;
    private container! : ContainerInterface;
    private rootRef! :  Ref;
    
    constructor() {

        if (_Database.instance) {
            return _Database.instance;
        } else {
            _Database.instance = this;
        }

        // bind event handlers
        this.__onChildChanged = this.__onChildChanged.bind(this);
        this.__updateContainerAndNotifyRefs = this.__updateContainerAndNotifyRefs.bind(this);
        this.readLocalStorage = this.readLocalStorage.bind(this);

        // root prefix
        this.pathPrefix = "root";

        // initialize root ref
        this.container = {}
        this.container[this.pathPrefix] = {}
        this.rootRef = new Ref(this.pathPrefix, this.container, this.pathPrefix);

        // listen to child changes at all distance
        // catch all events from child
        this.rootRef.on(eEvents.childUpdated, this.__onChildChanged, undefined, -1);

        this.readLocalStorage();

        return this;
    }
    
    __updateContainerAndNotifyRefs(rootPath : string, childPath : string, data : any) {

        if (rootPath === this.pathPrefix && childPath !== undefined) {

            this.container[rootPath][childPath] = data;

            let path = PathUtil.joinPath(rootPath, childPath);

            return Ref.notifyValueChanged(path, this.container);
        }

        return undefined
    }
    readLocalStorage() {

        let microTasks = [];
        let uniqueRefPaths : any = Ref.getUniqueRefPaths(2);

        //notify refs with data in localStorage, update container with new data
        for (let i = 0; i < localStorage.length; i++) {
            
            // grab data from local storage
            let path : string | null = localStorage.key(i);
            path = path !== null ? path : "";
            let splited = PathUtil.splitPath(path);

            if (splited.length === 2) {
                let strJSON : string | null = localStorage.getItem(path);
                strJSON = strJSON !== null ? strJSON : "";
                let data = JSON.parse(strJSON);

                microTasks.push(this.__updateContainerAndNotifyRefs(splited[0], splited[1], data));

                //mark that path as updated
                uniqueRefPaths[path] = false;
            }
        }

        //notify refs no longer in localStorage, update container at those paths to undefined
        for (let path in uniqueRefPaths) {

            if (uniqueRefPaths[path]) {
                
                let splited = PathUtil.splitPath(path);

                if (splited.length === 2) {
                    microTasks.push(this.__updateContainerAndNotifyRefs(splited[0], splited[1], undefined));
                }
            }
        }

        return Promise.all(microTasks);
    }
    clearLocalStorage() {
        localStorage.clear();
    }
    __onChildChanged(eventData : any) {
        console.log(eventData);

        let keyArr = PathUtil.splitPath(eventData.path);

        // get child path, immediate to root
        let childPath = PathUtil.joinPath(keyArr[0], keyArr[1]);

        // retrieve child obj to be serialize from container
        let {child} = ObjUtil.getChildAndParent(childPath, this.container);
        
        // queue a task
        TaskUtil.queueTask( () => {
            //set or remove
            if (child) {
                localStorage.setItem(childPath, JSON.stringify(child));
            } else {
                localStorage.removeItem(childPath);
            }
        });
    }

   
    convertPath(path : string) {
        
        return PathUtil.joinPath(this.pathPrefix, path)

    }


    onRootChange(rootObj : any) {

    }
    onRefUpdate(rootObj : any) {
        //write change to server

        //write change to local db
    }
    
    pathExists(path : string) {

        return ObjUtil.pathExists(this.convertPath(path), this.container);

    }

    //Expected behavior:
    // 1. path doesn't exists in object -> throw exception
    // 2. return existing ref - handled by Ref
    // 3. create new ref - handled by Ref 
    ref(path : string) : Ref { 

        path = this.convertPath(path);

        let {parent, childKey} = ObjUtil.getChildAndParent(path, this.container);

        if (childKey === undefined) {
            throw new Error("Key isn't found - " + path);
        }
        
        return new Ref(path, parent, childKey);

    }
    

}

const Database = new _Database();

export default Database;