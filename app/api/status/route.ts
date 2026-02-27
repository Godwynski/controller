import { NextRequest, NextResponse } from 'next/server';
import ping from 'ping';

export async function POST(req: NextRequest) {
  try {
    const { host } = await req.json();

    if (!host) {
      return NextResponse.json({ error: 'Host (IP or hostname) is required' }, { status: 400 });
    }

    const res = await ping.promise.probe(host, {
      timeout: 2,
    });

    return NextResponse.json({ 
      alive: res.alive,
      time: res.time,
      host: res.host
    });
  } catch (error: any) {
    console.error('Ping Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to ping host' }, { status: 500 });
  }
}
