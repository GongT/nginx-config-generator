export type ValueType = boolean|string|string[]|null;

export interface Merge {
	push(item: ConfigValue|ConfigValuesBundle);
	unshift(item: ConfigValue|ConfigValuesBundle);
}

export class ConfigValue {
	protected endSign: string = ';';
	private _value: string;
	private _comment: string;
	
	constructor(public name: string = '', value: ValueType = null) {
		this.setValue(value);
	}
	
	wrap(): ConfigValue {
		return new ConfigValue(this.name, JSON.stringify(this._value));
	}
	
	public setValue(value: ValueType) {
		if (value === null) {
			this._value = '';
		} else if (Array.isArray(value)) {
			this._value = value.join(' ');
		} else if (typeof value === 'boolean') {
			this._value = value? 'on' : 'off';
		} else {
			this._value = value;
		}
	}
	
	public get value(): string {
		return this._value;
	}
	
	toString() {
		if (!this.name) {
			throw new TypeError('no value name');
		}
		if (!this.value && this.value !== '') {
			throw new TypeError('no value content of ' + this.name);
		}
		return `${this.name} ${this.value}${this.endSign}${this.comment}`;
	}
	
	get comment(): string {
		return this._comment? ' #' + this._comment : '';
	}
	
	set comment(v: string) {
		this._comment = v;
	}
}

export function stringifyValue(object: object, boolSwitch: boolean): string[] {
	return Object.keys(object).map((k) => {
		const v = object[k];
		if (typeof v === 'boolean') {
			if (boolSwitch) {
				return `${k}=${v? 'on' : 'off'}`;
			} else {
				return v? k : '';
			}
		} else {
			return `${k}=${v}`;
		}
	});
}

export class ConfigValuesBundle implements Merge {
	protected valueArr: (string|ConfigValuesBundle|ConfigValue)[] = [];
	
	constructor(public readonly name) {
	}
	
	toString() {
		const comment = (this.name === '')? '' : `## section: ${this.name}`;
		const commentEnd = comment? `\n${comment} END` : '';
		return comment + '\n' + this.valueArr.map((v) => {
				return v.toString();
			}).join('\n') + commentEnd;
	}
	
	static fromArray(name: string, values: string[], title: string = name) {
		const ret = new ConfigValuesBundle(title);
		for (let value of values) {
			ret.push(new ConfigValue(name, value))
		}
		return ret;
	}
	
	push(item: string|ConfigValue|ConfigValuesBundle) {
		this.valueArr.push(item);
	}
	
	unshift(item: string|ConfigValue|ConfigValuesBundle) {
		this.valueArr.unshift(item);
	}
	
	replace(item: ConfigValue|ConfigValuesBundle) {
		for (let i = this.valueArr.length - 1; i >= 0; i--) {
			const val = this.valueArr[i];
			if (typeof val !== 'string') {
				if (val.name === item.name) {
					this.valueArr[i] = item;
					return;
				}
			}
		}
		this.valueArr.push(item);
	}
}

export class ConfigSection extends ConfigValue implements Merge {
	protected endSign: string = ''; // end of {} has no ;
	
	protected _name: string;
	protected content: ConfigValuesBundle = new ConfigValuesBundle('');
	private extraContent: string;
	
	constructor(name?: string) {
		super(name);
	}
	
	set name(name: string) {
		this._name = name;
	}
	
	get name() {
		return '\n' + this._name;
	}
	
	push(item: string|ConfigValue|ConfigValuesBundle) {
		if (typeof item === 'string') {
			this.extraContent += '\n' + item;
		} else {
			this.content.push(item);
		}
	}
	
	unshift(item: string|ConfigValue|ConfigValuesBundle) {
		if (typeof item === 'string') {
			this.extraContent = item + this.extraContent;
		} else {
			this.content.unshift(item);
		}
	}
	
	set(item: string|ConfigValue|ConfigValuesBundle) {
		if (typeof item === 'string') {
			this.extraContent += item;
		} else {
			this.content.replace(item);
		}
	}
	
	get value() {
		const content = this.content.toString().trim().replace(/^/mg, '\t');
		let extraContent = '';
		if (this.extraContent) {
			extraContent = '\n\t## extraContent: ' + this.extraContent.trim().replace(/^/mg, '\t');
		}
		return `{
${content}${extraContent}
}`;
	}
}

