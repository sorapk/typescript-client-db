
// NOTE: maps to form data
// NOTE: key and value must be the same
export enum eDataTypes {
    list = "list",
    int = "int",
    str = "str"
};
export type Param = {
    key: string,
    label?: string,
    type?: eDataTypes,
    data?: any
};
export type ParamList = Param[];
