
import {KeyUtil, ObjUtil, PathUtil} from "./DBUtil";
import TaskUtil from "../misc/TaskUtil";

import EventData from "./EventData";
import EventListener, { EvtListenerCallback } from "./EventListener";
import Database from "./Database";

export enum eEvents {
    remoteUpdate = "remoteUpdate",
    parentUpdate = "parentUpdate",
    value = "value",             //trigger once with the initial data at location, trigger each time data changes
    removed = "removed",         //trigger once removed
    childAdded = "childAdded",   //triggered once for each initial child at this location, and triggered again every time a new child is added      
    childRemoved = "childRemoved",
    childUpdated = "childUpdated",
    childMoved = "childMoved"
};

export type CtorInitData = {} | null;
export interface ObjConstructor {
    new (initData: CtorInitData) : {}
}

export class Ref {
    [propName: string] : any;
    static __internal : any;

    //private instance fields
    private __listeners : EventListener[];
    private parent : { [prop:string] : any};
    private path : string = "";
    private snapshotData : {} | undefined;
    private key : string = "";

    constructor(path : string, parent :{ [prop:string] : any}, key: string) {
        Ref.__initStaticInternal();
        
        path = PathUtil.trimPath(path);
        
        // init private fields
        this.path = path;
        this.snapshotData = ObjUtil.cloneObj(parent[key]);
        this.key = key;
        this.parent = parent;
        this.__listeners = [];

        // bind handlers
        this.__notifyParentRef = this.__notifyParentRef.bind(this);
        this.__notifyChildRef = this.__notifyChildRef.bind(this);
        this.__notifyListeners = this.__notifyListeners.bind(this);
        this.__updateSnapShot = this.__updateSnapShot.bind(this);

        // store instance in lookup
        if (Ref.__getRef(path) === undefined) {
            Ref.__setRef(path, this);
        }

        return Ref.__getRef(path);
    }

    // ==== Private Static Methods ====
    static __initStaticInternal() {
        // initialize singleton fields
        if (Ref.__internal === undefined) {
            Ref.__internal = {
                ref: {}
            }
        }
    }
    static __setRef(path : string, ref : Ref) {
         Ref.__internal.ref[path] = ref;
    }
    static __removeRef(path : string) {
        delete Ref.__internal.ref[path];
    }
    static __getRef(path : string)  {
        if (path in Ref.__internal.ref) {
            return Ref.__internal.ref[path];
        } else {
            return undefined;
        }
    }
    static __getRefPaths() {
        return Object.keys(Ref.__internal.ref);
    }

