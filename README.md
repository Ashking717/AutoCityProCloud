# AutoCity Qatar - Next.js Application

A comprehensive automotive management system built with Next.js 14, TypeScript, MongoDB, and Mongoose.

## 🏗️ Architecture

### Public Website (/)
- Homepage at `https://autocityqatar.com`
- Public-facing website for AutoCity Qatar
- Company information, services, and contact details

### Internal Operations (/autocityPro)
- Internal management system for staff
- Role-based access control (RBAC)
- Outlet-specific data isolation
- Comprehensive accounting and inventory management

## 🚀 Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control with 6 roles:
  - **SUPERADMIN**: Full access to all outlets
  - **ADMIN**: Full access within assigned outlet
  - **MANAGER**: Operational management within outlet
  - **CASHIER**: Sales and customer management
  - **ACCOUNTANT**: Financial and accounting operations
  - **VIEWER**: Read-only access

### Multi-Outlet Support
- Each outlet operates independently
- Superadmin can manage all outlets
- Other users restricted to their assigned outlet
- Outlet registration and management

### Inventory Management
- Product/Item management with SKU and barcode
- Category hierarchy support
- Stock tracking with min/max levels
- Car-specific fields (make, model, year, part number)
- Real-time stock updates

### Sales & POS
- Point of Sale interface
- Customer management
- Invoice generation
- Multiple payment methods
- Tax calculations
- Credit sales support

### Purchase Management
- Supplier management
- Purchase order creation
- Stock receiving
- Payment tracking

### Accounting System
- Double-entry bookkeeping
- Chart of Accounts (COA)
- Voucher/Journal entries
- Multiple voucher types:
  - Payment
  - Receipt
  - Contra
  - Journal
  - Sales (auto-generated)
  - Purchase (auto-generated)

### Comprehensive Reports
1. **Profit & Loss**: Income vs Expenses analysis
2. **Balance Sheet**: Assets vs Liabilities
3. **Sales Report**: Sales trends and analysis
4. **Purchase Report**: Purchase analysis
5. **Stock Report**: Inventory status
6. **Customer Ledger**: Customer balances
7. **Supplier Ledger**: Supplier balances
8. **Daybook**: Daily transaction log
9. **Cash Flow**: Cash movement analysis
10. **Tax Report**: Tax liability calculation

