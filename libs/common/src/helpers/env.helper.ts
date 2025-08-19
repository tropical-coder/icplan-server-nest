import "dotenv/config";
export function appEnv(name: string, def?: any): any {
	let val = process.env[name] ?? def;

	if (typeof val == 'string') {
		if (val.toLowerCase() == 'true') {
			val = true;
		} else if (val.toLowerCase() == 'false') {
			val = false;
		}
	}
	return val;
}
