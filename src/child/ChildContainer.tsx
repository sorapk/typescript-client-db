import { Child, eChildIdType} from "./Child";
import CustomObj, { CustomObjStaticInterface } from "../custom-obj/CustomObj";
import Entity, { AvailableEntity, AvailableContainers} from "../entity/Entity";
import { CtorInitData } from "../database/Ref";

export interface ChildMeta {
    dataType: string,
    containerType: string,
    childIdType: eChildIdType
}

export  interface ChildContainerStaticInterface extends CustomObjStaticInterface {
    new (obj : any, dataConstructor : CustomObjStaticInterface, childIdType : eChildIdType) : ChildContainer;
}


export default class ChildContainer extends CustomObj {
    
    public meta: ChildMeta = {} as ChildMeta;
    public data!: {[key:string] : Child};

    // constructor: CustomObj;
    protected onPostMutate(method: Function) {
    }
    static getName() {
        return "ChildContainer"
    }
    constructor(obj : any, dataConstructor : CustomObjStaticInterface, childIdType : eChildIdType) {
        super();

        if (obj) {
            Object.assign(this, obj);
        } else {
            this.meta = {
                dataType: dataConstructor.getName(),
                containerType: (this.constructor as CustomObjStaticInterface).getName(),
                childIdType: childIdType
            }
            this.data = {};
        }
    }
    getDict() {
        
        return this.data;
       
    }
    addChild(child : Child, key? : string | number) {

        key = (key !== undefined ? key : child.meta.childId) as string;

        this.data[key] = child;
    }
    removeByKey(key : string | number) {

        delete this.data[key];
    }
    removeByChildId(childId : string | number) {

        for (let key in this.data) {
            if(this.data[key].meta.childId === childId) {
                this.removeByKey(key);
            }
        }

    }
    //https://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible?page=1&tab=votes#tab-top
    __createObj(ctor : any, ...args : any[]) {
   
        return new (ctor.bind.apply(ctor, [null, ...args] ));
     
     }
    __initializeChild(child: any, ...ctorParam: any[]) : Child {

        if (child instanceof Child) {
            return child;
        } else {
            let childIdType = this.meta.childIdType;
            let type : string = this.meta.dataType;
            let initChild  = new Child(undefined).assign(child);

            if (childIdType === eChildIdType.local) {
                let constructor = AvailableEntity.getEntity(type);
                initChild.value =   this.__createObj(constructor, initChild.value, ...ctorParam);

                // initChild.value = new constructor(initChild.value, ctorParam);
                // --> // initChild.value = new (constructor) (initChild.value, ctorParam);
                // --> TODO figure out how to call constructor with variable params
            }

            return initChild;
        }
    }
    //NOTE: lazy initialization as needed
    //  - if child value is still generic object
    //  - call constructor, update current value to initialize object, return it
    getInitChildList(custKeyList?: string | number [], ...ctorParam : any[]) : Child[] {

        let dict = this.getDict();
        let res = [];
        let keyList = custKeyList === undefined ? Object.keys(dict) : custKeyList;

        for (let i = 0; i < keyList.length; i++) {
            let key = keyList[i];
            
            dict[key] = this.__initializeChild(dict[key], ...ctorParam);

            res.push(dict[key]);
        }

        return res;
    }
    getByChildId(childId : string) : Child | null {

        let childList = this.getInitChildList();

        for (let i = 0; i < childList.length; i++) {
            let child = childList[i];

            if (child.meta.childId === childId) {
                return child;
            }
        }
        return null;

    }
    getChildPath(childId : string) : string | null {


        let childList = this.getInitChildList();
        let child = null;
        let childIndex = null;

        for (let i = 0; i < childList.length; i++) {
            if (childList[i].meta.childId === childId) {
                child = childList[i]
                childIndex = i;
                break
            }
        }
        if (child !== null && childIndex !== null) {
            return `${this.meta.dataType}/data/${childIndex}/value`
        }
        return null;
    }
    updateChildValueByChildId(childId : string | number, value : any) {

        let dict = this.getDict();

        for (let key in dict) {
            let child = dict[key];

            if(child.meta.childId === childId) {
                this.updateChildValueByKey(key, value);
                break;
            }
        }
    }
    updateChildValueByKey(key: string | number, value : any) {

        let dict = this.getDict();
        
        let currObj = dict[key];

        currObj.value = value;
    }
}
AvailableContainers.registerContainer(ChildContainer);