
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import { CalendarService } from "../../../app/service/calendar/CalendarService";
import {
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Req,
  UseBefore,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import {
  CalendarEventRequest,
  CalendarHeatMapRequest,
  SwimlaneExcelRequest,
} from "./CalendarRequest";
import { CheckSubDomain } from "../../../app/helpers/UtilHelper";
import { InjectSubdomainMiddleware } from "../../../app/middleware/InjectSubdomainMiddleware";

@ApiTags()
@Controller()
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/calendar/heatmap")
  async GetHeatMap(
    @Query() data: CalendarHeatMapRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const events = await this.calendarService.GetCalendarHeatMap(data, user);
    return events;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/calendar/events")
  async GetCalendarEvents(
    @Query() data: CalendarEventRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const events = await this.calendarService.GetCalendarEvents(data, user);
    return events;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/swimlane/communication")
  async GetSwimlaneCommunications(
    @Query() data: SwimlaneExcelRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const comms = await this.calendarService.GetSwimlaneCommunications(
      data,
      user
    );
    return comms;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/swimlane/excel")
  async GetSwimlaneExcel(
    @Query() data: SwimlaneExcelRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const comms = await this.calendarService.GetSwimlaneExcel(data, user, subdomain);
    return comms;
  }
}
