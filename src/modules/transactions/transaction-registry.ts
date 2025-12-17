import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionSubmission, TransactionState } from '../../core/models';
import { database } from '../database/connection';

export class TransactionRegistry {
    // Fallback to in-memory storage if database is not available
    private transactionStore: Map<string, Transaction> = new Map();

    async registerTransaction(request: TransactionSubmission): Promise<Transaction> {
        const transactionId = uuidv4();
        const currentTime = new Date();

        const transaction: Transaction = {
            id: transactionId,
            userId: 'user_123',
            type: 'market',
            tokenIn: request.tokenIn,
            tokenOut: request.tokenOut,
            amount: request.amount,
            status: 'pending',
            createdAt: currentTime,
            updatedAt: currentTime,
            retryCount: 0,
        };

        if (database.isInitialized()) {
            try {
                await database.query(
                    `INSERT INTO transactions (
            id, user_id, type, token_in, token_out, amount, status, 
            retry_count, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        transaction.id,
                        transaction.userId,
                        transaction.type,
                        transaction.tokenIn,
                        transaction.tokenOut,
                        transaction.amount,
                        transaction.status,
                        transaction.retryCount,
                        transaction.createdAt,
                        transaction.updatedAt,
                    ]
                );
                console.log(`[Registry] Transaction ${transactionId} saved to database`);
            } catch (error) {
                console.error('[Registry] Database insert failed, using memory:', error);
                this.transactionStore.set(transactionId, transaction);
            }
        } else {
            this.transactionStore.set(transactionId, transaction);
        }

        return transaction;
    }

    async findTransaction(transactionId: string): Promise<Transaction | undefined> {
        if (database.isInitialized()) {
            try {
                const result = await database.query('SELECT * FROM transactions WHERE id = $1', [
                    transactionId,
                ]);

                if (result.rows.length > 0) {
                    return this.mapRowToTransaction(result.rows[0]);
                }
            } catch (error) {
                console.error('[Registry] Database select failed, trying memory:', error);
            }
        }

        return this.transactionStore.get(transactionId);
    }

    async modifyTransaction(
        transactionId: string,
        updates: Partial<Transaction>
    ): Promise<Transaction> {
        updates.updatedAt = new Date();

        if (database.isInitialized()) {
            try {
                const fields: string[] = [];
                const values: any[] = [];
                let paramIndex = 1;

                if (updates.status !== undefined) {
                    fields.push(`status = $${paramIndex++}`);
                    values.push(updates.status);
                }
                if (updates.selectedDex !== undefined) {
                    fields.push(`selected_dex = $${paramIndex++}`);
                    values.push(updates.selectedDex);
                }
                if (updates.executedPrice !== undefined) {
                    fields.push(`executed_price = $${paramIndex++}`);
                    values.push(updates.executedPrice);
                }
                if (updates.txHash !== undefined) {
                    fields.push(`tx_hash = $${paramIndex++}`);
                    values.push(updates.txHash);
                }
                if (updates.errorMessage !== undefined) {
                    fields.push(`error_message = $${paramIndex++}`);
                    values.push(updates.errorMessage);
                }
                if (updates.retryCount !== undefined) {
                    fields.push(`retry_count = $${paramIndex++}`);
                    values.push(updates.retryCount);
                }

                fields.push(`updated_at = $${paramIndex++}`);
                values.push(updates.updatedAt);

                values.push(transactionId);

                const query = `
          UPDATE transactions 
          SET ${fields.join(', ')} 
          WHERE id = $${paramIndex}
          RETURNING *
        `;

                const result = await database.query(query, values);

                if (result.rows.length > 0) {
                    return this.mapRowToTransaction(result.rows[0]);
                }

                throw new Error(`Transaction ${transactionId} not found`);
            } catch (error) {
                console.error('[Registry] Database update failed, trying memory:', error);
            }
        }

        const transaction = this.transactionStore.get(transactionId);
        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        const modified: Transaction = {
            ...transaction,
            ...updates,
        };

        this.transactionStore.set(transactionId, modified);
        return modified;
    }

    async updateState(transactionId: string, newStatus: TransactionState): Promise<Transaction> {
        return await this.modifyTransaction(transactionId, { status: newStatus });
    }

    async markAsCompleted(
        transactionId: string,
        txHash: string,
        executedPrice: number
    ): Promise<Transaction> {
        return await this.modifyTransaction(transactionId, {
            status: 'confirmed',
            txHash,
            executedPrice,
        });
    }

    async markAsFailed(
        transactionId: string,
        errorMessage: string,
        retryCount: number
    ): Promise<Transaction> {
        return await this.modifyTransaction(transactionId, {
            status: 'failed',
            errorMessage,
            retryCount,
        });
    }

    validateTransactionRequest(request: TransactionSubmission): void {
        if (!request.tokenIn || !request.tokenOut) {
            throw new Error('Both tokenIn and tokenOut are required');
        }

        if (request.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if (request.tokenIn === request.tokenOut) {
            throw new Error('Cannot swap token with itself');
        }
    }

    async listPendingTransactions(): Promise<Transaction[]> {
        const pendingStates: TransactionState[] = ['pending', 'routing', 'building', 'submitted'];

        if (database.isInitialized()) {
            try {
                const result = await database.query(
                    'SELECT * FROM transactions WHERE status = ANY($1) ORDER BY created_at DESC',
                    [pendingStates]
                );

                return result.rows.map((row: any) => this.mapRowToTransaction(row));
            } catch (error) {
                console.error('[Registry] Database select failed, using memory:', error);
            }
        }

        const allTransactions = Array.from(this.transactionStore.values());
        return allTransactions.filter((transaction) => pendingStates.includes(transaction.status));
    }

    async retrieveAllTransactions(): Promise<Transaction[]> {
        if (database.isInitialized()) {
            try {
                const result = await database.query(
                    'SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1000'
                );

                return result.rows.map((row: any) => this.mapRowToTransaction(row));
            } catch (error) {
                console.error('[Registry] Database select failed, using memory:', error);
            }
        }

        return Array.from(this.transactionStore.values());
    }

    private mapRowToTransaction(row: any): Transaction {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amount: parseFloat(row.amount),
            status: row.status,
            selectedDex: row.selected_dex,
            executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
            txHash: row.tx_hash,
            errorMessage: row.error_message,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            retryCount: row.retry_count,
        };
    }
}

export const transactionRegistry = new TransactionRegistry();
