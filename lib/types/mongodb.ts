import { Types } from 'mongoose';

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  costPrice?: number;
  currentStock?: number;
  category?: string;
  outletId: Types.ObjectId;
  __v: number;
}

export interface IAccount {
  _id: Types.ObjectId;
  accountName: string;
  accountGroup?: string;
  accountType: string;
  outletId: Types.ObjectId;
  __v: number;
}

export interface ISale {
  _id: Types.ObjectId;
  grandTotal?: number;
  items?: Array<{
    itemId?: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    itemType?: string;
  }>;
  outletId: Types.ObjectId;
  saleDate: Date;
  status: string;
  __v: number;
}

export interface IVoucher {
  _id: Types.ObjectId;
  voucherType: string;
  entries?: Array<{
    accountId?: Types.ObjectId;
    debit?: number;
    credit?: number;
    accountName?: string;
  }>;
  totalAmount?: number;
  totalDebit?: number;
  outletId: Types.ObjectId;
  date: Date;
  status: string;
  __v: number;
}

export interface IOutlet {
  _id: Types.ObjectId;
  name?: string;
  outletName?: string;
  __v: number;
}