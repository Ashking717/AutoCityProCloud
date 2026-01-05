import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';

export async function GET() {
  try {
    await connectDB();

    return NextResponse.json({
      status: 'ok',
      dbState: mongoose.connection.readyState,
      dbName: mongoose.connection.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
