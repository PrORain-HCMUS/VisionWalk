import { SQLiteDatabase } from "expo-sqlite";

export interface ServerResponse {
    audio: string;
    text: string
}

export interface UserProfile {
    name: string,
    dateOfBirth: string,
    avatar: string,
    phoneNumber: string
}

export interface HistoryItem {
    id: number,
    imgUrl: string,
    text: string,
    audiobase64: string
}

export interface PaginationParams {
    offset: number;
    limit: number;
}

export interface PaginatedResult {
    items: HistoryItem[];
    total: number;
}

export interface DatabaseService {
    migrateDbIfNeeded: (db: SQLiteDatabase) => Promise<void>;
    addHistoryItem: (db: SQLiteDatabase, item: HistoryItem) => Promise<number>;
    getHistoryItems: (db: SQLiteDatabase, params: PaginationParams) => Promise<PaginatedResult>;
    getHistoryItemById: (db: SQLiteDatabase, id: number) => Promise<HistoryItem | null>;
    deleteHistoryItem: (db: SQLiteDatabase, id: number) => Promise<boolean>;
}