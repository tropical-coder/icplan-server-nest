import {
  In,
  IsNull,
  Repository,
  DeleteResult,
  FindManyOptions,
  FindOptionsWhere,
  BaseEntity,
} from 'typeorm';
import { PaginationDBParams } from './base.repository';

export abstract class SimpleRepository<T extends BaseEntity> {
constructor(protected Repository: Repository<T>) {}

  protected ApplyPagination(
    whereParams: any,
    options?: PaginationDBParams
  ): any {
    if (options && options.limit != -1) {
      whereParams.take = options.limit;
      whereParams.skip = options.offset;
    }

    return whereParams;
  }

  protected PrepareParams(
    whereParams?: FindOptionsWhere<T> | FindOptionsWhere<T>[] | null,
    _options?: PaginationDBParams
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    const normalize = (input: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) {
        if (val === undefined) continue;
        if (Array.isArray(val)) {
          out[key] = In(val);
        } else if (val === null) {
          out[key] = IsNull();
        } else {
          out[key] = val;
        }
      }
      return out;
    };

    if (!whereParams) {
      return {} as FindOptionsWhere<T>;
    }

    if (Array.isArray(whereParams)) {
      return whereParams.map(w => normalize(w as Record<string, unknown>)) as FindOptionsWhere<T>[];
    }

    return normalize(whereParams as Record<string, unknown>) as FindOptionsWhere<T>;
  }

  protected ApplyRelations(param, relations) {
    if (!relations) {
      return param;
    }
    param.relations = relations;
    return param;
  }

  public async Create(instance: any): Promise<T> {
    return await this.Save(instance);
  }

  public async CreateAll(instance: T[]) {
    return await this.SaveAll(instance);
  }

  public async Find(whereParams, options?: PaginationDBParams, select?: string[]) {
    let params = {
      where: this.PrepareParams(whereParams),
    };

    params = this.ApplyPagination(params, options);
    if (select) {
      params["select"] = select;
    }
    return await this.Repository.find(params);
  }

  public async FindOne(whereParams, params?) {
    return await this.Repository.findOne({
      where: whereParams,
      ...params,
    });
  }

  public async FindAndCount(
    whereParams,
    options?: PaginationDBParams,
    relations?
  ) {
    let params = {
      where: this.PrepareParams(whereParams),
    };
    params = this.ApplyPagination(params, options);
    params = this.ApplyRelations(params, relations);

    return await this.Repository.findAndCount(params as FindManyOptions);
  }

  public async Save(instance: T): Promise<T> {
    return (await this.Repository.save(instance as any)) as T;
  }

  public async SaveAll(instance: T[]) {
    return (await this.Repository.save(instance as any)) as T[];
  }

  public async Update(condition: FindOptionsWhere<T>, updateObject) {
    return await this.Repository.update(condition, updateObject as any);
  }

  public async Delete(param: any): Promise<DeleteResult> {
    return await this.Repository.delete(param);
  }

  public async Upsert(
    instance: T | T[], 
    conflictCols: string[]
  ) {
    return await this.Repository.upsert(instance as any, conflictCols);
  }

  public async Count(where?: any) {
    return await this.Repository.count({ where });
  }
}
