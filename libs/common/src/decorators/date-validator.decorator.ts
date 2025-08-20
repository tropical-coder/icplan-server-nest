import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import moment from 'moment';

export function IsValidDate(validationOptions?: ValidationOptions) {
	return function(object: Object, propertyName: string) {
		registerDecorator({
			name: 'IsValidDate',
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			validator: {
				validate(value: any, args: ValidationArguments) {
					const regEx = /^\d{4}-\d{2}-\d{2}$/;

					if (!value.match(regEx)) return false; // Invalid format

					let d = new Date(value);
					if (Number.isNaN(d.getTime())) return false; // Invalid date

					return d.toISOString().slice(0, 10) === value;
				}
			}
		});
	};
}

export function IsValidTime(validationOptions?: ValidationOptions) {
	return function(object: Object, propertyName: string) {
		registerDecorator({
			name: 'IsValidDate',
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			validator: {
				validate(value: any, args: ValidationArguments) {
					const regEx = /^\d{2}:\d{2}$/;

					if (!value.match(regEx)) return false; // Invalid format

					return moment(value, 'hh:mm').isValid();
				}
			}
		});
	};
}

export function IsDateGreaterThanEqual(property: string, validationOptions?: ValidationOptions) {
	return function(object: Object, propertyName: string) {
		registerDecorator({
			name: 'IsValidDate',
			target: object.constructor,
			propertyName: propertyName,
			constraints: [ property ],
			options: validationOptions,
			validator: {
				validate(value: any, args: ValidationArguments) {
					const [ relatedPropertyName ] = args.constraints;
					const relatedValue = (args.object as any)[relatedPropertyName];

					return new Date(value) >= new Date(relatedValue);
				}
			}
		});
	};
}
