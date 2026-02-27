import { NextRequest, NextResponse } from 'next/server';
import wol from 'wakeonlan';

export async function POST(req: NextRequest) {
  try {
    const { mac, address } = await req.json();
    
    if (!mac) {
      return NextResponse.json({ error: 'MAC address is required' }, { status: 400 });
    }

    // Validate MAC address format (flexible: supports 12 hex chars with optional delimiters)
    const macRegex = /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(mac)) {
      return NextResponse.json({ error: 'Invalid MAC address format' }, { status: 400 });
    }

    // Normalize for the 'wol' library (it usually expects colons)
    const normalizedMac = mac.replace(/[:-]/g, '').match(/.{1,2}/g)?.join(':') || mac;

    const options: any = {};
    if (address) {
      options.address = address;
    }

    console.log(`Sending WOL magic packet to: ${normalizedMac} (Target: ${address || 'broadcast'})`);
    await wol(normalizedMac, options);
    console.log(`WOL packet successfully dispatched to ${normalizedMac}`);

    return NextResponse.json({ message: `Wake-on-LAN packet sent to ${normalizedMac} ${address ? 'via ' + address : ''}` });
  } catch (error: any) {
    console.error('WOL Error stack:', error.stack || error);
    return NextResponse.json({ error: error.message || 'Failed to send WOL packet' }, { status: 500 });
  }
}
