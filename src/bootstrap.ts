import fastifyWebsocket from '@fastify/websocket';
import Fastify from 'fastify';
import { transactionWorker } from './workers/transaction-worker';
import { transactionRegistry } from './modules/transactions/transaction-registry';
import { realtimeBroadcaster } from './modules/notifications/realtime-broadcaster';
import { TransactionSubmission } from './core/models';

export async function initializeApplication() {
    const fastify = Fastify({ logger: true });
    await fastify.register(fastifyWebsocket);

    fastify.get('/status', async () => {
        return { status: 'ok', timestamp: new Date() };
    });

    fastify.get('/metrics', async () => {
        const queueMetrics = await transactionWorker.retrieveMetrics();
        const pendingTransactions = await transactionRegistry.listPendingTransactions();
        const allTransactions = await transactionRegistry.retrieveAllTransactions();

        return {
            queue: queueMetrics,
            websockets: realtimeBroadcaster.countActiveSubscriptions(),
            activeTransactions: pendingTransactions.length,
            totalTransactions: allTransactions.length,
        };
    });

    fastify.get<{ Params: { transactionId: string } }>(
        '/transactions/:transactionId',
        async (request, reply) => {
            const transaction = await transactionRegistry.findTransaction(
                request.params.transactionId
            );
            if (!transaction) {
                return reply.status(404).send({ error: 'Not found' });
            }
            return transaction;
        }
    );

    fastify.register(async (fastify) => {
        fastify.get('/api/transactions/process', { websocket: true }, (socket, request) => {
            console.log('[API] WebSocket session initiated');

            socket.send(
                JSON.stringify({
                    type: 'session_established',
                    message: 'Connected to Transaction Processor. Send your transaction as JSON.',
                })
            );

            socket.on('message', async (message: Buffer) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log('[API] Received transaction request:', data);

                    transactionRegistry.validateTransactionRequest(data as TransactionSubmission);

                    const transaction = await transactionRegistry.registerTransaction(
                        data as TransactionSubmission
                    );
                    console.log(`[API] Transaction registered: ${transaction.id}`);

                    socket.send(
                        JSON.stringify({
                            type: 'transaction_registered',
                            transactionId: transaction.id,
                            status: 'pending',
                            message: `Transaction submitted: ${transaction.id}`,
                        })
                    );

                    realtimeBroadcaster.subscribeClient(transaction.id, socket as any);

                    await transactionWorker.enqueueTransaction(transaction);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    console.error('[API] Validation error:', errorMsg);

                    socket.send(
                        JSON.stringify({
                            type: 'validation_failed',
                            error: errorMsg,
                        })
                    );
                }
            });

            socket.on('error', (error: Error) => {
                console.error('[API] WebSocket error:', error);
            });

            socket.on('close', () => {
                console.log('[API] WebSocket session terminated');
            });
        });
    });

    return fastify;
}
