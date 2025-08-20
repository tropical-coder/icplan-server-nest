import { DataSource } from "typeorm";
import { createClient, RedisClientType } from "redis";
import { appEnv } from "../helpers/EnvHelper";
import { config } from "../../config/database.config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

export interface KeyValuePair<T> {
  [key: string]: T;
}

export default class DatabaseLoader {
  private static _connections: KeyValuePair<DataSource | RedisClientType> = {
    postgres: null,
    redis: null,
  };

  private static _createRedisConnection(): RedisClientType {
    return createClient({
      url: appEnv("DB_REDIS_URL", ""),
      disableOfflineQueue: true,
      socket: {
        tls: true
      },
    });
  }

  public async Load(): Promise<void> {
    console.log("Connection Loading...");
    for (let key in DatabaseLoader._connections) {
      if (key == "redis") {
        DatabaseLoader._connections[key] =
          DatabaseLoader._createRedisConnection();
        await DatabaseLoader._connections[key].connect();
        continue;
      }
      let dbConfig: PostgresConnectionOptions = config[0];
      let dataSource = new DataSource(dbConfig);
      DatabaseLoader._connections[key] = await dataSource.initialize();
    }
    console.log("Connection Loaded!");
  }

  public static GetConnection(key: string): DataSource | RedisClientType {
    return DatabaseLoader._connections[key]
      ? DatabaseLoader._connections[key]
      : null;
  }

  public static async RefreshMaterializedView(): Promise<void> {
    const queryRunner = (this._connections["postgres"] as DataSource).createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();
    await queryRunner.query("REFRESH MATERIALIZED VIEW CONCURRENTLY communication_search_view");
    await queryRunner.query("REFRESH MATERIALIZED VIEW CONCURRENTLY plan_search_view");
    await queryRunner.commitTransaction();

    await queryRunner.release();

    return;
  }
}
