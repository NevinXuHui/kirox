export namespace email {
	
	export class LuckMailConfig {
	    name: string;
	    token: string;
	    projectCode: string;
	    emailType: string;
	    domain: string;
	    baseURL: string;
	
	    static createFrom(source: any = {}) {
	        return new LuckMailConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.token = source["token"];
	        this.projectCode = source["projectCode"];
	        this.emailType = source["emailType"];
	        this.domain = source["domain"];
	        this.baseURL = source["baseURL"];
	    }
	}
	export class MoeMailConfig {
	    name: string;
	    url: string;
	    apiKey: string;
	
	    static createFrom(source: any = {}) {
	        return new MoeMailConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.url = source["url"];
	        this.apiKey = source["apiKey"];
	    }
	}
	export class TempMailLolConfig {
	    name: string;
	    apiKey: string;
	    prefix: string;
	    domain: string;
	
	    static createFrom(source: any = {}) {
	        return new TempMailLolConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.apiKey = source["apiKey"];
	        this.prefix = source["prefix"];
	        this.domain = source["domain"];
	    }
	}
	export class YYDSMailConfig {
	    name: string;
	    accessToken: string;
	    domain: string;
	    username: string;
	
	    static createFrom(source: any = {}) {
	        return new YYDSMailConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.accessToken = source["accessToken"];
	        this.domain = source["domain"];
	        this.username = source["username"];
	    }
	}

}

export namespace proxy {
	
	export class Info {
	    ok: boolean;
	    scheme: string;
	    ip: string;
	    country: string;
	    region: string;
	    city: string;
	    isp: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ok = source["ok"];
	        this.scheme = source["scheme"];
	        this.ip = source["ip"];
	        this.country = source["country"];
	        this.region = source["region"];
	        this.city = source["city"];
	        this.isp = source["isp"];
	        this.error = source["error"];
	    }
	}

}

export namespace task {
	
	export class StartTaskRequest {
	    count: number;
	    concurrency: number;
	    delay: number;
	    outputPath: string;
	    emailProvider: string;
	    moemailDomains: string[];
	    moemailConfigs: Record<string, Array<email.MoeMailConfig>>;
	    moemailRandomMode: boolean;
	    luckmailConfig?: email.LuckMailConfig;
	    yydsmailConfig?: email.YYDSMailConfig;
	    tempmaillolConfig?: email.TempMailLolConfig;
	
	    static createFrom(source: any = {}) {
	        return new StartTaskRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.count = source["count"];
	        this.concurrency = source["concurrency"];
	        this.delay = source["delay"];
	        this.outputPath = source["outputPath"];
	        this.emailProvider = source["emailProvider"];
	        this.moemailDomains = source["moemailDomains"];
	        this.moemailConfigs = this.convertValues(source["moemailConfigs"], Array<email.MoeMailConfig>, true);
	        this.moemailRandomMode = source["moemailRandomMode"];
	        this.luckmailConfig = this.convertValues(source["luckmailConfig"], email.LuckMailConfig);
	        this.yydsmailConfig = this.convertValues(source["yydsmailConfig"], email.YYDSMailConfig);
	        this.tempmaillolConfig = this.convertValues(source["tempmaillolConfig"], email.TempMailLolConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

