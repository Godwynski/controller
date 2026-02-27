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
    
    try {
      await wol(normalizedMac, options);
    } catch (sendError: any) {
      console.error(`Initial WOL send failed for ${address || 'broadcast'}:`, sendError.message);
      
      // If we tried a specific address and it failed (like EPERM on Windows), fallback to broadcast
      if (address && address !== '255.255.255.255') {
        console.log(`Attempting fallback broadcast for ${normalizedMac}...`);
        await wol(normalizedMac, { ...options, address: '255.255.255.255' });
        return NextResponse.json({ 
          message: `Wake-on-LAN packet sent to ${normalizedMac} via broadcast (Direct send to ${address} failed)`,
          warning: `Direct send to ${address} failed with: ${sendError.message}. Fell back to broadcast.`
        });
      }
      throw sendError; // Re-throw if it wasn't a specific address or if broadcast also fails
    }

    console.log(`WOL packet successfully dispatched to ${normalizedMac}`);

    return NextResponse.json({ message: `Wake-on-LAN packet sent to ${normalizedMac} ${address ? 'via ' + address : ''}` });
  } catch (error: any) {
    console.error('WOL Error stack:', error.stack || error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send WOL packet',
      code: error.code
    }, { status: 500 });
  }
}
