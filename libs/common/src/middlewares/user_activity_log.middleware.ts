import { ExpressMiddlewareInterface, Middleware } from "routing-controllers";
import * as Express from "express";
import * as RequestIp from "request-ip";
import { UserActivityLogRepository } from "../repository/activity_log/UserActivityLogRepository";
import { appEnv } from "../helpers/EnvHelper";
import {
  ActivityEntity,
  Method,
  UserActivityLogModel,
} from "../model/activity_log/UserActivityLogModel";

@Middleware({ type: "before" })
export class UserActivityLogMiddleware implements ExpressMiddlewareInterface {
  constructor(private userActivityLogRepository: UserActivityLogRepository) {}

  public use(
    req: Express.Request,
    res: Express.Response,
    next: Express.NextFunction
  ) {
    const logRepo: UserActivityLogRepository = this.userActivityLogRepository;

    res.on("finish", async function () {
      if (!appEnv("LOG_ACTIVITY", false)) {
        return;
      }

      const { method, originalUrl } = req;
      const sourceIp = RequestIp.getClientIp(req);
      const statusCode = res.statusCode;
      const body = req.body;
      delete body.password;

      const resource = originalUrl.split("/")[2].replace("-", "_");

      const authEndpoints = ["login", "logout", "forgot_password"];
      const allowedEndpoints = Object.values(ActivityEntity as any);
      allowedEndpoints.push(...authEndpoints);
      const isAuthEndpoint = authEndpoints.includes(resource);

      // log skipping conditions
      if (
        !statusCode ||
        (statusCode >= 400 && !isAuthEndpoint) ||
        !["POST", "PUT", "DELETE", "PATCH"].includes(method) ||
        !allowedEndpoints.includes(resource) ||
        originalUrl == "/api/user/filter"
      ) {
        return;
      }

      const log = new UserActivityLogModel();
      log.host = req.hostname;
      log.source_ip = ["login", "forgot_password"].includes(resource)
        ? sourceIp
        : null;
      log.method = method as Method;
      log.endpoint = originalUrl.replace("/api", "");
      log.body = body;
      log.user_id = req.user ? req.user["Id"] : null;
      log.company_id = req.user ? req.user["company_id"] : null;
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
