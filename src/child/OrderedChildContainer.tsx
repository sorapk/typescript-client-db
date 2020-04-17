import ChildContainer from "./ChildContainer";
import { Child } from "./Child";
import { AvailableContainers } from "../entity/Entity";

export default class OrderedChildContainer extends ChildContainer {
    static getName() {
            return "OrderedChildContainer";
    }
    dictLen() {

        let dict = this.getDict();

        return Object.keys(dict).length;
    }   
    addChild(child : Child) {
        
        let index = this.dictLen();

        super.addChild(child, index);
    }
    removeByIndex(targetInd : number) {

        assert(targetInd >= 0 && targetInd < this.dictLen());

        super.removeByKey(targetInd);

        let newObj : any = {};        

        for (let _i in this.getDict()) {
            let i : number = parseInt(_i);
            let newInd : number = i;
            if (i > targetInd) {
                newInd = i - 1;
            }
            newObj[newInd] = this.data[i];
        }

        this.data = newObj;
    }
    removeByChildId(childId : string) {
        
        for (let i = 0; i < this.dictLen(); i++) {
            if(this.data[i].meta.childId === childId) {
                this.removeByIndex(i);
            }
        }
    }

    //  return ordered list
    getInitChildList(...ctorParam: any[]) : Child[] {    //return ordered list

        let keyList = [];
        
        for (let i = 0; i < this.dictLen(); i++) {
            keyList.push(i);
        }

        return super.getInitChildList(keyList, ...ctorParam)
    }
}
AvailableContainers.registerContainer(OrderedChildContainer);