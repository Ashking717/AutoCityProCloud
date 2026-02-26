import Anthropic from '@anthropic-ai/sdk';

export const aiWorkerTools: Anthropic.Tool[] = [
  // ── LOOKUP TOOLS ─────────────────────────────────────────────────────────────
  {
    name: 'search_products',
    description: 'Search for products by name or SKU. Call BEFORE creating a sale or purchase.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Product name or SKU' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_customers',
    description: 'Search for customers by name or phone. Call BEFORE creating a sale.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_suppliers',
    description: 'Search for suppliers by name. Call BEFORE creating a purchase.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_expense_accounts',
    description: 'Fetch all expense accounts (with accountId, code, name). Call BEFORE creating an expense.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_categories',
    description: 'Fetch all product categories (with categoryId and name). Call BEFORE creating a new product.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── TRANSACTION TOOLS ─────────────────────────────────────────────────────────
  {
    name: 'create_product',
    description:
      'Add a new product to inventory. You MUST call get_categories first to get a valid categoryId. ' +
      'If the user provides an opening stock quantity AND cost price, pass them in — they will be posted to the GL automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:         { type: 'string', description: 'Product name' },
        categoryId:   { type: 'string', description: 'MongoDB _id of the category' },
        categoryName: { type: 'string', description: 'Category display name (for confirmation)' },
        costPrice:    { type: 'number', description: 'Cost / purchase price' },
        sellingPrice: { type: 'number', description: 'Selling price' },
        unit:         { type: 'string', description: 'Unit of measure, e.g. pcs, kg, set. Default: pcs' },
        openingStock: { type: 'number', description: 'Initial stock quantity (optional, default 0)' },
        minStock:     { type: 'number', description: 'Minimum stock alert level (optional, default 0)' },
        description:  { type: 'string', description: 'Short product description (optional)' },
        partNumber:   { type: 'string', description: 'Part number if applicable (optional)' },
        // Vehicle fields
        isVehicle:    { type: 'boolean', description: 'Is this a vehicle? Default false' },
        carMake:      { type: 'string', description: 'Vehicle make, e.g. Toyota (optional)' },
        carModel:     { type: 'string', description: 'Vehicle model, e.g. Camry (optional)' },
        variant:      { type: 'string', description: 'Trim / variant (optional)' },
        yearFrom:     { type: 'number', description: 'Compatible from year (optional)' },
        yearTo:       { type: 'number', description: 'Compatible to year (optional)' },
        color:        { type: 'string', description: 'Color (optional)' },
      },
      required: ['name', 'categoryId', 'categoryName', 'costPrice', 'sellingPrice'],
    },
  },
  {
    name: 'create_sale',
    description:
      'Create a new sale/invoice. Call search_customers + search_products first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customerId:    { type: 'string' },
        customerName:  { type: 'string' },
        paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'] },
        amountPaid:    { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId:  { type: 'string' },
              name:       { type: 'string' },
              sku:        { type: 'string' },
              quantity:   { type: 'number' },
              unit:       { type: 'string' },
              unitPrice:  { type: 'number' },
              discount:   { type: 'number', description: 'Discount amount, default 0' },
            },
            required: ['productId', 'name', 'sku', 'quantity', 'unit', 'unitPrice'],
          },
        },
        notes: { type: 'string' },
      },
      required: ['customerId', 'customerName', 'paymentMethod', 'amountPaid', 'items'],
    },
  },
  {
    name: 'create_purchase',
    description:
      'Create a purchase from a supplier. Call search_suppliers + search_products first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        supplierId:    { type: 'string' },
        supplierName:  { type: 'string' },
        paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'] },
        amountPaid:    { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId:  { type: 'string' },
              name:       { type: 'string' },
              sku:        { type: 'string' },
              quantity:   { type: 'number' },
              unit:       { type: 'string' },
              unitPrice:  { type: 'number' },
              taxRate:    { type: 'number', description: 'Tax rate %, default 0' },
            },
            required: ['productId', 'name', 'sku', 'quantity', 'unit', 'unitPrice'],
          },
        },
        notes: { type: 'string' },
      },
      required: ['supplierId', 'supplierName', 'paymentMethod', 'amountPaid', 'items'],
    },
  },
  {
    name: 'create_expense',
    description: 'Create an expense. Call get_expense_accounts first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['UTILITY','RENT','SALARY','MAINTENANCE','MARKETING','OFFICE_SUPPLIES','TRANSPORTATION','PROFESSIONAL_FEES','OTHER'],
        },
        paymentMethod: {
          type: 'string',
          enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'CREDIT'],
        },
        amountPaid:  { type: 'number' },
        vendorName:  { type: 'string' },
        notes:       { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description:  { type: 'string' },
              accountId:    { type: 'string' },
              accountName:  { type: 'string' },
              accountCode:  { type: 'string' },
              amount:       { type: 'number' },
            },
            required: ['description', 'accountId', 'accountName', 'accountCode', 'amount'],
          },
        },
      },
      required: ['category', 'paymentMethod', 'amountPaid', 'items'],
    },
  },
  {
    name: 'get_summary',
    description: 'Get a financial summary for a period.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type:   { type: 'string', enum: ['sales', 'purchases', 'expenses', 'all'] },
        period: { type: 'string', enum: ['today', 'this_week', 'this_month'] },
      },
      required: ['type', 'period'],
    },
  },
];
