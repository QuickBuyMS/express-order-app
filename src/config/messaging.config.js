import { ClientProxyFactory, Transport } from '@nestjs/microservices';

/**
 * Reads the TRANSPORT_TYPE env var (default: 'TCP') and returns the active transport mode.
 * @returns {'TCP' | 'RMQ'}
 */
export function getTransportType() {
  const type = (process.env.TRANSPORT_TYPE || 'TCP').toUpperCase();
  if (type !== 'TCP' && type !== 'RMQ') {
    console.warn(`[Messaging] Unknown TRANSPORT_TYPE "${type}", falling back to TCP`);
    return 'TCP';
  }
  return type;
}

/**
 * Creates the auth microservice ClientProxy based on the TRANSPORT_TYPE feature flag.
 * - TCP: connects to AUTH_TCP_HOST:5001
 * - RMQ: connects to RABBITMQ_URL with queue 'auth_queue'
 * @returns {import('@nestjs/microservices').ClientProxy}
 */
export function createAuthClient() {
  const transportType = getTransportType();

  if (transportType === 'RMQ') {
    const rmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    console.log(`[Messaging] Transport: RMQ → ${rmqUrl} (queue: auth_queue)`);
    return ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
        queue: 'auth_queue',
        queueOptions: { durable: false },
      },
    });
  }

  // Default: TCP
  const host = process.env.AUTH_TCP_HOST || '127.0.0.1';
  console.log(`[Messaging] Transport: TCP → ${host}:5001`);
  return ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host, port: 5001 },
  });
}
