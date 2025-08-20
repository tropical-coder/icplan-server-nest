import { registerDecorator, ValidationOptions } from "class-validator";

/**
 * Checks if given value doesn't contain only whitespace characters.
 */
export function IsNotBlank(
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isNotBlank",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === "string" && value.trim().length > 0;
        },
        defaultMessage: function () {
          return `$property cannot be blank`;
        }
      },
    });
  };
}
