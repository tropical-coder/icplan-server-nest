import { ResponseCode, ResponseMessage } from "../helpers/ServerResponse";
import {
  ExpressErrorMiddlewareInterface,
  Middleware,
} from "routing-controllers";
import * as Express from "express";
import { KeyValuePair } from "../database/DatabaseLoader";
import * as Sentry from "@sentry/node";

@Middleware({ type: "after" })
export class ErrorHandlerMiddleware implements ExpressErrorMiddlewareInterface {
  private prepareBadRequestExceptions(error: any): KeyValuePair<string> {
    let errors: KeyValuePair<string> = {};

    let func = function (err) {
      if (err.property && err.constraints) {
        let message: Array<string> = [];

        for (let constraint in err.constraints) {
          message.push(err.constraints[constraint]);
        }
        errors[err.property] = message.join(", ");
      } else if (Array.isArray(err.children) && err.children.length > 0) {
        for (let child of err.children) {
          func(child);
        }
      }
    };
    if (error && error.errors && Array.isArray(error.errors)) {
      for (let err of error.errors) {
        func(err);
      }
    }
    return Object.keys(errors).length ? errors : null;
  }

  private getResponse = (
    code: number,
    message: string,
    data = null
  ): iJsonResponse => {
    return {
      data,
      code,
      message,
    };
  };

  private badRequestException = (
    message: string = ResponseMessage.BAD_REQUEST,
    data: any
  ) => this.getResponse(ResponseCode.BAD_REQUEST, message, data);
  private unAuthorizedException = (
    message: string = ResponseMessage.UNAUTHORIZED
  ): iJsonResponse => this.getResponse(ResponseCode.UNAUTHORIZED, message);
  private notFoundException = (message: string = ResponseMessage.NOT_FOUND) =>
    this.getResponse(ResponseCode.NOT_FOUND, message);
  private fatalErrorException = (
    message: string = ResponseMessage.SERVER_ERROR
  ) => this.getResponse(ResponseCode.SERVER_ERROR, message);
  private forbiddenException = (message: string = ResponseMessage.FORBIDDEN) =>
    this.getResponse(ResponseCode.FORBIDDEN, message);
  private conflictError = (message: string = ResponseMessage.CONFLICT) =>
    this.getResponse(ResponseCode.CONFLICT, message);
  private notAcceptableError = (
    message: string = ResponseMessage.NOT_ACCEPTABLE
  ) => this.getResponse(ResponseCode.NOT_ACCEPTABLE, message);

  public error(
    error: any,
    req: Express.Request,
    res: Express.Response,
    next: Express.NextFunction
  ) {
    console.log(error.stack);
    if (["LIMIT_FILE_SIZE", "LIMIT_FIELD_VALUE"].includes(error.code)) {
      error = this.badRequestException("File Too Large", {
        errors: this.prepareBadRequestExceptions(error),
      });
    } else if (error.httpCode === ResponseCode.BAD_REQUEST) {
      error = this.badRequestException(error.message, {
        Errors: this.prepareBadRequestExceptions(error),
      });
    } else if (error.httpCode === ResponseCode.FORBIDDEN) {
      error = this.forbiddenException(error.message);
    } else if (error.httpCode === ResponseCode.UNAUTHORIZED) {
      error = this.unAuthorizedException(error.message);
    } else if (error.httpCode === ResponseCode.NOT_FOUND) {
      error = this.notFoundException(error.message);
    } else if (error.httpCode === ResponseCode.CONFLICT) {
      error = this.conflictError(error.message);
    } else if (error.httpCode === ResponseCode.NOT_ACCEPTABLE) {
      error = this.notAcceptableError(error.message);
    } else {
      console.log(JSON.stringify(error.message));
      error = this.fatalErrorException();
    }

    if (error) {
      res.status(error.code);
      res.json({ data: error.data, code: error.code, message: error.message });
      next(error);
    } else if (!error) {
      next();
    }
  }
}

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

interface iJsonResponse {
  message: string;
  data: any;
  code: number;
}
