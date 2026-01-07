export interface CashFlowSection {
  items: { [key: string]: number };
  total: number;
}

export interface CashFlowData {
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
  metadata: {
    outletName: string;
    outletId: string;
    generatedAt: string;
    fromDate: string;
    toDate: string;
  };
}