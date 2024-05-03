import { createPool } from "mysql2/promise";

export default () => {
    const connection = createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 30
    });

    return connection;
}