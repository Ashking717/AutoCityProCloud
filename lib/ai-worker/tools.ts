import OpenAI from 'openai';

export const aiWorkerTools: OpenAI.Chat.ChatCompletionTool[] = [

  // ── READ-ONLY LOOKUPS ──────────────────────────────────────────────────────
  // PERFORMANCE TIP: search_customers + search_products can be called in the
  // SAME step (parallel) when you need both before a sale or purchase.

  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        'Search products by name, SKU, or part number. ' +
        'ALWAYS call BEFORE create_sale or create_purchase. ' +
        'Returns id, name, sku, sellingPrice, costPrice, currentStock, unit. ' +
        'If 0 results: inform the user and ask for the correct name — do NOT retry with the same query.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Product name, SKU, or part number' },
        },
        required: ['query'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'check_stock',
      description:
        'Get live stock level and pricing for a specific product by its ID. ' +
        'Use after search_products when you need to confirm availability before completing a sale.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'MongoDB _id of the product' },
        },
        required: ['productId'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_customers',
      description:
        'Search existing customers by name or phone number. ' +
        'ALWAYS call BEFORE create_sale, UNLESS the user says "walk-in" or "cash customer" (use customerId="walk-in" instead). ' +
        'Can be called in parallel with search_products. ' +
        'If 0 results: offer to (a) create a new customer or (b) use walk-in.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Customer name or phone number' },
        },
        required: ['query'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_customer_outstanding',
      description:
        'Get the outstanding credit balance for a customer. ' +
        'Call when paymentMethod is CREDIT, or when the user asks about a customer\'s balance or dues.',
      parameters: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'MongoDB _id of the customer' },
        },
        required: ['customerId'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_suppliers',
      description:
        'Search existing suppliers by name. ' +
        'ALWAYS call BEFORE create_purchase. Can be called in parallel with search_products.',
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
      description:
        'Fetch all active expense GL accounts (returns accountId, code, name). ' +
        'Call ONCE before create_expense. No need to re-fetch if already retrieved this session.',
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
        'ALWAYS pass a query when the user mentions a category name — ' +
        'the server does a substring match and returns only relevant entries. ' +
        'Omit query ONLY to browse all categories. ' +
        'Example: user says "interior accessories" → call with query="interior accessories".',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Category name substring (case-insensitive). Always provide when the user mentions a category.',
          },
        },
        required: [],
      },
    },
  },

  // ── WRITE OPERATIONS: ENTITIES ─────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'create_customer',
      description:
        'Create a new customer record. ' +
        'Only call after search_customers returned 0 results AND user confirmed they want a new record. ' +
        'Use the returned id immediately in create_sale.',
      parameters: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Full name' },
          phone:   { type: 'string', description: 'Phone number' },
          email:   { type: 'string', description: 'Email (optional)' },
          address: { type: 'string', description: 'Address (optional)' },
        },
        required: ['name'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_supplier',
      description:
        'Create a new supplier record. ' +
        'Only call after search_suppliers returned 0 results AND user confirmed a new record. ' +
        'Use the returned id immediately in create_purchase.',
      parameters: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Company or person name' },
          phone:   { type: 'string', description: 'Phone number' },
          email:   { type: 'string', description: 'Email (optional)' },
          address: { type: 'string', description: 'Address (optional)' },
        },
        required: ['name'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_product',
      description:
        'Add a new product to inventory. ' +
        'REQUIRED prep: call get_categories first to get a valid categoryId. ' +
        'SKU is auto-generated — never ask the user for it. ' +
        'VEHICLE RULE: if ANY vehicle field is provided (carMake, carModel, variant, yearFrom, yearTo, color), you MUST set isVehicle=true.',
      parameters: {
        type: 'object',
        properties: {
          name:         { type: 'string',  description: 'Product name' },
          categoryId:   { type: 'string',  description: 'MongoDB _id of the category' },
          categoryName: { type: 'string',  description: 'Category display name (for the confirmation message)' },
          costPrice:    { type: 'number',  description: 'Cost / purchase price' },
          sellingPrice: { type: 'number',  description: 'Selling price' },
          unit:         { type: 'string',  description: 'Unit of measure: pcs, kg, set, liter, meter, box. Default: pcs' },
          openingStock: { type: 'number',  description: 'Initial stock quantity (default 0)' },
          minStock:     { type: 'number',  description: 'Minimum stock alert level (default 0)' },
          description:  { type: 'string',  description: 'Short description (optional)' },
          partNumber:   { type: 'string',  description: 'Part number (optional)' },
          isVehicle:    { type: 'boolean', description: 'MUST be true when any vehicle field is present' },
          carMake:      { type: 'string',  description: 'Vehicle make, e.g. Toyota (optional)' },
          carModel:     { type: 'string',  description: 'Vehicle model, e.g. Land Cruiser (optional)' },
          variant:      { type: 'string',  description: 'Trim/variant, e.g. LC300, VXR (optional)' },
          yearFrom:     { type: 'number',  description: 'Compatible from year, e.g. 2018 (optional)' },
          yearTo:       { type: 'number',  description: 'Compatible to year, e.g. 2023 (optional)' },
          color:        { type: 'string',  description: 'Color (optional)' },
        },
        required: ['name', 'categoryId', 'categoryName', 'costPrice', 'sellingPrice'],
      },
    },
  },

  // ── WRITE OPERATIONS: TRANSACTIONS ─────────────────────────────────────────

  {
    type: 'function',
    function: {
  name: 'create_sale',
  description:
    'Create a new sale/invoice. ' +
    'REQUIRED prep: search_customers + search_products (run in parallel). ' +
    'WALK-IN: for anonymous customers set customerId="walk-in", customerName="Walk-In Customer". ' +
    'CREDIT: set paymentMethod=CREDIT and amountPaid=0. ' +
    'amountPaid defaults to grandTotal when omitted (full cash payment). ' +
    'DISCOUNT RULE: if the user mentions any discount, set the top-level `discount` field (fixed QAR amount off the order total). ' +
    'NEVER put discount on individual items. NEVER put discount info in `notes`.',
  parameters: {
    type: 'object',
    properties: {
      customerId:    { type: 'string', description: 'Customer MongoDB _id, OR the literal string "walk-in"' },
      customerName:  { type: 'string' },
      paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'] },
      amountPaid:    { type: 'number', description: 'Amount received. Omit to default to full payment.' },
      discount:      { type: 'number', description: 'Order-level discount in QAR (default 0). Use this for ANY discount the user mentions.' },
      notes:         { type: 'string' },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            name:      { type: 'string' },
            sku:       { type: 'string' },
            quantity:  { type: 'number', minimum: 0.01 },
            unit:      { type: 'string' },
            unitPrice: { type: 'number', minimum: 0 },
            // discount removed from item level
          },
          required: ['productId', 'name', 'sku', 'quantity', 'unit', 'unitPrice'],
        },
      },
    },
    required: ['customerId', 'customerName', 'paymentMethod', 'items'],
  },
},
  },

  {
    type: 'function',
    function: {
      name: 'create_purchase',
      description:
        'Record a supplier purchase (increases inventory). ' +
        'REQUIRED prep: search_suppliers + search_products (run in parallel). ' +
        'amountPaid defaults to subtotal when omitted.',
      parameters: {
        type: 'object',
        properties: {
          supplierId:    { type: 'string' },
          supplierName:  { type: 'string' },
          paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'] },
          amountPaid:    { type: 'number', description: 'Amount paid. Omit for full payment.' },
          notes:         { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                name:      { type: 'string' },
                sku:       { type: 'string' },
                quantity:  { type: 'number', minimum: 0.01 },
                unit:      { type: 'string' },
                unitPrice: { type: 'number', minimum: 0 },
                taxRate:   { type: 'number', description: 'Tax rate %, default 0' },
              },
              required: ['productId', 'name', 'sku', 'quantity', 'unit', 'unitPrice'],
            },
          },
        },
        required: ['supplierId', 'supplierName', 'paymentMethod', 'items'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_expense',
      description:
        'Record an operational expense. ' +
        'REQUIRED prep: call get_expense_accounts first and use real accountId values from those results. ' +
        'Never fabricate accountId — only use IDs returned by get_expense_accounts.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['UTILITY', 'RENT', 'SALARY', 'MAINTENANCE', 'MARKETING',
                   'OFFICE_SUPPLIES', 'TRANSPORTATION', 'PROFESSIONAL_FEES', 'OTHER'],
          },
          paymentMethod: {
            type: 'string',
            enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'CREDIT'],
          },
          amountPaid:  { type: 'number' },
          vendorName:  { type: 'string', description: 'Vendor or payee name (optional)' },
          notes:       { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                accountId:   { type: 'string', description: 'Valid _id from get_expense_accounts' },
                accountName: { type: 'string' },
                accountCode: { type: 'string' },
                amount:      { type: 'number', minimum: 0 },
              },
              required: ['description', 'accountId', 'accountName', 'accountCode', 'amount'],
            },
          },
        },
        required: ['category', 'paymentMethod', 'amountPaid', 'items'],
      },
    },
  },

  // ── REPORTING ──────────────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'get_summary',
      description:
        'Fetch a financial summary. ' +
        'Use type="all" unless the user asks specifically for one report type. ' +
        'Periods: today, this_week, this_month.',
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