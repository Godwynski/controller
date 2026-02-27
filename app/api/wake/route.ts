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

    console.log(`[WOL] Target MAC: ${normalizedMac}`);
    console.log(`[WOL] Primary target address: ${address || '255.255.255.255'}`);
    
    try {
      // Try primary send (either provided address or default broadcast)
      await wol(normalizedMac, options);
      console.log(`[WOL] Packet successfully sent to ${address || 'broadcast'}`);
    } catch (sendError: any) {
      console.error(`[WOL] Primary send failed: ${sendError.message} (Code: ${sendError.code})`);
      
      // Fallback Strategy for Windows EPERM or network restrictions
      const fallbacks = ['255.255.255.255', '192.168.1.255'];
      
      for (const fallbackAddr of fallbacks) {
        if (address === fallbackAddr) continue; // Skip if we already tried this
        
        try {
          console.log(`[WOL] Attempting fallback broadcast to: ${fallbackAddr}...`);
          await wol(normalizedMac, { ...options, address: fallbackAddr });
          console.log(`[WOL] Fallback successful via ${fallbackAddr}`);
          return NextResponse.json({ 
            message: `Wake-on-LAN packet sent to ${normalizedMac} via fallback ${fallbackAddr}`,
            warning: `Primary send to ${address || 'default'} failed: ${sendError.message}`
          });
        } catch (fallbackError: any) {
          console.error(`[WOL] Fallback to ${fallbackAddr} failed: ${fallbackError.message}`);
        }
      }
      
      throw sendError; // If everything fails, throw the original error
    }

    return NextResponse.json({ message: `Wake-on-LAN packet sent to ${normalizedMac}` });
  } catch (error: any) {
    console.error('[WOL] Final error handler:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send WOL packet',
      code: error.code
    }, { status: 500 });
  }
}
