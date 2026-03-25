import { Collection } from 'fireorm';

export enum RequestStatus {
  RASCUNHO = 'Rascunho',
  PENDENTE_DIRETOR = 'Aguardando Diretor',
  PENDENTE_FINANCEIRO = 'Aguardando Financeiro',
  APROVADO = 'Aprovado',
  REJEITADO = 'Rejeitado',
  DEVOLVIDO = 'Devolvido',
}

@Collection('requests')
export class Request {
  id!: string;
  userId!: string;
  user!: string;
  title!: string;
  paymentMethod!: string;
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
  approverId?: string;
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

// --- Tabelas Mestras (Master Data) ---

@Collection('subsidiaries')
export class Subsidiary {
  id!: string;
  name!: string;
  active: boolean = true;
}

@Collection('departments')
export class Department {
  id!: string;
  name!: string;
  active: boolean = true;
}

@Collection('chargeClasses')
export class ChargeClass {
  id!: string;
  name!: string;
  active: boolean = true;
  subsidiaryId?: string;
}

export enum UserLevel {
  COLABORADOR = 'Colaborador',
  DIRETOR = 'Diretor',
}

@Collection('users')
export class User {
  id!: string;
  name!: string;
  email?: string;
  level!: UserLevel;
  approverId?: string;
  approverName?: string;
  loginId!: string;
  active: boolean = true;
}
