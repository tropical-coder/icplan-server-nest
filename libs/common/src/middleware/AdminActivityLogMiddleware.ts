import { ExpressMiddlewareInterface, Middleware } from "routing-controllers";
import * as Express from "express";
import * as RequestIp from "request-ip";
import { AdminActivityLogRepository } from "../repository/activity_log/AdminActivityLogRepository";
import { appEnv } from "../helpers/EnvHelper";
import {
  ActivityEntity,
  AdminActivityLogModel,
} from "../model/activity_log/AdminActivityLogModel";
import { Method } from "../model/activity_log/UserActivityLogModel";

@Middleware({ type: "before" })
export class AdminActivityLogMiddleware implements ExpressMiddlewareInterface {
  constructor(private adminActivityLogRepository: AdminActivityLogRepository) {}

  public use(
    req: Express.Request,
    res: Express.Response,
    next: Express.NextFunction
  ) {
    console.log("AdminActivityLogMiddleware called"); // Debugging line
    const logRepo: AdminActivityLogRepository = this.adminActivityLogRepository;

    res.on("finish", async function () {
      if (!appEnv("LOG_ACTIVITY", false)) {
        return;
      }

      const { method, originalUrl } = req;
      const sourceIp = RequestIp.getClientIp(req);
      const statusCode = res.statusCode;
      const body = req.body;
      delete body.password;
      delete body.verification_code;

      let resource = originalUrl.split("/")[2].replace("-", "_");
      if (originalUrl.includes("subscription")) {
        resource = "subscription";
      }

      const authEndpoints = ["login", "logout"];
      const allowedEndpoints = Object.values(ActivityEntity as any);
      allowedEndpoints.push(...authEndpoints);
      const isAuthEndpoint = authEndpoints.includes(resource);

      // log skipping conditions
      if (
        !statusCode ||
        (statusCode >= 400 && !isAuthEndpoint) ||
        !["POST", "PUT", "DELETE", "PATCH"].includes(method) ||
        !allowedEndpoints.includes(resource)
      ) {
        return;
      }

      const log = new AdminActivityLogModel();
      log.source_ip = sourceIp;
      log.method = method as Method;
      log.endpoint = originalUrl.replace("/api", "");
      log.body = body;
      log.admin_id = req["admin"] ? req["admin"]["Id"] : null;
      log.entity = isAuthEndpoint ? "auth" : resource;
      log.entity_id = log.endpoint.match(/\d+/)?.[0]
        ? parseInt(log.endpoint.match(/\d+/)[0])
        : null;
      log.entity_id ??= res.locals.entity_id; // set from App.ts
      log.status_code = statusCode;

      await logRepo.Save(log);
    });
    next();
  }
}
