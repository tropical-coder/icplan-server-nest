import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

// Stop two fields to be given in the DTO
@ValidatorConstraint({ name: 'IsEitherFieldSet', async: false })
export class IsEitherFieldSet implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    const currentValue = value;

    // Both fields should not be set
    return !(currentValue && relatedValue);
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} and ${relatedPropertyName} cannot be set at the same time.`;
  }
}