import { eEvents } from "./Ref";

export default class EventData {
    constructor(
        public event : eEvents,             //event type
        public path : any,                  //path event occured
        public data : any,                  //data associated with path
        public snapshot : any,              //snapshot of data
        public childData?: any,              //if listener is child of parent path, return data
        public childDataSnapshot? : any) {   //snapshot of child  
    }
}
