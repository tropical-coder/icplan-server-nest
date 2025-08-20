
import { CommunicationService } from "../communication/CommunicationService";
import { TaskService } from "../task/TaskService";
import { LocationService } from "../location/LocationService";
import { BusinessAreaService } from "../business_area/BusinessAreaService";
import {
  CalendarHeatMapRequest,
  CalendarEventRequest,
  SwimlaneExcelRequest,
  SwimlaneGroupBy,
} from "../../../api/controller/calendar/CalendarRequest";
import { IRedisUserModel } from "../../model/user/UserModel";
import { YammerService } from "../social/yammer/YammerService";
import { ChannelService } from "../channel/ChannelService";
import { FileService } from "../file/FileService";
import { CompanyService } from "../company/CompanyService";
import { ChannelModel } from "../../model/channel/ChannelModel";
import * as Excel from "exceljs";
import { Stream } from "stream";
import {
  GetAWSSignedUrl,
  GetFileKey,
  UploadFileToS3,
} from "../aws/MediaService";
import { htmlToText } from "html-to-text";
import { OrderDirectionRequest } from "../../controller/base/BaseRequest";
import { ChangeDateFormat } from "../../helpers/UtilHelper";
import { StrategicPriorityModel } from "../../model/strategic_priority/StrategicPriorityModel";
import { StrategicPriorityService } from "../strategic_priority/StrategicPriorityService";
import { AudienceService } from "../audience/AudienceService";
import { AudienceModel } from "../../model/audience/AudienceModel";
import { DomainConstants } from "../../constant/DomainConstants";
import { KeyMessagesRepository } from "../../repository/company/KeyMessagesRepository";
import { KeyMessaging } from "../../../admin/controller/subscription/SubscriptionRequest";
import { GetKMRequest } from "../../../api/controller/key_messages/KeyMessagesRequest";
import { KeyMessagesModel } from "../../model/company/KeyMessagesModel";
import { statusConfig } from "../../constant/StatusConstant";

@Injectable()
export class CalendarService {
  constructor(
    private communicationService: CommunicationService,
    private locationService: LocationService,
    private businessAreaService: BusinessAreaService,
    private taskService: TaskService,
    private channelService: ChannelService,
    private fileService: FileService,
    private companyService: CompanyService,
    private yammerService: YammerService,
    private strategicPriorityService: StrategicPriorityService,
    private audienceService: AudienceService,
    private kmRepository: KeyMessagesRepository,
  ) {}

  private sortByDate = (commData) => {
    const sorter = (a, b) => {
      return (
        new Date(a.start_date).valueOf() - new Date(b.start_date).valueOf()
      );
    };
    commData.sort(sorter);
  };

  private async GenerateSwimLaneData(
    data: CalendarEventRequest,
    communications,
    groupBy: Array<ChannelModel> | Array<StrategicPriorityModel>
  ) {
    const milliseconds_per_day = 1000 * 60 * 60 * 24;
    let filterStartDate = new Date(data.start_date);
    let filterEndDate = new Date(data.end_date);
    let swimlaneLength =
      Math.ceil(
        Math.abs(filterEndDate.valueOf() - filterStartDate.valueOf()) /
          milliseconds_per_day
      ) + 1;
    let entityData = [];
    let uniqueEntities = new Map();
    let index = 0;

    groupBy.forEach((entity) => {
      entityData.push({
        entity: entity,
        Id: entity.Id,
        name: entity.name,
        is_archive: entity["is_archive"] ?? false,
        rowData: [],
      });
      uniqueEntities.set(entity.Id, index);
      index++;
    });

    this.sortByDate(communications);

    communications.forEach((comm, index) => {
      let startDate = new Date(comm.start_date);
      let endDate = new Date(comm.end_date);
      //Compare date with filter date
      if (startDate < filterStartDate) {
        startDate = filterStartDate;
      }
      if (endDate > filterEndDate) {
        endDate = filterEndDate;
      }
      const diffTime = Math.abs(endDate.valueOf() - startDate.valueOf());
      let daysLengthSpan = Math.ceil(diffTime / milliseconds_per_day);

      daysLengthSpan += 1;
      comm["daysLengthSpan"] = daysLengthSpan;
      comm["lengthFactor"] = (index + 1) * daysLengthSpan;
      comm["startDate"] = startDate;
      comm["endDate"] = endDate;

      if (daysLengthSpan > swimlaneLength) {
        comm["daysLengthSpan"] = swimlaneLength;
      }
    });

    const factorSorter = (a, b) => {
      return a.lengthFactor - b.lengthFactor;
    };
    communications.sort(factorSorter);

    let commProperty = SwimlaneGroupBy.Channel;
    if (groupBy[0] instanceof StrategicPriorityModel) {
      commProperty = SwimlaneGroupBy.StrategicPriority;
    } else if (groupBy[0] instanceof AudienceModel) {
      commProperty = SwimlaneGroupBy.Audience;
    }

    communications.forEach((comm, index) => {
      comm[commProperty].forEach((entity) => {
        let entityIndex = uniqueEntities.get(entity.Id);
        let entityAdded = false;
        let len = entityData[entityIndex].rowData.length;
        for (let index = 0; index < len; index++) {
          let rData = entityData[entityIndex].rowData[index];
          if (comm.startDate > rData.endSlot) {
            let timeDiff = Math.abs(
              new Date(rData.endSlot).valueOf() -
                new Date(comm.startDate).valueOf()
            );
            let skipDays = Math.ceil(timeDiff / milliseconds_per_day);
            rData.comms.push({
              ...comm,
              days_to_skip: skipDays - 1,
            });
            rData.endSlot = comm.endDate;
            entityAdded = true;
            break;
          }
        }

        // If unable to add entity then add new row
        if (!entityAdded) {
          let timeDiff = Math.abs(
            new Date(comm.startDate).valueOf() -
              new Date(data.start_date).valueOf()
          );
          let skipDays = Math.ceil(timeDiff / milliseconds_per_day);
         entityData[entityIndex].rowData.push({
            endSlot: comm.endDate,
            comms: [
              {
                ...comm,
                days_to_skip: skipDays,
              },
            ],
          });
        }
      });
    });

    return entityData;
  }

