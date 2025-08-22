import { CommunicationGridModel } from "../entities/communication_grid.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { SimpleRepository } from "@app/common/base/simple.repository";

@Injectable()
export class CommunicationGridRepository extends SimpleRepository<CommunicationGridModel> {
  constructor(
    @InjectRepository(CommunicationGridModel)
    private communicationGridRepository: Repository<CommunicationGridModel>,
  ) {
    super(communicationGridRepository);
  }
}
