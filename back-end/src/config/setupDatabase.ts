export async function setupDatabase():Promise<boolean> {
    try {
        const connected = await db.connect();
        if (!connected) return false;

        if (dbConfig.type === "postgres") {
            return await setupPostgres();
        } else if (dbConfig.type === "mysql") {
            return await setupMySQL();
        }
    } catch (_err) {
        return false;
    }
    throw new Error("Unsupported database type");
}