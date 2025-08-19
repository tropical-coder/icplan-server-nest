import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import * as redis from 'redis';

@Injectable()
export class RedisService {
  private connection: ReturnType<typeof redis.createClient>;
  private prefix: string;


  constructor(private configService: ConfigService) {
    this.createConnection();
    this.prefix = this.configService.get<string>('REDIS_PREFIX', '');
  }

  private async createConnection() {
    this.connection = redis.createClient({
      url: this.configService.get('DB_REDIS_URL'),
      disableOfflineQueue: true,
    });

    await this.connection.connect();
    console.log('Redis Connected');
  }

   public async Set(key: string | number, data: any, expireInSeconds?: number){
    key = `${this.prefix}-${key}`;
    if (!expireInSeconds) {
      expireInSeconds = this.configService.get<number>('COMPANY_RETENTION_DAYS', 60) * 24 * 60 * 60;
    }
    return await this.connection.set(key, data, { EX: expireInSeconds });
  }

  public async Get(key: string | number) {
    key = `${this.prefix}-${key}`;
    return await this.connection.get(key);
  }

  public async ExpireAt(key: string | number, timeStamp: number) {
    key = `${this.prefix}-${key}`;
    return await this.connection.expireAt(key, timeStamp);
  }

  public async Delete(key: string | string) {
    key = `${this.prefix}-${key}`;
    return await this.connection.del(key);
  }

  public async GetKeys(pattern: string) {
    pattern = `${this.prefix}-${pattern}`;
    const keys = await this.connection.keys(pattern);

    // remove environment prefix from keys
    return keys.map((key) => key.replace(`${this.prefix}-`, ""));
  }
}