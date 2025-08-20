import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { statusConfig } from "../constants/status.constant";

export function IsValidStatus(
  entityType: "plan" | "communication",
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidStatus",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const subdomain = (args.object as any)._subdomain || "default";
          const statusValue = value;

          if (statusValue === null || statusValue === undefined) {
            return true; // Let other validators like @IsNotEmpty handle this
          }

          const configMap = statusConfig[entityType];
          const statusMap = configMap[subdomain] || configMap.default;

          const isValid = statusValue in statusMap;

          return isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const subdomain = (args.object as any).subdomain || "default";
          const configMap = statusConfig[entityType];
          const statusMap = configMap[subdomain] || configMap.default;
          const validKeys = Object.keys(statusMap).join(", ");
          return `Invalid status. Allowed values for this company are: ${validKeys}`;
        },
      },
    });
  };
}
