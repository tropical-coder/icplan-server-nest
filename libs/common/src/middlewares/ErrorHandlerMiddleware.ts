import * as Express from "express";
import * as Sentry from "@sentry/node";
import { ResponseCode } from "@app/common/enums/response_code.enum";

@Middleware({ type: "after" })
export class SentryErrorHandlerMiddleware
  implements ExpressErrorMiddlewareInterface
{
  error(
    error: any,
    request: any,
    response: any,
    next: (err?: any) => any
  ): void {
    Sentry.setUser(request.user ?? null);
    Sentry.expressErrorHandler({
      shouldHandleError(error: any) {
        // Capture all 4xx and 5xx errors
        if (error.code >= 400) {
          error.status = error.code;
          return true;
        }
        return false;
      },
    })(error, request, response, next);
  }
}