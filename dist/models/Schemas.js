var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Collection } from 'fireorm';
export var RequestStatus;
(function (RequestStatus) {
    RequestStatus["RASCUNHO"] = "Rascunho";
    RequestStatus["PENDENTE"] = "Pendente";
    RequestStatus["APROVADO"] = "Aprovado";
    RequestStatus["REJEITADO"] = "Rejeitado";
    RequestStatus["DEVOLVIDO"] = "Devolvido";
})(RequestStatus || (RequestStatus = {}));
let Request = class Request {
    id;
    userId;
    title;
    type;
    project;
    paymentMethod;
    location;
    date;
    status;
    totalValue;
    isMultiple;
};
Request = __decorate([
    Collection('requests')
], Request);
export { Request };
let Receipt = class Receipt {
    id;
    solicitacaoId;
    description;
    value;
    receiptUrl;
    // Extraído via OCR
    merchantName;
    receiptDate;
};
Receipt = __decorate([
    Collection('receipts')
], Receipt);
export { Receipt };
let History = class History {
    id;
    solicitacaoId;
    action;
    date;
    userName;
    note;
};
History = __decorate([
    Collection('history')
], History);
export { History };
