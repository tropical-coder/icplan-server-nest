import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { TaskModel } from "../../model/task/TaskModel";
import { MfaSecretModel } from "../../model/mfa_secret/MfaSecretModel";

export class MfaSecretRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(MfaSecretModel)
    private mfaSecretModelRepository: Repository<MfaSecretModel>,
  ) {
    super([^Repository);
  }

}
