import { DatabaseService, HistoryItem, PaginatedResult, PaginationParams } from "@/utils/types";
import { SQLiteDatabase } from "expo-sqlite";

export const databaseHelper: DatabaseService = {
    migrateDbIfNeeded: async (db: SQLiteDatabase) => {
        const DATABASE_VERSION = 1;
        let result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        let currentDbVersion = result ? result.user_version : 0;

        if (currentDbVersion >= DATABASE_VERSION) return;

        if (currentDbVersion === 0) {
            await db.execAsync(`
                PRAGMA journal_mode = 'wal';
                CREATE TABLE history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    imgUrl TEXT NOT NULL,
                    text TEXT NOT NULL,
                    audiobase64 TEXT NOT NULL
                )
            `);

            currentDbVersion = 1;
            await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
        }
    },

    addHistoryItem: async (db: SQLiteDatabase, item: HistoryItem): Promise<number> => {
        try {
            const result = await db.runAsync(
                `INSERT INTO history (imgUrl, text, audiobase64) VALUES (?, ?, ?)`,
                [item.imgUrl, item.text, item.audiobase64]
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error adding history item:', error);
            throw error;
        }
    },

    getHistoryItems: async (db: SQLiteDatabase, { offset, limit }: PaginationParams): Promise<PaginatedResult> => {
        try {
            const totalResult = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM history'
            );
            const total = totalResult?.count || 0;

            const items = await db.getAllAsync<HistoryItem>(
                'SELECT * FROM history ORDER BY id DESC LIMIT ? OFFSET ?',
                [limit, offset]
            );

            return {
                items: items || [],
                total
            };
        } catch (error) {
            console.error('Error getting history items:', error);
            throw error;
        }
    },

    getHistoryItemById: async (db: SQLiteDatabase, id: number): Promise<HistoryItem | null> => {
        try {
            const result = await db.getFirstAsync<HistoryItem>(
                'SELECT * FROM history WHERE id = ?',
                [id]
            );
            return result || null;
        } catch (error) {
            console.error('Error getting history item by id:', error);
            throw error;
        }
    },

    deleteHistoryItem: async (db: SQLiteDatabase, id: number): Promise<boolean> => {
        try {
            const result = await db.runAsync(
                'DELETE FROM history WHERE id = ?',
                [id]
            );
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting history item:', error);
            throw error;
        }
    },

}