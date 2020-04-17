
import {TimeUtil, KeyUtil, PathUtil} from "../database/DBUtil";
import {Param, ParamList} from "./Param";

import ChildContainer, { ChildContainerStaticInterface} from "../child/ChildContainer";
import CustomObj, { CustomObjStaticInterface } from "../custom-obj/CustomObj";
import { eChildIdType, Child } from "../child/Child";
import { CtorInitData } from "../database/Ref";


interface EntityStaticInterface extends CustomObjStaticInterface{
    getParamTemplate() : Param[]
}
interface ContainerManagerInterface {
    [containerName: string] : ChildContainer
}
export const AvailableContainers = (() => {

    let dict : {[key:string] : ChildContainerStaticInterface} = {} 

    let getContainer = function(containerName:string) : ChildContainerStaticInterface{
        return dict[containerName];
    }
    let registerContainer = function(container: ChildContainerStaticInterface) {
        dict[container.getName()] = container;
    }
    return {
        getContainer: getContainer,
        registerContainer:registerContainer
    }
})()
export const AvailableEntity = (() => {

    let dict : {[key:string] : EntityStaticInterface} = {} 

    let getEntity = function(entityName: string) : EntityStaticInterface{
        return dict[entityName];
    }
    let registerEntity = function(entity: EntityStaticInterface) {
        dict[entity.getName()] = entity;
    }
    return {
        getEntity: getEntity,
        registerEntity:registerEntity
    }
})()

export default abstract class Entity extends CustomObj{
    
    // NOTE:
    //  - _assignObj must be called in child constructor
    //  - calling from super class caused sublcass fields to be overriden
    constructor(parent : Entity | null) { 
        super();

        if (parent) {
            this.__setParent(parent);
        }
    }

    static getName() {
        if (this.constructor !== Entity) {
            throw Error("getName isn't defined!");
        } else {
            return "Entity";
        }
    }

    [propName : string] : any;

    //protected fields
    protected id = KeyUtil.getKey();
    protected createTime = TimeUtil.getTime();
    protected lastUpdate = TimeUtil.getTime();
    protected type = (this.constructor as CustomObjStaticInterface).getName();
    protected childContainerManager : ContainerManagerInterface = {};
    protected parent : {ref : Entity, toJSON:(key : any) => void} | undefined;                              


    //static helper
    static idToPath(id : any) {
        
        return id;

    }

    // protected helpers
    protected __updateLastUpdated() {
        
        this.lastUpdate = TimeUtil.getTime();

    }
    protected __initObj(obj : CtorInitData) {
        
        if (this.constructor === Entity) {
            throw Error("Init obj must be called from inherited class.");
        } 

        if (obj) {
            this.__assignObj(obj);
        
            this.__initChildContainerInstance(this.childContainerManager);
        }

    }
    protected __assignObj(obj : any) {
        
        Object.assign(this, obj);

    }
    protected __initChildContainerInstance(childContainerManager : ContainerManagerInterface) {

        for (let registeredContainerType in childContainerManager) {
            let obj = childContainerManager[registeredContainerType];
            let constructorName =  childContainerManager[registeredContainerType].meta.containerType;
            let constructor = AvailableContainers.getContainer(constructorName);

            childContainerManager[registeredContainerType] = (new constructor(obj)) as ChildContainer;
        }
    }
    protected __registerContainer(dataConstructor : CustomObjStaticInterface, containerConstructor : ChildContainerStaticInterface, childIdType : eChildIdType) {

        let name = dataConstructor.getName();

        if (this.childContainerManager[name] === undefined) {
            this.childContainerManager[name] =  (new containerConstructor(undefined, dataConstructor, childIdType)) as ChildContainer;
        }
    }
    protected __setParent(parent : Entity) {    //should be called in constructor
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
        // purpose of wrapper is to prevent serialization
        this.parent = {
            ref: parent,
            toJSON (key : any) {
                if (key){
                    console.log(`Now I am a nested object under key '${key}'`);
                    return undefined;
                } else
                    return this;
            }
        }
    }
    protected __getParent() {
        if (this.parent) {
            return this.parent.ref;
        } else {
            return undefined;
        }
    }
    // mutator method
    updateObj(obj : any) { //update lastUpdate timestamp
        
        Object.assign(this, obj);

    }
    removeContainer(childClassConstructor : CustomObjStaticInterface) {
        
        delete this.childContainerManager[childClassConstructor.getName()];

    }
    setParam(paramArr : ParamList) {

        paramArr.forEach((param) => {

            this[param.key] = param.data;

        });
    }
    
    // accessor method
    getContainer(childClassConstructor : CustomObjStaticInterface) : ChildContainer {

        let container = this.childContainerManager[childClassConstructor.getName()]

        if (container === undefined) {
            throw Error("Child Container isn't registered");
        } else {
            return container;
        }

    }
    getParam() {
        let cotor = this.constructor as EntityStaticInterface;
        let paramArr : ParamList = cotor.getParamTemplate();

        for(let i = 0; i < paramArr.length; i++) {

            let param = paramArr[i];

            let key = param.key;

            param.data = this[key];
        }

        return paramArr;
    }
    getId() {
        return this.id;
    }
    getCreateTime () {
        return this.createTime;
    }
    getLastUpdate() {
        return this.lastUpdate;
    }
    getChildPath(childId:string, childClassConstructor: CustomObjStaticInterface) : string {

        let containerKey = "childContainerManager";

        if ( (containerKey in this) === false ) {
            throw Error(`Error: "${containerKey}" not found!`);
        }

        let container = this.getContainer(childClassConstructor);
        let path = container.getChildPath(childId);

        if (path) {
            path = PathUtil.joinPath(containerKey, path);
        } else {
            throw Error(`Child: (${childClassConstructor.getName()}, ${childId}) path doesn't exist!`)
        }
        return path;
    }

    getRefPath() : string {

        let refPath = "";
        let parent = this.__getParent();

        if (parent) {
            let childPath = parent.getChildPath(this.getId(), this.constructor as CustomObjStaticInterface);
            let parentPath = parent.getRefPath();
            refPath = PathUtil.joinPath(parentPath, childPath) ;
        } 

        return refPath;
    }
    // static param methods
    static getParamTemplate() : ParamList { //return array of user params - let user know what can be set
        
        return [];

    }
}