  private async UpdateFile(file) {
    if (file.is_aws) {
      let key = GetFileKey(file.path);
      // 3 hours
      file.path = await GetAWSSignedUrl(key, 3 * 60 * 60);
    }
  }

  public async GetCalendarHeatMap(data: CalendarHeatMapRequest, user: IRedisUserModel) {
    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }
    return this.communicationService.GetCalendarHeatMap(data, user);
  }

  public async GetCalendarEvents(
    data: CalendarEventRequest,
    user: IRedisUserModel
  ) {
    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }

    data["show_on_calendar"] = true;
    let [communications, tasks, social_posts] = await Promise.all([
      this.communicationService.GetCommunicationsByDateRange(
        data,
        user,
        [
          "owner",
          "plan_owner",
        ]
      ),
      this.taskService.GetTasksByDateRange(data, user),
      this.yammerService.GetPostsByDateRange(data, user),
    ]);

    return { communications, tasks, social_posts };
  }

  public async GetSwimlaneCommunications(
    data: SwimlaneExcelRequest,
    user: IRedisUserModel
  ) {
    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }

    let communications =
      await this.communicationService.GetCommunicationsByDateRange(
        data,
        user,
        [
          "owner",
          "plan_owner",
          data.group_by
        ]
      );

    return communications;
  }

  public async GetSwimlaneExcel(
    data: SwimlaneExcelRequest,
    user: IRedisUserModel,
    subdomain: string,
  ) {
    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }

    data["show_on_calendar"] = false;
    let [company, communications] = await Promise.all([
      this.companyService.GetCompany(user.company_id),
      this.communicationService.GetCommunicationsByDateRange(
        data,
        user,
        [
          "owner",
          "plan_owner",
          data.group_by
        ]
      ),
    ]);

    const params = {
      sort: data.sort ? data.sort : OrderDirectionRequest.ASC,
      name: null,
      page: 1,
      limit: 1000,
    };

    let entities;
    let header: string;
    switch (data.group_by) {
      case SwimlaneGroupBy.Channel:
        const channels = await this.channelService.GetChannels(params, user);
        entities = channels.channels;
        header = "Channel";
        break;
      case SwimlaneGroupBy.StrategicPriority:
        const strategicPriorities = await this.strategicPriorityService.GetStrategicPrioritys(
          params,
          user
        );
        entities = strategicPriorities.strategic_priorities;
        header = "Strategic Priority";
        break;
      case SwimlaneGroupBy.Audience:
        const audiences = await this.audienceService.GetAudiences(params, user);
        entities = audiences.audiences;
        header = "Audience";
        break;
    }

    const kmType = company.subscription.features.key_messaging;
    let entityData, key_messages: KeyMessagesModel[];
    [entityData, { key_messages }] = await Promise.all([
      this.GenerateSwimLaneData(data, communications, entities),
      this.kmRepository.GetKeyMessagesHistory(
        kmType == KeyMessaging.Advanced
          ? { start_date: data.start_date, end_date: data.end_date }
          : {},
        kmType,
        user
      ),
    ]);

    let workbook = new Excel.Workbook();
    workbook.creator = "System";
    workbook.lastModifiedBy = "System";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    const swimlaneTranslation = DomainConstants[subdomain].Swimlane;
    let worksheet = workbook.addWorksheet(swimlaneTranslation);
    // , {
    //   pageSetup: { paperSize: 8, printTitlesRow: "1" },
    // });
    // worksheet.properties.defaultRowHeight = 100;

    let startDate = new Date(data.start_date);
    let endDate = new Date(data.end_date);
    let dateDifference = Math.ceil(
      Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let headerOptions = {
      width: 50,
      font: { bold: true, size: 12, name: "Arial" },
    };
    let columns = [
      {
        header: header,
        key: data.group_by as string,
        ...headerOptions,
      },
    ];
    let options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    };
    let dateHash = new Map();

    for (let index = 0; index <= dateDifference; index++) {
      let date = new Date(startDate);
      date.setDate(date.getDate() + index);
      dateHash.set(date.getTime(), index + 2);
      columns.push({
        header: date.toLocaleDateString("en-GB", options),
        key: (index + 2).toString(),
        ...headerOptions,
      });
    }
    worksheet.columns = columns;
    let headerRow = worksheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => (cell.style = headerOptions));

    let columnNumber = 1;
    let rowNumber = 2;
    let startRow = 2;

    //Add rows data
    entityData.forEach((entity) => {
      if (!entity.rowData.length && data.hide_empty_lanes) return;
      let cell = worksheet.getCell(rowNumber, columnNumber);
      cell.value = entity.is_archive
        ? `${entity.name} [Archived]`
        : entity.name;
      cell.style = {
        ...headerOptions,
        alignment: {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        },
      };
      entity.rowData.forEach((commRow) => {
        commRow.comms.forEach((comm) => {
          let dateIndex = dateHash.get(new Date(comm.startDate).getTime());
          let planOwners = comm.plan.owner
            .map((owner) => owner.full_name)
            .join(", ");
          let cell = worksheet.getCell(rowNumber, dateIndex);
          const statusDisplayName = statusConfig.communication[subdomain][comm.status];
          cell.style = {
            font: { bold: false, size: 12, name: "Arial" },
            alignment: {
              wrapText: true,
              vertical: "middle",
              horizontal: "center",
            },
            fill: {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: comm.plan.color?.slice(1, 7) },
            },
            border: {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            },
          };

          let planStartDate = ChangeDateFormat(comm.plan.start_date, company.date_format);
          let planEndDate = ChangeDateFormat(comm.plan.end_date, company.date_format);

          cell.value = `Communication: ${comm.title}
Communication Owner: ${comm.owner.full_name}
Status: ${statusDisplayName}
Plan: ${comm.plan.title}
Plan Owner: ${planOwners}
Plan Start: ${planStartDate}
Plan End: ${comm.plan.ongoing ? "Ongoing" : planEndDate}`;

          if (comm.daysLengthSpan > 1) {
            worksheet.mergeCells(
              rowNumber,
              dateIndex,
              rowNumber,
              dateIndex + comm.daysLengthSpan - 1
            );
          }
        });
        worksheet.getRow(rowNumber).height = 120;
        rowNumber++;
      });
      if (startRow != rowNumber) {
        worksheet.mergeCells(startRow, 1, rowNumber - 1, 1);
        startRow = rowNumber;
      } else {
        startRow++;
        rowNumber++;
      }
    });

    // check if company is allowed to show key messages
    if (company.show_key_messages) {
      worksheet.addRow([]);
      rowNumber++;

      worksheet.addRow([DomainConstants[subdomain].KeyMessages]);
      worksheet.getCell(rowNumber, 1).style = {
        font: { bold: true, size: 12, name: "Arial" },
        alignment: {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        },
      };
      // conditionally render key messages based on subscription type
      if (kmType === KeyMessaging.Basic) {
        // basic: single message across all date columns
        worksheet.mergeCells(rowNumber, 2, rowNumber, dateHash.size + 1);
        const keyMessageCell = worksheet.getCell(rowNumber, 2);
        keyMessageCell.style = {
          font: { bold: true, size: 12, name: "Arial" },
          alignment: { wrapText: true },
        };
        keyMessageCell.value = key_messages[0]?.key_messages
          ? htmlToText(key_messages[0].key_messages, { wordwrap: false })
          : "";
      } else {
        // advanced: place each key message in its specific date column
        key_messages.forEach((km) => {
          if (km.date) {
            const msgDate = new Date(km.date).getTime();
            const colIndex = dateHash.get(msgDate);
            if (colIndex) {
              const kmCell = worksheet.getCell(rowNumber, colIndex);
              kmCell.style = {
                font: { bold: true, size: 12, name: "Arial" },
                alignment: { wrapText: true },
              };
              kmCell.value = htmlToText(km.key_messages || "", { wordwrap: false });
            }
          }
        });
      }
      // set row height for key messages row
      worksheet.getRow(rowNumber).height = 350;
    }
    // Border on all cells
    worksheet.columns.forEach((column) => {
      column.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const pass = new Stream.PassThrough();
    let responseData = await workbook.xlsx.write(pass).then(async () => {
      return await UploadFileToS3(
        pass,
        `${Date.now()}_${swimlaneTranslation.toLowerCase()}.xlsx`
      );
    });

    let fileModel = await this.fileService.Create(
      {
        size: 0,
        mime_type: "application/vnd.ms-excel",
        location: responseData.Location,
        originalname: responseData.Key,
        is_aws: true,
      },
      user
    );

    await this.UpdateFile(fileModel);

    return fileModel;
  }
}
