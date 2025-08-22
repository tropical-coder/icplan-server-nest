import { Request } from "express";
import { CheckSubDomain } from "../helpers/UtilHelper";

export function InjectSubdomainMiddleware(req: Request, _, next?: any) {
  req.body["_subdomain"] = CheckSubDomain(req);
  req.query["_subdomain"] = CheckSubDomain(req);
  next();
}