export const defaultAccountGroups = {
  asset: [
    'Current Assets',
    'Fixed Assets',
    'Investments',
    'Inventory',
    'Cash & Bank',
    'Accounts Receivable',
  ],
  liability: [
    'Current Liabilities',
    'Long-term Liabilities',
    'Accounts Payable',
    'Loans',
  ],
  equity: [
    'Capital',
    'Reserves',
    'Retained Earnings',
    'Drawings',
  ],
  revenue: [
    'Sales',
    'Service Revenue',
    'Other Income',
  ],
  expense: [
    'Cost of Goods Sold',
    'Operating Expenses',
    'Administrative Expenses',
    'Financial Expenses',
  ],
};

export const defaultAccounts = [
  // Assets
  { code: 'A1000', name: 'Cash in Hand', type: 'asset', group: 'Cash & Bank' },
  { code: 'A1001', name: 'Cash at Bank', type: 'asset', group: 'Cash & Bank' },
  { code: 'A1100', name: 'Accounts Receivable', type: 'asset', group: 'Accounts Receivable' },
  { code: 'A1200', name: 'Inventory - Stock', type: 'asset', group: 'Inventory' },
  { code: 'A2000', name: 'Fixed Assets', type: 'asset', group: 'Fixed Assets' },
  { code: 'A2001', name: 'Furniture & Fixtures', type: 'asset', group: 'Fixed Assets' },
  { code: 'A2002', name: 'Vehicles', type: 'asset', group: 'Fixed Assets' },
  
  // Liabilities
  { code: 'L1000', name: 'Accounts Payable', type: 'liability', group: 'Accounts Payable' },
  { code: 'L1100', name: 'Short-term Loans', type: 'liability', group: 'Current Liabilities' },
  { code: 'L2000', name: 'Long-term Loans', type: 'liability', group: 'Long-term Liabilities' },
  
  // Equity
  { code: 'E1000', name: 'Capital', type: 'equity', group: 'Capital' },
  { code: 'E1100', name: 'Retained Earnings', type: 'equity', group: 'Retained Earnings' },
  { code: 'E1200', name: 'Drawings', type: 'equity', group: 'Drawings' },
  
  // Revenue
  { code: 'R1000', name: 'Sales Revenue', type: 'revenue', group: 'Sales' },
  { code: 'R1001', name: 'Service Revenue', type: 'revenue', group: 'Service Revenue' },
  { code: 'R2000', name: 'Other Income', type: 'revenue', group: 'Other Income' },
  
  // Expenses
  { code: 'X1000', name: 'Cost of Goods Sold', type: 'expense', group: 'Cost of Goods Sold' },
  { code: 'X2000', name: 'Salaries & Wages', type: 'expense', group: 'Operating Expenses' },
  { code: 'X2001', name: 'Rent', type: 'expense', group: 'Operating Expenses' },
  { code: 'X2002', name: 'Utilities', type: 'expense', group: 'Operating Expenses' },
  { code: 'X2003', name: 'Office Supplies', type: 'expense', group: 'Administrative Expenses' },
  { code: 'X2004', name: 'Marketing & Advertising', type: 'expense', group: 'Operating Expenses' },
  { code: 'X3000', name: 'Interest Expense', type: 'expense', group: 'Financial Expenses' },
  { code: 'X3001', name: 'Bank Charges', type: 'expense', group: 'Financial Expenses' },
];
