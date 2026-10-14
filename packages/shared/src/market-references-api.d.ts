/** Internal material context only; never supplier approval or listing SDS. */
export type MarketReference = {id:number;title:string;material:string;notes:string|null;fileName:string;sha256:string;sizeBytes:number;uploadedByUserId:number;uploadedByUserName:string|null;createdAt:string;recordIds:number[];};
export type MarketReferenceUpload = {fileName:string;title:string;material:string;notes:string|null;recordIds:number[];reason:string;contentBase64:string;};
