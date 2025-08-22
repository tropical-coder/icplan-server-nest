import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PlanOnPageModel } from "../entities/plan_on_page.entity";
import { SimpleRepository } from "@app/common/base/simple.repository";

export class PlanOnPageRepository extends SimpleRepository<PlanOnPageModel> {
  constructor(
    @InjectRepository(PlanOnPageModel)
    private readonly planOnPageRepository: Repository<PlanOnPageModel>,
  ) {
    super(planOnPageRepository);
  }
}
