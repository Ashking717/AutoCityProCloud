import OpenAI from 'openai';

export const aiWorkerTools: OpenAI.Chat.ChatCompletionTool[] = [

  // ── LOOKUP TOOLS ───────────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products by name or SKU. Call BEFORE creating a sale or purchase.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Product name or SKU' },
        },
        required: ['query'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_customers',
      description: 'Search for existing customers by name or phone. Call BEFORE creating a sale.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_suppliers',
      description: 'Search for existing suppliers by name. Call BEFORE creating a purchase.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_expense_accounts',
      description: 'Fetch all expense accounts (with accountId, code, name). Call BEFORE creating an expense.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_categories',
      description:
        'Fetch product categories. ' +
        'ALWAYS pass a query when the user has specified a category name or hint — ' +
        'the server does a substring match and returns only matching categories. ' +
        'Only omit query to browse ALL categories. ' +
        'Example: user says "interior accessories" → call with query="interior accessories".',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Substring to filter categories by name (case-insensitive). Always provide this when the user mentions a category.',
          },
        },
        required: [],
      },
    },
  },

  // ── CREATE CUSTOMER ────────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'create_customer',
      description:
        'Create a brand-new customer record. Use ONLY when the customer does not exist. ' +
        'After creation, use the returned id immediately for the sale.',
      parameters: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Customer full name' },
          phone:   { type: 'string', description: 'Phone number' },
          email:   { type: 'string', description: 'Email address (optional)' },
          address: { type: 'string', description: 'Address (optional)' },
        },
        required: ['name'],
      },
    },
  },

  // ── CREATE SUPPLIER ────────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'create_supplier',
      description:
        'Create a brand-new supplier record. Use ONLY when the supplier does not exist. ' +
        'After creation, use the returned id immediately for the purchase.',
      parameters: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Supplier company or person name' },
          phone:   { type: 'string', description: 'Phone number' },
          email:   { type: 'string', description: 'Email address (optional)' },
          address: { type: 'string', description: 'Address (optional)' },
        },
        required: ['name'],
      },
    },
  },

  // ── TRANSACTION TOOLS ──────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'create_product',
      description:
        'Add a new product to inventory. You MUST call get_categories first to get a valid categoryId. ' +
        'If the user provides an opening stock quantity AND cost price, pass them in — they will be posted to the GL automatically. ' +
        'IMPORTANT: If ANY vehicle field is provided (carMake, carModel, variant, yearFrom, yearTo, color), you MUST set isVehicle to true.',
      parameters: {
        type: 'object',
        properties: {
          name:         { type: 'string',  description: 'Product name' },
          categoryId:   { type: 'string',  description: 'MongoDB _id of the category' },
          categoryName: { type: 'string',  description: 'Category display name (for confirmation)' },
          costPrice:    { type: 'number',  description: 'Cost / purchase price' },
          sellingPrice: { type: 'number',  description: 'Selling price' },
          unit:         { type: 'string',  description: 'Unit of measure, e.g. pcs, kg, set. Default: pcs' },
          openingStock: { type: 'number',  description: 'Initial stock quantity (optional, default 0)' },
          minStock:     { type: 'number',  description: 'Minimum stock alert level (optional, default 0)' },
          description:  { type: 'string',  description: 'Short product description (optional)' },
          partNumber:   { type: 'string',  description: 'Part number if applicable (optional)' },
          isVehicle:    { type: 'boolean', description: 'MUST be true if any vehicle field is provided' },
          carMake:      { type: 'string',  description: 'Vehicle make, e.g. Toyota (optional)' },
          carModel:     { type: 'string',  description: 'Vehicle model, e.g. Land Cruiser (optional)' },
          variant:      { type: 'string',  description: 'Trim / variant, e.g. LC300, LX570 (optional)' },
          yearFrom:     { type: 'number',  description: 'Compatible from year, e.g. 2018 (optional)' },
          yearTo:       { type: 'number',  description: 'Compatible to year, e.g. 2023 (optional)' },
          color:        { type: 'string',  description: 'Color (optional)' },
        },
        required: ['name', 'categoryId', 'categoryName', 'costPrice', 'sellingPrice'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_sale',
      description: 'Create a new sale/invoice. Call search_customers + search_products first.',
      parameters: {
        type: 'object',
        properties: {
          customerId:    { type: 'string' },
          customerName:  { type: 'string' },
          paymentMethod: {
            type: 'string',
            enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'],
          },
          amountPaid: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                name:      { type: 'string' },
                sku:       { type: 'string' },
                quantity:  { type: 'number' },
                unit:      { type: 'string' },
                unitPrice: { type: 'number' },
                discount:  { type: 'number', description: 'Discount amount, default 0' },
              },
              required: ['productId', 'name', 'sku', 'quantity', 'unit', 'unitPrice'],
            },
          },
          notes: { type: 'string' },
        },
        required: ['customerId', 'customerName', 'paymentMethod', 'amountPaid', 'items'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_purchase',
      description: 'Create a purchase from a supplier. Call search_suppliers + search_products first.',
      parameters: {
        type: 'object',
        properties: {
          supplierId:    { type: 'string' },
          supplierName:  { type: 'string' },
          paymentMethod: {
            type: 'string',
            enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'],
          },
          amountPaid: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                name:      { type: 'string' },
                sku:       { type: 'string' },
                quantity:  { type: 'number' },
                unit:      { type: 'string' },
                unitPrice: { type: 'number' },
                taxRate:   { type: 'number', description: 'Tax rate %, default 0' },
              },
              required: ['productId', 'name', 'sku', 'quantity', 'unit', 'unitPrice'],
            },
          },
          notes: { type: 'string' },
        },
        required: ['supplierId', 'supplierName', 'paymentMethod', 'amountPaid', 'items'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_expense',
      description: 'Create an expense. Call get_expense_accounts first.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: [
              'UTILITY', 'RENT', 'SALARY', 'MAINTENANCE', 'MARKETING',
              'OFFICE_SUPPLIES', 'TRANSPORTATION', 'PROFESSIONAL_FEES', 'OTHER',
            ],
          },
          paymentMethod: {
            type: 'string',
            enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'CREDIT'],
          },
          amountPaid: { type: 'number' },
          vendorName: { type: 'string' },
          notes:      { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                accountId:   { type: 'string' },
                accountName: { type: 'string' },
                accountCode: { type: 'string' },
                amount:      { type: 'number' },
              },
              required: ['description', 'accountId', 'accountName', 'accountCode', 'amount'],
            },
          },
        },
        required: ['category', 'paymentMethod', 'amountPaid', 'items'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_summary',
      description: 'Get a financial summary for a period.',
      parameters: {
        type: 'object',
        properties: {
          type:   { type: 'string', enum: ['sales', 'purchases', 'expenses', 'all'] },
          period: { type: 'string', enum: ['today', 'this_week', 'this_month'] },
        },
        required: ['type', 'period'],
      },
    },
  },
];