    // ==== Public Static Methods ====
    static notifyValueChanged(path : string, container : any) { 
        
        let ref = Ref.__getRef(path);

        if (ref) {
            return ref.valueChanged(container, true);
        }

        return TaskUtil.queueMicroTask();

    }
    static getUniqueRefPaths(level : number) {   //level - existing unique paths of level, e.g. level = 2, ["root/data1", ["root/data2"]

        level = level !== undefined && level > 0 ? level : -1;     //-1, get all unique paths
        let pathArr = Ref.__getRefPaths();
        let result : any = {};

        for (let i = 0; i < pathArr.length; i++) {
            if (level === -1) {
                result[pathArr[i]] = true;
            } else {
                let splited = PathUtil.splitPath(pathArr[i]);

                if (splited.length >= level) {
                    let resultPath = splited[0];
                    
                    for (let j = 1; j < level; j++) {
                        resultPath = PathUtil.joinPath(resultPath, splited[j])
                    }
                    result[resultPath] = true;
                }
            }
        }
        return result;
    }
    // ==== Private Helpers ====
    private __updateRef() {

        //Hacky! Ref shoudn't have to know about Database
        //Also, we are removing "root/" manually
        let newRef = Database.ref(this.path.replace("root/",""));

        Ref.__setRef(this.path, newRef);

        return newRef;

    }
    private __notifyParentRef(event : EventData) {
        
        let keys = PathUtil.splitPath(this.path);

        let microTasks = [];

        for (let i = keys.length - 1, distance = 0; i > 0; i--, distance++){

            let parentPath = keys.slice(0, i).join("/");
            let parentRef = Ref.__getRef(parentPath);
            
            if (parentRef) {
                let promise = TaskUtil.queueMicroTask(() => {
                        return parentRef.__notifyListeners(event, distance);
                });
                microTasks.push(promise);
            }

        }

        return Promise.all(microTasks);
    }
    private __notifyChildRef(event : EventData) {
        
        let refPaths = Ref.__getRefPaths();

        let microTasks = [];

        for (let i = 0; i < refPaths.length; i++) {
            let childPath = refPaths[i];

            if (childPath.startsWith(this.path)) {
                let childRef = Ref.__getRef(childPath) as Ref;
                
                if (childRef) {

                    let promise = TaskUtil.queueMicroTask(() => {

                        
                          --> need to update parent reference, child still points to old parent
                        
                        let newRef = childRef.__updateRef();
                        
                        let childData     = newRef.__get();               //attach child data to event object
                        let childSnapshot = newRef.__getSnapshot();
                        // newRef.__updateSnapShot();

                        event.childData = childData;
                        event.childDataSnapshot = childSnapshot;


                        return childRef.__notifyListeners(event);
                    });
                    microTasks.push(promise);
                }
            }
        }

        return Promise.all(microTasks);
    }
    private __notifyListeners(event : EventData, distance? : number) {
        
        return TaskUtil.queueMicroTask(()=>{
            distance = distance ? distance : 0;

            let microTasks = [];

            for (let j = 0; j < this.__listeners.length; j++) {

                let evtListener : EventListener = this.__listeners[j];
                
                if (evtListener.getEvent() === event.event && (evtListener.getDistance() > distance || evtListener.getDistance() === -1)) {
                    let promise = TaskUtil.queueMicroTask(() => {
                            evtListener.dispatchCallback(event);
                    });
                    microTasks.push(promise);
                }
            }

            return Promise.all(microTasks);
        });
    }
    private __updateSnapShot() {
        // update snapshot 
        this.snapshotData = ObjUtil.cloneObj(this.parent[this.key]);
    }
    private __set(data:any) {
       
        this.parent[this.key] = data;

    }
    private __get() {
        return this.parent[this.key];
    }
    private __getSnapshot() {
        return this.snapshotData;
    }
    // ==== Public Methods ====

    // update parent reference
    // notify listeners with new data
    //  cases:
    //      1. parent no longer exists
    //      2. child no longer exists
    //      3. child contains new data
    updateAndNotifyValueChanged(container : any, removeUndefinedRef : boolean) {

        let {parent, child, childKey} = ObjUtil.getChildAndParent(this.path, container, true);

        this.parent = parent;
        
        let promise : any = this.__notifyListeners(new EventData(eEvents.value, this.path, child, this.snapshotData))  

        // if parent still exists, update snapshot
        if (this.parent) {
            promise = promise.then(()=> {
                this.__updateSnapShot();
            });
        } 

        // removed undefined ref, if removeUndefinedRef === true
        if (removeUndefinedRef === true && (this.parent === undefined || child === undefined)) {
            promise = promise.then(() => {
                return this.remove();
            });
        }

        return promise
    }
    valueChanged(container : any, removeUndefinedRef : boolean) {
        
        // Notify listeners
        let refPaths = Ref.__getRefPaths();

        let microTasks = [  
            this.updateAndNotifyValueChanged(container, removeUndefinedRef)
        ];

        // Notify Child Refs
        for (let childPath in refPaths) {
            if (childPath.startsWith(this.path)) {

                let childRef = Ref.__getRef(childPath)
                
                if (childRef) {
                    microTasks.push(childRef.updateAndNotifyValueChanged(container, removeUndefinedRef));
                }
            }
        }

        return Promise.all(microTasks);
    }

