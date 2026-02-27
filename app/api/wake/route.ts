import { NextRequest, NextResponse } from 'next/server';
import wol from 'wakeonlan';
import os from 'os';

/**
 * Discovers all IPv4 broadcast addresses for all non-internal network interfaces.
 */
function getBroadcastAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const broadcasts = new Set<string>();
  
  // Always include global broadcast
  broadcasts.add('255.255.255.255');
  
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.netmask) {
        try {
          const ipParts = net.address.split('.').map(Number);
          const maskParts = net.netmask.split('.').map(Number);
          if (ipParts.length === 4 && maskParts.length === 4) {
            const broadcastParts = ipParts.map((part, i) => (part | (~maskParts[i] & 255)));
            broadcasts.add(broadcastParts.join('.'));
          }
        } catch (e) {
          console.error(`[WOL] Failed to calculate broadcast for interface ${name}:`, e);
        }
      }
    }
  }
  return Array.from(broadcasts);
}

export async function POST(req: NextRequest) {
  try {
    const { mac, address } = await req.json();
    
    if (!mac) {
      return NextResponse.json({ error: 'MAC address is required' }, { status: 400 });
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(mac)) {
      return NextResponse.json({ error: 'Invalid MAC address format' }, { status: 400 });
    }

    // Normalize for the 'wol' library
    const normalizedMac = mac.replace(/[:-]/g, '').match(/.{1,2}/g)?.join(':') || mac;

    console.log(`[WOL] Triggered for MAC: ${normalizedMac}`);
    
    const broadcastAddresses = getBroadcastAddresses();
    console.log(`[WOL] Discovered potential broadcast targets: ${broadcastAddresses.join(', ')}`);

    const results: { address: string; success: boolean; error?: string }[] = [];

    // Strategy: Attempt to send to the specifically requested host first if provided
    if (address && !broadcastAddresses.includes(address)) {
      try {
        console.log(`[WOL] Attempting primary targeted send to: ${address}`);
        await wol(normalizedMac, { address });
        results.push({ address, success: true });
        console.log(`[WOL] Targeted send to ${address} succeeded`);
      } catch (err: any) {
        console.warn(`[WOL] Targeted send to ${address} failed: ${err.message}`);
        results.push({ address, success: false, error: err.message });
      }
    }

    // Then, attempt to send to ALL discovered broadcast addresses
    // This ensures maximum reach in multihomed/bridged environments
    for (const targetAddr of broadcastAddresses) {
      try {
        console.log(`[WOL] Dispatching to broadcast: ${targetAddr}...`);
        await wol(normalizedMac, { address: targetAddr });
        results.push({ address: targetAddr, success: true });
        console.log(`[WOL] Dispatch to ${targetAddr} successful`);
      } catch (err: any) {
        // EPERM is common on Windows for certain interfaces (like APIPA 169.254.x.x)
        console.error(`[WOL] Dispatch to ${targetAddr} failed: ${err.message} (Code: ${err.code})`);
        results.push({ address: targetAddr, success: false, error: err.message });
      }
    }

    const anySuccess = results.some(r => r.success);
    
    if (anySuccess) {
      return NextResponse.json({ 
        message: `Wake-on-LAN packets dispatched.`,
        details: results 
      });
    } else {
      const errorMsg = results.map(r => `${r.address}: ${r.error}`).join('; ');
      return NextResponse.json({ 
        error: `Failed to dispatch WOL magic packet to any target.`,
        details: errorMsg
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[WOL] Fatal error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error during WOL'
    }, { status: 500 });
  }
}
