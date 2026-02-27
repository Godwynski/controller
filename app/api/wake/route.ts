import { NextRequest, NextResponse } from 'next/server';
import wol from 'wakeonlan';

export async function POST(req: NextRequest) {
  try {
    const { mac } = await req.json();

    if (!mac) {
      return NextResponse.json({ error: 'MAC address is required' }, { status: 400 });
    }

    // Validate MAC address format (basic)
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(mac)) {
      return NextResponse.json({ error: 'Invalid MAC address format' }, { status: 400 });
    }

    await wol(mac);

    return NextResponse.json({ message: `Wake-on-LAN packet sent to ${mac}` });
  } catch (error: any) {
    console.error('WOL Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send WOL packet' }, { status: 500 });
  }
}
