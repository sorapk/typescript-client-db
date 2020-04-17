
export const JSONUtil = (() => {

   let __replacer = (ignoreKeyWPrefix : string) => {
    
    let cnt = -1;

    return ((key : string, value : any) => {
            cnt++;
    
            if (cnt === 0) { //initial object
                return value;
            } else {
                if (key.startsWith(ignoreKeyWPrefix)) {
                    return undefined;
                } else {
                    return value;
                }
            }
        });
    }

    let __toJSON = function(obj : any, ignoreKeyWPrefix : string) {

        return JSON.stringify(obj, __replacer(ignoreKeyWPrefix));
        
    }

    return {
        toJSON: __toJSON
    }
})();

export const KeyUtil = (() => {


    const __generateKey = function() {

        let time = TimeUtil.getTime();
        let time36 = time.toString(36);
        let randomInt = Math.round(Math.random() * 100000);
        let rand36 = randomInt.toString(36);
        let key = `#${time36}#${rand36}`;

        return key;
    }

    return { 
        getKey: __generateKey
    }

})();

export const TimeUtil = (()=>{
    
    const __getTimestamp = function() {
        return Date.now();
    }
    
    return {
        getTime: __getTimestamp
    }

})()

export const PathUtil = (() => {

    let __splitPath = function(path : string) {
        let keys = path.split('/').filter(v => {return v !== ""});
        return keys
    }
    let __trimPath = function(path : string) {

        let startInd = -1;
        let endInd = path.length;

        while(startInd < path.length && path[++startInd] === "/");

        while(endInd > 0 && path[--endInd] === "/");

        return path.slice(startInd, endInd + 1);
    }
    let __joinPath = function(path1 : string, path2 : string) {

        path1 = __trimPath(path1);

        path2 = __trimPath(path2);

        return `${path1}/${path2}`;
    }
    return {
        splitPath: __splitPath,
        trimPath: __trimPath,
        joinPath: __joinPath
    }

})();

export const ObjUtil = (() => {

    let __traverseObj = function(keyArr : string[], obj: any) {
    
        //check if array
        //check if obj
        
        let parent;
        let key;
        
        for (let i = 0; i < keyArr.length; i++) {
        
            key = keyArr[i];
            parent = obj;
            obj = obj[key];
            
            if (obj === undefined) {
               if (i < (keyArr.length - 1) ) {
                    throw new Error(`Parent Key Undefined - "${key}"`);
               } else {
                   break;
               }
            }
    
        }
        return {
            parent: parent,
            child: obj,
            childKey: key
        };
    }

    let __getObjChildAndParent = function(path : any, obj : any, noThrowMode? : any) {

        let keyArr = PathUtil.splitPath(path);

        if (noThrowMode === true) {
            try {
                return __traverseObj(keyArr, obj); 
            } catch (e) {                               //path doesn't exist
                return {
                    parent: undefined,
                    child: undefined, 
                    childKey: undefined
                }
            }   
        } else {
            return __traverseObj(keyArr, obj);
        }

    }
    let __pathExists = function(path : string, obj : any) {

        try {
            let {parent, child } = __getObjChildAndParent(path, obj);

            return ((parent !== undefined) && (child !== undefined));

        } catch(e) {

        }
        return false;
    }
    let __cloneObj = function(obj : any) {
        if (obj) {
            return JSON.parse(JSON.stringify(obj));
        } else {
            return obj;
        }
    }
    return {
        getChildAndParent: __getObjChildAndParent,
        pathExists: __pathExists,
        cloneObj: __cloneObj
    }
})()

