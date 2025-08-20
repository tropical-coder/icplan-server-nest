import { ExpressMiddlewareInterface, Middleware } from "routing-controllers";
import * as sanitizeHtml from "sanitize-html";
import * as Express from "express";

@Middleware({ type: "before" })
export class PayloadSanitizerMiddleware implements ExpressMiddlewareInterface {
  private propertiesToSanitize = {
    "name": {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    },
    "title": {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    },
    "company_name": {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    },
    "description": {
      allowedAttributes: {
        "*" : ["style", "href", "alt", "target", "class", "title", "aria-label"],
      },
      disallowedTagsMode: "discard",
    }
  };

  public use(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
    if (req.body) {
      Object.keys(req.body).forEach((key) => {
        const shouldSanitize = 
          typeof req.body[key] === "string" &&
          key in this.propertiesToSanitize;

        if (!shouldSanitize) {
          return;
        }
        req.body[key] = sanitizeHtml(req.body[key], this.propertiesToSanitize[key]);
      });
    }
    next();
  }
}