import { drizzle } from "drizzle-orm/d1";
import { and, between, desc, asc, eq, like, gt, lt, sql, inArray } from "drizzle-orm";
import { transactions, items, itemCategories } from "../model/db/schema.js";
import type { TransactionFilter } from "../model/types/request.js";
import type { TransactionWithItems } from "../model/types/response.js";

// Env is defined globally in worker-configuration.d.ts

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

/**
 * Helper function to resolve category filter (number ID or string name)
 * @param db Database instance
 * @param categoryFilter Category ID or name
 * @returns Category ID or null if not found
 */
const getCategoryIdFromFilter = async (
  db: ReturnType<typeof drizzle>,
  categoryFilter: number | string
): Promise<number | null> => {
  if (typeof categoryFilter === "number") {
    return categoryFilter;
  }
  
  // Look up category by name
  const category = await db.select()
    .from(itemCategories)
    .where(eq(itemCategories.name, categoryFilter))
    .limit(1);
  
  return category[0]?.id ?? null;
};

/**
 * Filter transactions with dynamic query building based on filter parameters
 * @param env Environment with database connection
 * @param filter Filter parameters including pagination, sorting, and filtering options
 * @returns Object containing filtered transactions and total count
 */
const filterTransactions = async (
  env: Env,
  filter: TransactionFilter
): Promise<{
  transactions: TransactionWithItems[];
  total: number;
}> => {
  const db = drizzle(env.DB);
  
  // Build WHERE conditions array
  const conditions = [];
  
  // Date range filtering
  if (filter.startDate && filter.endDate) {
    conditions.push(between(transactions.transactionTime, filter.startDate, filter.endDate));
  } else if (filter.startDate) {
    conditions.push(gt(transactions.transactionTime, filter.startDate));
  } else if (filter.endDate) {
    conditions.push(lt(transactions.transactionTime, filter.endDate));
  }
  
  // Merchant partial match (case-insensitive)
  if (filter.merchant) {
    conditions.push(like(transactions.merchant, `%${filter.merchant}%`));
  }
  
  // Currency exact match
  if (filter.currency) {
    conditions.push(eq(transactions.currency, filter.currency));
  }
  
  // Amount range filtering
  if (filter.minAmount !== undefined) {
    conditions.push(gt(transactions.totalMinor, filter.minAmount));
  }
  if (filter.maxAmount !== undefined) {
    conditions.push(lt(transactions.totalMinor, filter.maxAmount));
  }
  
  // Category filtering
  if (filter.category !== undefined) {
    const categoryId = await getCategoryIdFromFilter(db, filter.category);
    if (categoryId !== null) {
      // Get transaction IDs that have items with this category
      const transactionIdsWithCategory = await db
        .select({ transactionId: items.transactionId })
        .from(items)
        .where(eq(items.categoryId, categoryId))
        .groupBy(items.transactionId);
      
      if (transactionIdsWithCategory.length > 0) {
        const ids = transactionIdsWithCategory.map(row => row.transactionId);
        conditions.push(inArray(transactions.id, ids));
      } else {
        // If no transactions have this category, return empty result
        return { transactions: [], total: 0 };
      }
    } else {
      // Category not found, return empty result
      return { transactions: [], total: 0 };
    }
  }
  
  // Build ORDER BY clause
  let orderBy;
  switch (filter.sortBy) {
    case "totalMinor":
      orderBy = filter.sortOrder === "asc" 
        ? asc(transactions.totalMinor) 
        : desc(transactions.totalMinor);
      break;
    case "merchant":
      orderBy = filter.sortOrder === "asc"
        ? asc(transactions.merchant)
        : desc(transactions.merchant);
      break;
    case "transactionTime":
    default:
      orderBy = filter.sortOrder === "asc"
        ? asc(transactions.transactionTime)
        : desc(transactions.transactionTime);
      break;
  }
  
  // Get total count of matching records
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(conditions.length ? and(...conditions) : undefined);
  
  const total = countResult[0]?.count ?? 0;
  
  // Get paginated transactions
  const transactionsData = await db
    .select()
    .from(transactions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(filter.limit)
    .offset(filter.offset);
  
  // If includeItems is true and we have transactions, fetch items and categories
  if (filter.includeItems && transactionsData.length > 0) {
    const transactionIds = transactionsData.map(t => t.id);
    
    // Fetch all items for these transactions with their categories
    const itemsWithCategories = await db
      .select({
        item: items,
        category: itemCategories
      })
      .from(items)
      .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
      .where(inArray(items.transactionId, transactionIds));
    
    // Group items by transaction ID
    const itemsByTransactionId = new Map<number, Array<{
      item: typeof items.$inferSelect;
      category?: typeof itemCategories.$inferSelect | null;
    }>>();
    
    for (const { item, category } of itemsWithCategories) {
      if (!itemsByTransactionId.has(item.transactionId)) {
        itemsByTransactionId.set(item.transactionId, []);
      }
      itemsByTransactionId.get(item.transactionId)!.push({ item, category: category || null });
    }
    
    // Build TransactionWithItems array
    const transactionsWithItems: TransactionWithItems[] = transactionsData.map(transaction => ({
      transaction,
      items: itemsByTransactionId.get(transaction.id) || []
    }));
    
    return { transactions: transactionsWithItems, total };
  }
  
  // Return transactions without items
  const transactionsWithoutItems: TransactionWithItems[] = transactionsData.map(transaction => ({
    transaction
    // items is optional, so we omit it when includeItems is false
  }));
  
  return { transactions: transactionsWithoutItems, total };
}

export {
    getTransaction,
    createTransaction,
    filterTransactions,
}