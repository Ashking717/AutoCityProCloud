export interface BalanceSheetItem {
  items: { [key: string]: number };
  total: number;
}

export interface BalanceSheetData {
  assets: {
    currentAssets: BalanceSheetItem;
    fixedAssets: BalanceSheetItem;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetItem;
    longTermLiabilities: BalanceSheetItem;
    totalLiabilities: number;
  };
  equity: {
    items: { [key: string]: number };
    total: number;
  };
  isBalanced: boolean;
}