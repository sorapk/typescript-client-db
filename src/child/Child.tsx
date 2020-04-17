
export enum eChildIdType {
    local = "local",
    foreign = "foreign"
}



export class Child {

    value: any;
    meta: { childId: string, [key:string] : any };

    // chainable
    constructor(value : any, childId = "none", meta?: object) {
        
        let idMeta = {childId : childId}

        this.value = value;

        this.meta = {...idMeta, ...meta};

        return this;
    }
    
    // chainable
    assign(obj : any) {
        Object.assign(this, obj);

        return this;
    }
}