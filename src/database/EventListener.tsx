import { ObjConstructor } from "./Ref";
import EventData from "./EventData";

export type EvtListenerCallback = (evt: EventData, typedData?: any) => any;
export const kDefaultDistance = 1;

export default class EventListener {
    constructor(private event : any, private callback : EvtListenerCallback, private distance : number = kDefaultDistance, private dataCtor?: ObjConstructor) {
        //if callback comes from neighbor nodes distance > this.distance, don't trigger callback
        //default to immediate child or 1
        // -1, interested in the entire event callback
    }

    getEvent() {
        return this.event;
    }
    dispatchCallback(evtData: EventData) {
        
        let typedData;
        
        if (evtData.data !== undefined &&  this.dataCtor !== undefined) {
            typedData = new this.dataCtor(evtData.data);
        }

        this.callback(evtData, typedData);
    }
    getCallback () {
        return this.callback;
    }
    getDistance() {
        return this.distance;
    }
    getCtor() {
        return this.dataCtor;
    }
}