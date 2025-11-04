"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface SSEMessage {
  type: string;
  [key: string]: any;
}

export function useServerSentEvents() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      console.log('SSE: No session user ID, skipping connection');
      return;
    }

    console.log('SSE: Attempting to connect for user:', session.user.id);

    const connectSSE = () => {
      try {
        console.log('SSE: Creating EventSource connection');
        const eventSource = new EventSource('/api/notifications/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('SSE connected successfully');
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          console.log('SSE raw message received:', event.data);
          try {
            const data: SSEMessage = JSON.parse(event.data);
            console.log('SSE parsed message:', data);
            handleSSEMessage(data);
          } catch (err) {
            console.error('Error parsing SSE message:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('SSE error:', err);
          console.log('SSE readyState:', eventSource.readyState);
          console.log('SSE url:', eventSource.url);
          setIsConnected(false);
          setError('Connection lost. Reconnecting...');
          
          // Reconnect after 3 seconds
          setTimeout(() => {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
            console.log('Attempting to reconnect SSE...');
            connectSSE();
          }, 3000);
        };

      } catch (err) {
        console.error('Error connecting to SSE:', err);
        setError('Failed to connect to notifications');
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [session?.user?.id]);

  const handleSSEMessage = useCallback((data: SSEMessage) => {
    // This will be handled by the notification context
    // We'll dispatch a custom event that the context can listen to
    console.log('SSE message received:', data);
    window.dispatchEvent(new CustomEvent('sse-notification', { detail: data }));
  }, []);

  return { isConnected, error };
}
