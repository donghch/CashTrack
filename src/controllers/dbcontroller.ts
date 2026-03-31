import { drizzle } from "drizzle-orm/d1";
import { transactions } from "../model/db/schema.js";
import { eq } from "drizzle-orm"

export interface Env {
    DB: D1Database;
}

/* transactions */

/**
 * Get a transaction by ID
 * @param env 
 * @param id Transaction ID
 * @returns Transaction data or null if not found
 */
const getTransaction = async(env: Env, id: number) => {
    const db = drizzle(env.DB);
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result.length > 0 ? result[0] : null;
}

type NewTransaction = typeof transactions.$inferInsert;

/**
 * Create a new transaction
 * @param env 
 * @param transactionData Transaction data to insert
 * @returns Result of the insert operation
 */
const createTransaction = async(env: Env, transactionData: NewTransaction) => {
    const db = drizzle(env.DB);
    const result = await db.insert(transactions).values(transactionData);
    return result;
}

const filterTransactions = async(env: Env, filter: Partial<NewTransaction>) => {
    const db = drizzle(env.DB);
    let query = db.select().from(transactions);
}


export {
    getTransaction,
    createTransaction,
}