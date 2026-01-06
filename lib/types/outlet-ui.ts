export interface OutletUI {
  _id: string;

  name: string;
  code: string;

  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  contact: {
    phone: string;
    email: string;
    manager: string;
  };

  taxInfo: {
    taxId: string;
    gstNumber?: string;
  };

  settings: {
    currency: string;
    timezone: string;
    fiscalYearStart: Date;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}