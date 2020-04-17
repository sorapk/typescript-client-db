import { CtorInitData } from "../database/Ref";


const eMutatorFuncPrefix = Object.freeze([
    "_mutate"
]);

export interface CustomObjStaticInterface {
    new (initData: CtorInitData, ...args: any) : CustomObj;
    getName() : string;
}

export default abstract class CustomObj {
    
    //static methods
    static getName() {
        if (this.constructor !== CustomObj) {
            throw Error("getName isn't defined!");
        } else {
            return "CustomObj";
        }
    }

    //static event dispatcher
    static __postMutateEvent(this : CustomObj, method: Function) {
        this.onPostMutate(method);
    }

    //events
    protected abstract onPostMutate(method: Function) : any;
}