    get(dataCtor?: ObjConstructor, initData? : any) : Promise<any>{

        return TaskUtil.queueMicroTask(() => {

            return this.setInit(initData)
                .then(() =>{
                    let data = ObjUtil.cloneObj(this.parent[this.key]);
            
                    data = (data !== undefined && dataCtor !== undefined)? new dataCtor(data): data;
                    
                    return data;
                })
        });
    }
    push(obj : any,childKey : string)  : Promise<any> {  
        let _childKey = childKey ? childKey : KeyUtil.getKey();
        
        this.parent[this.key][_childKey] = obj;
         
        let childPath = PathUtil.joinPath(this.path, _childKey);
        
        let promises = [
             this.__notifyParentRef(new EventData(eEvents.childAdded, childPath, this.parent[this.key][_childKey], undefined)),
             this.__notifyParentRef(new EventData(eEvents.childUpdated, this.path, this.parent[this.key], this.snapshotData)),

             this.__notifyListeners(new EventData(eEvents.childAdded, childPath, this.parent[this.key][_childKey], undefined)),
             this.__notifyListeners(new EventData(eEvents.childUpdated, childPath, this.parent[this.key][_childKey], undefined)),
             this.__notifyListeners(new EventData(eEvents.value, this.path, this.parent[this.key], this.snapshotData))
        ]

        return Promise.all(promises).then(()=> {
            this.__updateSnapShot();
        });
    }
    notifyListeners() : Promise<any> {
        return this.__notifyListeners(new EventData(eEvents.value, this.path, this.parent[this.key], this.snapshotData));
    }
    setInit(initData : any) : Promise<any> {
        
        if (this.parent[this.key] === undefined && initData !== undefined) {
            return this.set(initData);
        } else {
            return TaskUtil.queueMicroTask();
        }
    }
    set(obj : any)  : Promise<any>{
        this.__set(obj);

        let promises = [
            this.__notifyParentRef(new EventData(eEvents.childUpdated, this.path, this.parent[this.key], this.snapshotData)),
            this.__notifyListeners(new EventData(eEvents.value, this.path, this.parent[this.key], this.snapshotData))        
        ]
        
        return Promise.all(promises).then(()=> {
            this.__updateSnapShot();
        });

    }
    update(obj : any) : Promise<any> {
        let o = this.parent[this.key];

        this.parent[this.key] = {...o, ...obj};

        let promises = [
            this.__notifyParentRef(new EventData(eEvents.childUpdated, this.path, this.parent[this.key], this.snapshotData)),
            this.__notifyChildRef(new EventData(eEvents.parentUpdate, this.path, this.parent[this.key], this.snapshotData)),
            this.__notifyListeners(new EventData(eEvents.value, this.path, this.parent[this.key], this.snapshotData))        
        ]

        return Promise.all(promises).then(()=> {
           this.__updateSnapShot();
        });

    }
    remove() : Promise<any> {

        delete this.parent[this.key];

        let promises = [
            this.__notifyParentRef(new EventData(eEvents.childRemoved, this.path, this.parent[this.key], this.snapshotData)),
            this.__notifyParentRef(new EventData(eEvents.childUpdated, this.path, this.parent[this.key], this.snapshotData)),

            this.__notifyListeners(new EventData(eEvents.removed, this.path, this.parent[this.key], this.snapshotData)),
            this.__notifyListeners(new EventData(eEvents.value, this.path, this.parent[this.key], this.snapshotData))
        ]
        
        return Promise.all(promises).then(() => {
            Ref.__removeRef(this.path);
        });
    }
    listenerExists(event : eEvents, cb: Function, distance? : number) {
        
        for (let i = 0; i < this.__listeners.length; i++) {

            let currEvt = this.__listeners[i].getEvent();
            let currCb = this.__listeners[i].getCallback();

            if (((event === currEvt) && (cb === currCb))) {
                return true;
            }
        }
        return false;
    }
    on(event : eEvents, cb : EvtListenerCallback, dataCtor?: ObjConstructor,  distance? : number)  : Promise<any> {
        return TaskUtil.queueMicroTask(() => {
            if (this.listenerExists(event, cb) === false) { 
                this.__listeners.push(new EventListener(event, cb, distance, dataCtor));
            }
        });
    }
    off(event? : eEvents, cb? : Function) : Promise<any> {

        return TaskUtil.queueMicroTask(() => {
            //if nothing is passed in, remove all listeners
            let removeAll = (event === undefined) && (cb === undefined);

            for (let i = 0; i < this.__listeners.length; i++) {

                let currEvt = this.__listeners[i].getEvent();
                let currCb = this.__listeners[i].getCallback();

                if (((event === currEvt) && (cb === currCb)) || (removeAll)) {
                    this.__listeners.splice(i, 1);
                }
            }

        });
    
    }
}
