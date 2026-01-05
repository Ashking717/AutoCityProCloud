// Import all models to ensure they're registered with Mongoose
// This file should be imported early in the application lifecycle

import User from './User';
import Outlet from './Outlet';
import Product from './ProductEnhanced';
import Category from './Category';
import Customer from './Customer';
import Supplier from './Supplier';
import Sale from './Sale';
import Purchase from './Purchase';
import Account from './Account';
import Voucher from './Voucher';

// Export all models
export {
  User,
  Outlet,
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  Purchase,
  Account,
  Voucher,
};

// Initialize function to ensure all models are loaded
export function initializeModels() {
  // Simply importing the models above registers them with Mongoose
  return {
    User,
    Outlet,
    Product,
    Category,
    Customer,
    Supplier,
    Sale,
    Purchase,
    Account,
    Voucher,
  };
}
