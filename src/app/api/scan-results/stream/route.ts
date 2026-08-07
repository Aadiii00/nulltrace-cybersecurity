import { createClient } from '@/lib/supabase/server';
import { scanEvents } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Broadcast listener callback
        const onNewScan = (data: { userId: string; scan: any }) => {
          if (data.userId === user.id) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data.scan)}\n\n`));
            } catch (e) {
              console.error('Error writing scan event to client SSE stream:', e);
            }
          }
        };

        // Send a ping comment every 15 seconds to prevent client/gateway timeouts
        const intervalId = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch (e) {
            clearInterval(intervalId);
          }
        }, 15000);

        // Bind listener
        scanEvents.on('new-scan', onNewScan);

        // Listen for client disconnect
        req.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          scanEvents.off('new-scan', onNewScan);
          try {
            controller.close();
          } catch (e) {}
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    console.error('API Error in GET /api/scan-results/stream:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