## 📦 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens, HTTP-only cookies
- **Icons**: Lucide React
- **Charts**: Recharts

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd autocity-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and configure:
   ```env
   MONGODB_URI=mongodb://localhost:27017/autocity-qatar
   NEXTAUTH_SECRET=your-secret-key
   JWT_SECRET=your-jwt-secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Public site: http://localhost:3000
   - Staff portal: http://localhost:3000/autocityPro/login

## 📁 Project Structure

```
autocity-nextjs/
├── app/
│   ├── (public)/          # Public website routes
│   ├── autocityPro/       # Internal operations (protected)
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── sales/
│   │   ├── purchases/
│   │   ├── inventory/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── accounting/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/               # API routes
│   │   ├── auth/
│   │   ├── outlets/
│   │   ├── products/
│   │   ├── sales/
│   │   ├── purchases/
│   │   └── reports/
│   ├── layout.tsx
│   └── page.tsx           # Homepage
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components
│   └── dashboard/         # Dashboard components
├── lib/
│   ├── db/
│   │   └── mongodb.ts     # Database connection
│   ├── models/            # Mongoose models
│   │   ├── User.ts
│   │   ├── Outlet.ts
│   │   ├── Product.ts
│   │   ├── Customer.ts
│   │   ├── Supplier.ts
│   │   ├── Sale.ts
│   │   ├── Purchase.ts
│   │   ├── Account.ts
│   │   └── Voucher.ts
│   ├── auth/              # Authentication utilities
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── middleware.ts          # Next.js middleware for auth
└── package.json
```

## 🔐 Default Access

On first run, create a superadmin user via MongoDB:

```javascript
db.users.insertOne({
  email: "admin@autocityqatar.com",
  username: "superadmin",
  password: "$2a$10$...", // bcrypt hash of your password
  firstName: "Super",
  lastName: "Admin",
  role: "SUPERADMIN",
  outletId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

Or use the API to create the first user:
```bash
curl -X POST http://localhost:3000/api/users/create-superadmin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@autocityqatar.com",
    "username": "superadmin",
    "password": "YourSecurePassword123!",
    "firstName": "Super",
    "lastName": "Admin"
  }'
```

## 🏪 Outlet Registration

1. Login as SUPERADMIN
2. Navigate to Settings > Outlets
3. Click "Add New Outlet"
4. Fill in outlet details:
   - Name, Code
   - Address information
   - Contact details
   - Tax information
   - Settings (currency, timezone, fiscal year)

## 👥 User Management

### Creating Users
1. Login as SUPERADMIN or ADMIN
2. Navigate to Settings > Users
3. Click "Add New User"
4. Select role and assign outlet (except SUPERADMIN)

### User Roles & Permissions

| Permission | SUPERADMIN | ADMIN | MANAGER | CASHIER | ACCOUNTANT | VIEWER |
|-----------|------------|-------|---------|---------|------------|--------|
| Manage All Outlets | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Outlets | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| View All Reports | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Manage Inventory | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Process Sales | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Process Purchases | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Accounting | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

*Within their outlet only

## 🔄 Data Flow

### Sales Transaction
1. Cashier creates sale
2. System checks product availability
3. Calculates totals and tax
4. Updates customer balance (if credit)
5. Reduces stock quantities
6. Creates accounting voucher (auto)
7. Generates invoice

### Purchase Transaction
1. Manager/Accountant creates purchase
2. System records supplier information
3. Updates supplier balance
4. Increases stock quantities
5. Creates accounting voucher (auto)

### Accounting Entries
All financial transactions create double-entry vouchers:
- Sales: Debit Cash/Customer, Credit Sales/Tax
- Purchases: Debit Purchases/Tax, Credit Cash/Supplier
- Payments: Debit Account Payable, Credit Bank/Cash
- Receipts: Debit Bank/Cash, Credit Account Receivable

## 📊 API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout
- GET `/api/auth/me` - Get current user

### Outlets
- GET `/api/outlets` - List outlets (SUPERADMIN sees all)
- POST `/api/outlets` - Create outlet (SUPERADMIN only)
- GET `/api/outlets/[id]` - Get outlet details
- PATCH `/api/outlets/[id]` - Update outlet
- DELETE `/api/outlets/[id]` - Deactivate outlet

### Products
- GET `/api/products` - List products (filtered by outlet)
- POST `/api/products` - Create product
- GET `/api/products/[id]` - Get product
- PATCH `/api/products/[id]` - Update product
- DELETE `/api/products/[id]` - Deactivate product

### Sales
- GET `/api/sales` - List sales
- POST `/api/sales` - Create sale
- GET `/api/sales/[id]` - Get sale
- PATCH `/api/sales/[id]` - Update sale (if DRAFT)
- DELETE `/api/sales/[id]` - Cancel sale

### Reports
- GET `/api/reports/profit-loss?start=YYYY-MM-DD&end=YYYY-MM-DD`
- GET `/api/reports/balance-sheet`
- GET `/api/reports/sales?groupBy=day|month|year`
- GET `/api/reports/stock?lowStockOnly=true`
- GET `/api/reports/customer-ledger`
- GET `/api/reports/cash-flow?start=YYYY-MM-DD&end=YYYY-MM-DD`

## 🚦 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables (Production)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/autocity-qatar
NEXTAUTH_SECRET=complex-production-secret
JWT_SECRET=complex-jwt-secret
NEXT_PUBLIC_APP_URL=https://autocityqatar.com
NODE_ENV=production
```

### Deploy to Vercel
```bash
vercel --prod
```

## 🔒 Security Features

- HTTP-only cookies for auth tokens
- Password hashing with bcrypt
- JWT token expiration
- Role-based access control
- Outlet data isolation
- Input validation
- SQL injection prevention (via Mongoose)
- XSS protection (React)

## 📝 License

MIT License - see LICENSE file

## 👨‍💻 Development

### Adding New Features
1. Create model in `lib/models/`
2. Add API routes in `app/api/`
3. Create UI pages in `app/autocityPro/`
4. Update permissions in `lib/types/roles.ts`

### Database Migrations
MongoDB doesn't require migrations, but for schema changes:
1. Update model in `lib/models/`
2. Create migration script if needed
3. Test thoroughly before deploying

## 🐛 Troubleshooting

### Cannot connect to MongoDB
- Check MongoDB is running
- Verify MONGODB_URI in `.env.local`
- Check network connectivity

### Login fails
- Verify user exists and is active
- Check password is correct
- Review server logs for errors

### Outlet access denied
- Verify user is assigned to outlet
- Check user role has permissions
- Confirm outlet is active

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Contact: dev@autocityqatar.com
