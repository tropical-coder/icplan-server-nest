import { compare, genSalt, hash } from "bcrypt";
import { Request } from "express";
import moment from "moment";
import * as Excel from "exceljs";
import * as fs from "fs";
import * as handlebars from "handlebars";
import axios from "axios";
import * as puppeteer from "puppeteer";
import * as RequestIp from "request-ip";
import { appEnv } from "./env.helper";
import { UserRoles } from "@app/user/entities/user.entity";
import { IRedisUserModel } from "@app/user/entities/user.entity";
import { SubdomainMap } from "../constants/subdomain.constant";
import { BadRequestException } from "@nestjs/common";
import { DateFormat } from "@app/company/entities/company.entity";

export async function Hashpassword(plainText: string): Promise<any> {
  return new Promise(function (resolve, reject) {
    genSalt(10, function (error, salt) {
      if (error) {
        reject(error);
      } else {
        hash(plainText, salt, function (error, hash) {
          if (error) {
            reject(error);
          } else {
            resolve(hash);
          }
        });
      }
    });
  });
}

export async function Comparepassword(plainText, hash): Promise<any> {
  return new Promise(function (resolve, reject) {
    compare(plainText, hash, function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

export function GetVerificationCode() {
  if (appEnv("ENVIRONMENT") === "develop") {
    return 1234;
  }
  return Math.floor(1000 + Math.random() * 9000);
}

export interface PaginationRequestParams {
  limit?: number;
  page?: number;
}

export interface PaginationDBParams {
  limit: number;
  offset: number;
}

/**
 * Casts PaginationRequestParams to PaginationDBParams
 * @param {PaginationRequestParams} params
 * @returns {PaginationDBParams}
 */
export function GetPaginationOptions(params: PaginationRequestParams) {
  let options: PaginationDBParams = {
    limit: appEnv("PAGE_LIMIT", 10),
    offset: 0,
  };

  let limit = params.limit;
  let page = params.page || 1;

  if (limit) {
    options.limit = parseInt(limit.toString());
  }

  if (page) {
    options.offset = options.limit * Math.max(page - 1, 0);
  }
  return options;
}

export function GetOrderByClause(column, direction) {
  if (column && direction) {
    return `Order By ${column} ${direction}`;
  }

  return "";
}

export function isBoolean(val) {
  return "boolean" === typeof val;
}

export function doApplyBusinessAreaPermission(user) {
  let permissionEnabled: boolean = appEnv(
    "BUSINESS_AREA_PERMISSION_ENABLED",
    false
  );

  if (permissionEnabled && user.role != UserRoles.Owner) {
    return true;
  }

  return false;
}

export function filterRawQueryParams(data, user: IRedisUserModel) {
  return `
    AND comm.company_id = ${user.company_id}
    ${user?.role != UserRoles.Owner 
      ? `AND (
          comm.is_confidential != true
          OR comm.is_confidential IS NULL
          OR (
            comm.is_confidential = true
            AND (
              "cteam"."user_id" = ${user.Id}
              OR "comm"."owner_id" = ${user.Id}
            )
          )
        )`
      : ''}
    ${data.parent_folder_id?.length 
      ? `AND plan.parent_folder_id IN (${data.parent_folder_id.join(',')})` 
      : ''}
    ${data.tag?.length 
      ? `AND ctag.tag_id IN (${data.tag.join(',')})` 
      : ''}
    ${data.strategic_priority?.length 
      ? `AND csp.strategic_priority_id IN (${data.strategic_priority.join(',')})` 
      : ''}
    ${data.audience?.length 
      ? `AND caudience.audience_id IN (${data.audience.join(',')})` 
      : ''}
    ${data.channel?.length 
      ? `AND cchannel.channel_id IN (${data.channel.join(',')})` 
      : ''}
    ${data.content_type?.length 
      ? `AND ccontent_type.content_type_id IN (${data.content_type.join(',')})` 
      : ''}
    ${data.business_area?.length 
      ? `AND (cba.business_area_id IN (${data.business_area.join(',')}) OR ba.parent_id IN (${data.business_area.join(',')}))` 
      : ''}
    ${data.location?.length 
      ? `AND (cloc.location_id IN (${data.location.join(',')}) OR loc.parent_id IN (${data.location.join(',')}))` 
      : ''}
    ${data.plan_id?.length 
      ? `AND comm.plan_id IN (${data.plan_id.join(',')})` 
      : ''}
    ${data.status?.length 
      ? `AND comm.status IN ('${data.status.join("','")}')` 
      : ''}
    ${data.team?.length 
      ? `AND cteam.user_id IN (${data.team.join(',')})` 
      : ''}
    ${data.owner?.length 
      ? `AND comm.owner_id IN (${data.owner.join(',')})` 
      : ''}
  `.trim();
}

export function filterQBParams(
  qb,
  data,
  user: IRedisUserModel,
  applyConfidentialCondition = true
) {
  if (user.role != UserRoles.Owner && applyConfidentialCondition) {
    qb.andWhere(`
        (
          communication.is_confidential != true
          OR communication.is_confidential IS NULL
          OR (
            communication.is_confidential = true
            AND (
              "communication_team"."user_id" = ${user.Id}
              OR "owner"."Id" = ${user.Id}
            )
          )
        )
      `);
  }

  if (data["status"]) {
    qb.andWhere(`communication.status IN ('${data.status.join("','")}')`);
  }

  if (data["parent_folder_id"]) {
    qb.andWhere(
      `plan.parent_folder_id IN (
        SELECT pf."Id"
        FROM parent_folder AS pf
        WHERE
          pf."Id" IN ('${data.parent_folder_id.join("','")}')
          OR pf.parent_folder_id IN ('${data.parent_folder_id.join("','")}')
      )`
    );
  }

  if (data["plan_id"]) {
    qb.andWhere(`plan."Id" IN (${data.plan_id.join(",")})`);
  }

  if (data["owner"]) {
    qb.andWhere(`communication.owner_id IN (${data.owner.join(",")})`);
  }

  if (data["business_area"] && data.business_area.length) {
    qb.andWhere(`
      (
        business_area."Id" IN (${data.business_area.join(",")})
      )
    `);
  }

  if (data["tag"]) {
    qb.andWhere(`communication_tags.tag_id IN (${data.tag.join(",")})`);
  }

  if (data["content_type"]) {
    qb.andWhere(
      `communication_content_type.content_type_id IN (${data.content_type.join(
        ","
      )})`
    );
  }

  if (data["strategic_priority"]) {
    qb.andWhere(
      `communication_strategic_priorities.strategic_priority_id IN (${data.strategic_priority.join(
        ","
      )})`
    );
  }

  if (data["team"]) {
    qb.andWhere(`communication_team.user_id IN (${data.team.join(",")})`);
  }

  if (data["location"] && data.location.length) {
    qb.andWhere(`
			(
				communication_location.location_id IN (${data.location.join(",")})
			)`);
  }

  if (data["audience"]) {
    qb.andWhere(
      `communication_audience.audience_id IN (${data.audience.join(",")})`
    );
  }

  if (data["channel"]) {
    qb.andWhere(
      `communication_channel.channel_id IN (${data.channel.join(",")})`
    );
  }
}

export function filterJoinsRawQuery(data) {
  return `
    ${
      data.location?.length
        ? `LEFT JOIN communication_location AS cloc
              ON comm."Id" = cloc.communication_id
            LEFT JOIN location AS loc
              ON cloc.location_id = loc."Id"`
        : ""
    }
    ${
      data.tag?.length
        ? `LEFT JOIN communication_tag ctag
            ON comm."Id" = ctag.communication_id`
        : ""
    }
    ${
      data.strategic_priority?.length
        ? `LEFT JOIN communication_strategic_priority csp
        ON comm."Id" = csp.communication_id`
        : ""
    }
    ${
      data.audience?.length
        ? `LEFT JOIN communication_audience caudience
        ON comm."Id" = caudience.communication_id`
        : ""
    }
    ${
      data.channel?.length
        ? `LEFT JOIN communication_channel cchannel
        ON comm."Id" = cchannel.communication_id`
        : ""
    }
    ${
      data.business_area?.length
        ? `LEFT JOIN communication_business_area AS cba
            ON comm."Id" = cba.communication_id
          LEFT JOIN business_area AS ba
            ON cba."business_area_id" = ba."Id"`
        : ""
    }
    ${
      data.content_type?.length
        ? `LEFT JOIN communication_content_type ccontent_type
        ON comm."Id" = ccontent_type.communication_id`
        : ""
    }
  `;
}

export function CheckSubDomain(req: Request): string {
  if (req.hostname === "localhost") {
    return "default";
  }

  for (const subdomain of req.subdomains) {
    if (SubdomainMap[subdomain]) {
      return SubdomainMap[subdomain];
    }
  }

  return "default";
}

/**
 * @param object should be JSON compatible, otherwise use structuredClone()
 */
export function DeepClone(object) {
  return JSON.parse(JSON.stringify(object));
}

export function ChangeDateFormat(
  date: Date | string,
  format: DateFormat,
  separator: "-" | "/" | "." = "-"
) {
  date = moment(date).format(format.split("").join(separator));
  return date;
}

// /**
//  * @param comm CommunicationModel
//  * @returns span (in seconds)
//  */
// export function CalculateCommunicationSpan(comm: CommunicationModel): number {
//   let startDate, endDate;

//   if (comm.no_set_time) {
//     // If no_set_time is true, assume start and end time as 00:00
//     startDate = moment(comm.start_date).startOf("day");
//     endDate = moment(comm.end_date).startOf("day");
//   } else {
//     // If no_set_time is false, use the actual start and end times
//     startDate = moment(comm.start_date + " " + comm.start_time);
//     endDate = moment(comm.end_date + " " + comm.end_time);
//   }

//   return endDate.diff(startDate, "seconds");
// }

export function SnakeCaseToNormal(str: string) {
  // Replace underscore with space
  str = str.replace(/_/g, " ");
  // Capitalize the first letter of each word
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function JoinArrays(data: any) {
  let result = DeepClone(data);
  for (let key in result) {
    if (Array.isArray(result[key])) {
      result[key] =
        key == "status" ? result[key].join("','") : result[key].join(",");
    }
  }

  return result;
}

export function ConvertToCSV(data: any[]) {
  let csv = "";
  let headers = Object.keys(data[0]);
  csv += headers.join(",") + "\n";

  for (let row of data) {
    const rowValues: any[] = [];
    for (let header of headers) {
      rowValues.push(row[header]);
    }
    csv += rowValues.join(",") + "\n";
  }

  return csv;
}

// export function CheckPlanChanged(
//   oldPlan: PlanModel,
//   updatedPlan: PlanModel
// ): boolean {
//   const primitiveFields = [
//     "title",
//     "status",
//     "description",
//     "parent_folder_id",
//     "objectives",
//     "key_messages",
//     "start_date",
//     "end_date",
//     "ongoing",
//     "show_on_calendar",
//     "color",
//     "is_confidential",
//     "dashboard_enabled",
//   ];

//   for (const field of primitiveFields) {
//     if (oldPlan[field] != updatedPlan[field]) {
//       return true;
//     }
//   }

//   const relatedEntities = [
//     "business_areas",
//     "tags",
//     "strategic_priorities",
//     "team",
//     "owner",
//   ];

//   for (const entity of relatedEntities) {
//     if (
//       !areArraysEqual(
//         oldPlan[entity].map(({ Id }) => +Id),
//         updatedPlan[entity].map(({ Id }) => +Id)
//       )
//     ) {
//       return true;
//     }
//   }

//   return false;
// }

function areArraysEqual(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  const sortedArr1 = arr1.slice().sort();
  const sortedArr2 = arr2.slice().sort();

  for (let i = 0; i < sortedArr1.length; i++) {
    if (sortedArr1[i] !== sortedArr2[i]) {
      return false;
    }
  }

  return true;
}

export function WrapFunctionWithTryCatch<
  T extends (...args: any[]) => Promise<any>
>(fn: T): T {
  return async function (...args: Parameters<T>): Promise<ReturnType<T>> {
    try {
      return await fn.apply(this, args);
    } catch (err) {
      throw new Error(err.message);
    }
  } as T;
}

export function MergeCells(
  worksheet: Excel.Worksheet,
  dbResult: any[],
  column: Partial<Excel.Column>,
  identityColumnName: string = "Id"
) {
  let currentRow = 2;
  let lastId = dbResult[0][identityColumnName];
  let index = 1;
  for (let len = dbResult.length; index < len; index++) {
    // this will skip merging null valued cell
    if (column.key && !lastId && !dbResult[index][column.key]) {
      currentRow = index + 2;
      continue;
    }

    if (lastId !== dbResult[index][identityColumnName]) {
      const range = `${column.letter}${currentRow}:${column.letter}${
        index + 1
      }`;
      worksheet.mergeCells(range);
      currentRow = index + 2;
      lastId = dbResult[index][identityColumnName];
    }
  }

  return;
}

// export function UpdateLimitsBySeats(
//   features,
//   packageDetail: PackageDetailModel,
//   seatDifference: number
// ) {
//   features.plan_limit += packageDetail.plan_limit * seatDifference;
//   features.communication_limit +=
//     packageDetail.communication_limit * seatDifference;
//   features.task_limit += packageDetail.task_limit * seatDifference;
//   return features;
// }

export function ReadHTMLTemplate(templateName: string, subdomain: string) {
  const primaryPath =
    __dirname + `/../../../src/app/template/html/${subdomain}/${templateName}`;
  const fallbackPath =
    __dirname + `/../../../src/app/template/html/default/${templateName}`;

  try {
    // Check if primary template exists
    fs.accessSync(primaryPath);
    return fs.readFileSync(primaryPath, {
      encoding: "utf-8",
    });
  } catch (err) {
    // fallback to default template
    return fs.readFileSync(fallbackPath, {
      encoding: "utf-8",
    });
  }
}

export function ReadDocxTemplate(templateName: string, subdomain: string) {
  const primaryPath =
    __dirname + `/../../../src/app/template/docx/${subdomain}/${templateName}`;
  const fallbackPath =
    __dirname + `/../../../src/app/template/docx/default/${templateName}`;

  try {
    // Check if primary template exists
    fs.accessSync(primaryPath);
    return fs.readFileSync(primaryPath);
  } catch (err) {
    // fallback to default template
    return fs.readFileSync(fallbackPath);
  }
}

export async function ExportPdf(
  templateName: string,
  model: any,
  subdomain: string,
  options: puppeteer.PDFOptions
) {
  subdomain = SubdomainMap[subdomain] || "default";
  let html = ReadHTMLTemplate(templateName, subdomain);
  const template = handlebars.compile(html);
  const content = template(model);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: appEnv("PUPPETEER_EXECUTABLE_PATH", undefined),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
  });
  const page = await browser.newPage();
  // logs browser console messages
  // page
  //   .on('console', message =>
  //     console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
  //   .on('pageerror', ({ message }) => console.log(message))
  //   .on('response', response =>
  //     console.log(`${response.status()} ${response.url()}`));
  await page.setContent(content);

  const pdfBuffer = await page.pdf(options);

  await browser.close();
  return pdfBuffer;
}

export function GetTimePercentagePassed(startDate, endDate) {
  const now = new Date().getTime(); // Current timestamp
  const start = new Date(startDate).getTime(); // Convert start date to timestamp
  const end = new Date(endDate).getTime(); // Convert end date to timestamp

  if (now < start) return 0; // If current time is before start, 0% has passed
  if (now > end) return 100; // If current time is past end, 100% has passed

  const totalDuration = end - start;
  const elapsedTime = now - start;

  return (elapsedTime / totalDuration) * 100;
}

export async function CheckDisposableEmail(email: string, req: Request) {
  if (appEnv("ENVIRONMENT") != "production") return;

  const ip = RequestIp.getClientIp(req);
  const whitelistedIps = appEnv("DISPOSABLE_EMAIL_WHITELIST_IP", "").split(",");

  const { data } = await axios.get(
    `https://open.kickbox.com/v1/disposable/${email}`
  );
  if (data.disposable && !whitelistedIps.includes(ip)) {
    throw new BadRequestException("Disposable emails are not allowed.");
  }
}
