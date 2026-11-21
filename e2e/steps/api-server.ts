import { fileURLToPath } from 'node:url'

// Shared by playwright.config.ts and the steps, so both reach the same database file.
export const API_DATA_DIR = fileURLToPath(new URL('../.data', import.meta.url))
export const API_DATABASE_PATH = `${API_DATA_DIR}/heavy-duty.e2e.sqlite`
