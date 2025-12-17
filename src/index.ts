import 'dotenv/config';
import { initializeApplication } from './bootstrap';
import { transactionWorker } from './workers/transaction-worker';
import { realtimeBroadcaster } from './modules/notifications/realtime-broadcaster';
import { database } from './modules/database/connection';
import { config } from './config/environment';

const SERVER_PORT = parseInt(process.env.PORT || '') || config.server.port;
const SERVER_HOST = config.server.host;

async function startServer() {
    try {
        try {
            await database.initialize();
        } catch (dbError) {
            console.warn('[Server] Database initialization failed, using in-memory storage');
        }

        const fastify = await initializeApplication();
        await transactionWorker.initialize();
        await fastify.listen({ port: SERVER_PORT, host: SERVER_HOST });

        const isProduction = process.env.NODE_ENV === 'production';
        const protocol = isProduction ? 'https' : 'http';
        const wsProtocol = isProduction ? 'wss' : 'ws';
        const publicUrl = process.env.PUBLIC_URL || `${protocol}://${SERVER_HOST}:${SERVER_PORT}`;
        const wsUrl = process.env.PUBLIC_URL
            ? publicUrl.replace('https://', 'wss://').replace('http://', 'ws://')
            : `${wsProtocol}://${SERVER_HOST}:${SERVER_PORT}`;

        console.log('\n✓ Server operational!');
        console.log(`\n📍 Server Address: ${publicUrl}`);
        console.log('\n📊 Available Endpoints:');
        console.log(`  GET  ${publicUrl}/status`);
        console.log(`  GET  ${publicUrl}/metrics`);
        console.log(`  GET  ${publicUrl}/transactions/:transactionId`);
        console.log(`  WS   ${wsUrl}/api/transactions/process\n`);

        process.on('SIGTERM', async () => {
            console.log('\nInitiating graceful shutdown...');
            realtimeBroadcaster.disconnectAllClients();
            await transactionWorker.terminate();
            await database.close();
            await fastify.close();
            process.exit(0);
        });
    } catch (error) {
        console.error('Server initialization failed:', error);
        process.exit(1);
    }
}

startServer();
