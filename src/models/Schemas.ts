import { Collection } from 'fireorm';

export enum RequestStatus {
  RASCUNHO = 'Rascunho',
  PENDENTE = 'Pendente',
  APROVADO = 'Aprovado',
  REJEITADO = 'Rejeitado',
  DEVOLVIDO = 'Devolvido',
}

@Collection('requests')
export class Request {
  id!: string;
  userId!: string;
  title!: string;
  type!: string;
  project!: string;
  paymentMethod!: string;
  location!: string;
  date!: Date;
  status!: RequestStatus;
  totalValue!: number;
  isMultiple!: boolean;
  
  // Novos campos financeiros
  paymentDate?: Date;
  subsidiary?: string;
  department?: string;
  chargeClass?: string;
  competence?: string;
  nfNumber?: string;
}

@Collection('receipts')
export class Receipt {
  id!: string;
  solicitacaoId!: string;
  description!: string;
  value!: number;
  receiptUrl!: string;
  // Extraído via OCR
  merchantName?: string;
  receiptDate?: Date;
}

@Collection('history')
export class History {
  id!: string;
  solicitacaoId!: string;
  action!: string;
  date!: Date;
  userName!: string;
  note?: string;
}
