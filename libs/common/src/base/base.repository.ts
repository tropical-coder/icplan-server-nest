import {
  In,
  IsNull,
  Repository,
  UpdateResult,
  DeleteResult,
  FindManyOptions,
  FindOptionsWhere,
  ObjectType,
} from 'typeorm';
import { BaseModel } from './base.model';

export interface PaginationRequestParams {
  limit?: number;
  page?: number;
}

export interface PaginationDBParams {
  limit: number;
  offset: number;
}

export abstract class BaseRepository<T extends BaseModel> {
  protected Model: ObjectType<T>;
  protected ConnectionName: string;
  protected DefaultOrderByColumn: string = "Id";
  protected DefaultOrderByDirection: string = "ASC";
  protected PrimaryColumnKey: string = "Id";

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

  protected GetPrimaryColumnKey() {
    return this.PrimaryColumnKey;
  }

  protected GetPrimaryColumnValue(val) {
    return val;
  }

  protected InOperator(val): any {
    return In(val);
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
          out[key] = this.InOperator(val);
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

  protected ApplyOrder(
    whereParams: any,
    orderOptions?: { column: string; direction: "ASC" | "DESC" }
  ): any {
    let Column: string = this.DefaultOrderByColumn;
    let Direction: string = this.DefaultOrderByDirection;

    if (orderOptions !== undefined) {
      if (orderOptions.column) {
        Column = orderOptions.column;
      }

      if (orderOptions.direction) {
        Direction = orderOptions.direction;
      }
    }

    if (whereParams.order === undefined) {
      whereParams.order = {};
    }

    whereParams.order[Column] = Direction;

    return whereParams;
  }

  public async Create(instance: any, creatorId = null): Promise<T> {
    if (creatorId) {
      instance.created_by = creatorId;
      instance.updated_by = creatorId;
    }

    return await this.Save(instance);
  }

  public async CreateAll(instance: T[]) {
    return await this.SaveAll(instance);
  }

  public async FindById(Id?: number | string, params?: any) {
    return await this.Repository.findOne({ where: { Id: Id }, ...params });
  }

  public async FindByIds(Ids: number[]) {
    return await this.Repository.findBy({ Id: In(Ids) } as any);
  }

  public async Find(whereParams, options?: PaginationDBParams, select?: string[]) {
    let params = {
      where: this.PrepareParams(whereParams),
    };

    params = this.ApplyPagination(params, options);
    params = this.ApplyOrder(params);
    if (select) {
      params["select"] = ["Id", ...select]
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
    params = this.ApplyOrder(params, whereParams.order);
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

  public async Delete(
    param: any,
    softDelete = true
  ): Promise<UpdateResult | DeleteResult> {
    if (softDelete) {
      return await this.Repository.update(param, {
        is_deleted: 1,
      } as any);
    } else {
      //TODO: We have remove function as well.
      return await this.Repository.delete(param);
    }
  }

  public async DeleteById(
    id: number,
    softDelete = true
  ): Promise<UpdateResult | DeleteResult> {
    return await this.Delete(
      {
        Id: id,
      },
      softDelete
    );
  }

  public async DeleteByIds(
    ids: number[],
    softDelete = true
  ): Promise<UpdateResult | DeleteResult> {
    const idList = ids.map(id => ({ Id: id }));

    return await this.Delete(idList, softDelete);
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

  public async UpdateManyToManyRelation<R extends { Id: number | string }>(
    entity: T,
    relationName: string,
    newRelatedEntities: R[]
  ) {
    const currentRelatedEntities = (entity as any)[relationName] as R[] || [];
    
    const newIds = new Set(newRelatedEntities.map(item => item.Id));
    const currentIds = new Set(currentRelatedEntities.map(item => item.Id));

    const toAdd = Array.from(newIds).filter(id => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter(id => !newIds.has(id));

    if (toAdd.length > 0 || toRemove.length > 0) {
      await this.Repository.createQueryBuilder()
        .relation(this.Model, relationName)
        .of(entity)
        .addAndRemove(toAdd, toRemove);
    }
  }
}
