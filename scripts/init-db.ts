import { connectDB } from '../lib/db/mongodb';
import Outlet from '../lib/models/Outlet';
import User from '../lib/models/User';
import Account, { AccountType, AccountSubType } from '../lib/models/Account';
import { UserRole } from '../lib/types/roles';

async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check if superadmin exists
    const existingSuperadmin = await User.findOne({ role: UserRole.SUPERADMIN });
    
    if (existingSuperadmin) {
      console.log('ℹ️  Superadmin user already exists');
      console.log('   Email:', existingSuperadmin.email);
      return;
    }

    console.log('👤 Creating superadmin user...');
    
    const superadmin = await User.create({
      email: 'admin@autocityqatar.com',
      username: 'superadmin',
      password: 'Admin@123456', // Change this in production!
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPERADMIN,
      outletId: null,
      isActive: true,
    });

    console.log('✅ Superadmin created successfully');
    console.log('   Email:', superadmin.email);
    console.log('   Username:', superadmin.username);
    console.log('   Password: Admin@123456 (PLEASE CHANGE THIS!)');
    console.log('');

    // Create demo outlet
    console.log('🏪 Creating demo outlet...');
    
    const outlet = await Outlet.create({
      name: 'AutoCity Main Branch',
      code: 'MAIN',
      address: {
        street: 'Industrial Area Street 47',
        city: 'Doha',
        state: 'Doha',
        country: 'Qatar',
        postalCode: '00000',
      },
      contact: {
        phone: '+974 4000 0000',
        email: 'main@autocityqatar.com',
        manager: 'John Doe',
      },
      taxInfo: {
        taxId: 'QAT-123456789',
        gstNumber: '',
      },
      settings: {
        currency: 'QAR',
        timezone: 'Asia/Qatar',
        fiscalYearStart: new Date(new Date().getFullYear(), 0, 1),
      },
      isActive: true,
    });

    console.log('✅ Demo outlet created');
    console.log('   Name:', outlet.name);
    console.log('   Code:', outlet.code);
    console.log('');

    // Create default chart of accounts
    console.log('📊 Creating default chart of accounts...');
    
    const defaultAccounts = [
      // Assets
      { code: 'CASH-001', name: 'Cash in Hand', type: AccountType.ASSET, subType: AccountSubType.CASH },
      { code: 'BANK-001', name: 'Bank Account - Main', type: AccountType.ASSET, subType: AccountSubType.BANK },
      { code: 'AR-001', name: 'Accounts Receivable', type: AccountType.ASSET, subType: AccountSubType.ACCOUNTS_RECEIVABLE },
      { code: 'INV-001', name: 'Inventory', type: AccountType.ASSET, subType: AccountSubType.INVENTORY },
      
      // Liabilities
      { code: 'AP-001', name: 'Accounts Payable', type: AccountType.LIABILITY, subType: AccountSubType.ACCOUNTS_PAYABLE },
      
      // Equity
      { code: 'EQ-001', name: 'Owner Equity', type: AccountType.EQUITY, subType: AccountSubType.OWNER_EQUITY },
      { code: 'RE-001', name: 'Retained Earnings', type: AccountType.EQUITY, subType: AccountSubType.RETAINED_EARNINGS },
      
      // Revenue
      { code: 'REV-001', name: 'Sales Revenue', type: AccountType.REVENUE, subType: AccountSubType.SALES_REVENUE },
      { code: 'REV-002', name: 'Service Revenue', type: AccountType.REVENUE, subType: AccountSubType.SERVICE_REVENUE },
      
      // Expenses
      { code: 'EXP-001', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, subType: AccountSubType.COGS },
      { code: 'EXP-002', name: 'Rent Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
      { code: 'EXP-003', name: 'Utilities', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
      { code: 'EXP-004', name: 'Salaries', type: AccountType.EXPENSE, subType: AccountSubType.ADMIN_EXPENSE },
    ];

    for (const account of defaultAccounts) {
      await Account.create({
        outletId: outlet._id,
        ...account,
        isSystem: true,
        isActive: true,
      });
    }

    console.log(`✅ Created ${defaultAccounts.length} default accounts`);
    console.log('');

    // Create demo admin for the outlet
    console.log('👤 Creating demo outlet admin...');
    
    const outletAdmin = await User.create({
      email: 'admin@main.autocityqatar.com',
      username: 'outletadmin',
      password: 'Admin@123456', // Change this in production!
      firstName: 'Outlet',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      outletId: outlet._id,
      isActive: true,
    });

    console.log('✅ Outlet admin created');
    console.log('   Email:', outletAdmin.email);
    console.log('   Username:', outletAdmin.username);
    console.log('   Password: Admin@123456 (PLEASE CHANGE THIS!)');
    console.log('');

    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Login as superadmin: admin@autocityqatar.com');
    console.log('   2. Login as outlet admin: admin@main.autocityqatar.com');
    console.log('   3. Change default passwords immediately!');
    console.log('   4. Start adding products, customers, and processing sales');
    console.log('');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export default initializeDatabase;
