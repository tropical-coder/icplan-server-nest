import { SimpleRepository } from "@app/common/base/simple.repository";
import { PinFolderModel } from "../entities/pin_folder.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PinFolderRepository extends SimpleRepository<PinFolderModel> {
  constructor(
    @InjectRepository(PinFolderModel)
    private readonly pinFolderRepository: Repository<PinFolderModel>,
  ) {
    super(pinFolderRepository);
  }
}
