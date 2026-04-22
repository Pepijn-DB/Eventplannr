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
async function setupSql(filePath: string): Promise<void> {
    await queryWithoutExecutioner(`CREATE DATABASE ${dbConfig.database}`);
    fs.readFile(filePath, "utf-8", async (err, data) => {
        if (err) {
            console.error("Error reading schema.sql:", err);
            return false;
        }
        const queries = data.split(";").map(q => q.trim()).filter(q => q.length > 0);
        for (const query of queries) {
            try {
                await queryWithoutExecutioner(query);
            } catch (err) {
                console.error("Error executing query:", query, err);
                return false;
            }
        }
    });
}