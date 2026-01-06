export interface CustomerUI {
  _id: string;
  outletId: string;

  name: string;
  code: string;
  phone?: string;

  // Vehicle info (USED IN INVOICE)
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVIN?: string;

  creditLimit: number;
  currentBalance: number;
  isActive: boolean;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}