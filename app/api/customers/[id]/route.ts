import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Customer from '@/lib/models/Customer';
import { connectDB } from '@/lib/db/mongodb';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(params.id).lean();

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // ✅ UI-safe response
    return NextResponse.json({
      customer: {
        name: customer.name,
        phone: customer.phone,
        vehicleRegistrationNumber: customer.vehicleRegistrationNumber,
        vehicleMake: customer.vehicleMake,
        vehicleModel: customer.vehicleModel,
        vehicleYear: customer.vehicleYear,
        vehicleColor: customer.vehicleColor,
      },
    });
  } catch (error) {
    console.error('Customer fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}