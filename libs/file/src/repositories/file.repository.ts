import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { FileModel } from "../entities/file.entity";

@Injectable()
export class FileRepository extends BaseRepository<FileModel> {
  constructor(
    @InjectRepository(FileModel)
    private fileModelRepository: Repository<FileModel>,
  ) {
    super(fileModelRepository);
  }

  public async GetFilesByCommunicationId(communicationId: number, select = []) {
    select.push("file.Id");
    return await this.fileModelRepository.createQueryBuilder("file")
      .select(select)
      .innerJoin(
        "communication_files",
        "communication_files",
        `communication_files.file_id = file.Id 
          AND communication_files.communication_id = :communicationId`,
        { communicationId },
      )
      .getMany();
  }
}
