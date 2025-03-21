import * as ko from "knockout";
import * as validation from "knockout.validation";
import { ISettingsProvider } from "@paperbits/common/configuration";
import { HttpClient, HttpRequest } from "@paperbits/common/http";
import { Component, OnMounted, Param } from "@paperbits/common/ko/decorators";
import { downloadableTypes, RequestBodyType, ServiceSkuName, TypeOfApi } from "../../../../../constants";
import { Api } from "../../../../../models/api";
import { AuthorizationServer } from "../../../../../models/authorizationServer";
import { ConsoleHeader } from "../../../../../models/console/consoleHeader";
import { ConsoleOperation } from "../../../../../models/console/consoleOperation";
import { ConsoleParameter } from "../../../../../models/console/consoleParameter";
import { KnownHttpHeaders } from "../../../../../models/knownHttpHeaders";
import { KnownStatusCodes } from "../../../../../models/knownStatusCodes";
import { Operation } from "../../../../../models/operation";
import { Revision } from "../../../../../models/revision";
import { RouteHelper } from "../../../../../routing/routeHelper";
import { ApiService } from "../../../../../services/apiService";
import { TemplatingService } from "../../../../../services/templatingService";
import { TenantService } from "../../../../../services/tenantService";
import { Utils } from "../../../../../utils";
import template from "./operation-console.html";
import { ResponsePackage } from "./responsePackage";
import { templates } from "./templates/templates";
import { LogItem, WebsocketClient } from "./websocketClient";
import { KnownMimeTypes } from "../../../../../models/knownMimeTypes";
import { ConsoleRepresentation } from "../../../../../models/console/consoleRepresentation";
import { saveAs } from "file-saver";
import { getExtension } from "mime";
import { Logger } from "@paperbits/common/logging";

@Component({
    selector: "operation-console",
    template: template
})
export class OperationConsole {
    public readonly sendingRequest: ko.Observable<boolean>;
    public readonly working: ko.Observable<boolean>;
    public readonly consoleOperation: ko.Observable<ConsoleOperation>;
    public readonly secretsRevealed: ko.Observable<boolean>;
    public readonly responseStatusCode: ko.Observable<string>;
    public readonly responseStatusText: ko.Observable<string>;
    public readonly responseBody: ko.Observable<string>;
    public readonly responseHeadersString: ko.Observable<string>;
    public readonly selectedLanguage: ko.Observable<string>;
    public readonly selectedRepresentation: ko.Observable<ConsoleRepresentation>;
    public readonly requestError: ko.Observable<string>;
    public readonly codeSample: ko.Observable<string>;
    public readonly showHostnameInput: ko.Observable<boolean>;
    public readonly selectedHostname: ko.Observable<string>;
    public readonly isHostnameWildcarded: ko.Computed<boolean>;
    public readonly hostnameSelectionEnabled: ko.Observable<boolean>;
    public readonly wildcardSegment: ko.Observable<string>;
    public readonly collapsedParameters: ko.Observable<boolean>;
    public readonly collapsedHeaders: ko.Observable<boolean>;
    public readonly collapsedBody: ko.Observable<boolean>;
    public readonly collapsedRequest: ko.Observable<boolean>;
    public isConsumptionMode: boolean;
    public templates: Object;
    public backendUrl: string;
    public requestLanguages: Object[];

    public readonly wsConnected: ko.Observable<boolean>;
    public readonly wsConnecting: ko.Observable<boolean>;
    public readonly wsStatus: ko.Observable<string>;
    public readonly wsSending: ko.Observable<boolean>;
    public readonly wsSendStatus: ko.Observable<string>;
    public readonly wsPayload: ko.Observable<string | File>;
    public readonly wsDataFormat: ko.Observable<string>;
    public readonly wsLogItems: ko.ObservableArray<LogItem>;

    private bodyStash: string;

    constructor(
        private readonly apiService: ApiService,
        private readonly tenantService: TenantService,
        private readonly httpClient: HttpClient,
        private readonly routeHelper: RouteHelper,
        private readonly settingsProvider: ISettingsProvider,
        private readonly logger: Logger
    ) {
        this.templates = templates;

        this.requestError = ko.observable();
        this.responseStatusCode = ko.observable();
        this.responseStatusText = ko.observable();
        this.responseHeadersString = ko.observable();
        this.responseBody = ko.observable();
        this.selectedLanguage = ko.observable("http");
        this.selectedRepresentation = ko.observable();
        this.api = ko.observable<Api>();
        this.revision = ko.observable();
        this.operation = ko.observable();
        this.hostnames = ko.observable();
        this.consoleOperation = ko.observable();
        this.secretsRevealed = ko.observable();
        this.working = ko.observable(true);
        this.sendingRequest = ko.observable(false);
        this.codeSample = ko.observable();
        this.onFileSelect = this.onFileSelect.bind(this);
        this.showHostnameInput = ko.observable(false);
        this.selectedHostname = ko.observable("");
        this.hostnameSelectionEnabled = ko.observable();
        this.isHostnameWildcarded = ko.computed(() => this.selectedHostname().includes("*"));
        this.authorizationServer = ko.observable();

        this.useCorsProxy = ko.observable(false);
        this.wildcardSegment = ko.observable();

        this.wsConnected = ko.observable(false);
        this.wsConnecting = ko.observable(false);
        this.wsStatus = ko.observable("Connect");
        this.wsSendStatus = ko.observable("Send");
        this.wsSending = ko.observable(false);
        this.wsPayload = ko.observable();
        this.wsDataFormat = ko.observable("raw");
        this.wsLogItems = ko.observableArray([]);

        this.collapsedParameters = ko.observable(false);
        this.collapsedHeaders = ko.observable(false);
        this.collapsedBody = ko.observable(false);
        this.collapsedRequest = ko.observable(false);

        this.bodyStash = "";

        validation.rules["maxFileSize"] = {
            validator: (file: File, maxSize: number) => !file || file.size < maxSize,
            message: (size) => `The file size cannot exceed ${Utils.formatBytes(size)}.`
        };

        validation.registerExtenders();

        validation.init({
            insertMessages: false,
            errorElementClass: "is-invalid",
            decorateInputElement: true
        });
    }

    @Param()
    public api: ko.Observable<Api>;

    @Param()
    public operation: ko.Observable<Operation>;

    @Param()
    public revision: ko.Observable<Revision>;

    @Param()
    public hostnames: ko.Observable<string[]>;

    @Param()
    public authorizationServer: ko.Observable<AuthorizationServer>;

    @Param()
    public useCorsProxy: ko.Observable<boolean>;

    @OnMounted()
    public async initialize(): Promise<void> {
        const skuName = await this.tenantService.getServiceSkuName();
        this.isConsumptionMode = skuName === ServiceSkuName.Consumption;
        this.backendUrl = await this.settingsProvider.getSetting<string>("backendUrl");
        this.requestLanguages = (this.api().type === TypeOfApi.webSocket) ? this.loadRequestLanguagesWs() : this.loadRequestLanguagesRest();

        await this.resetConsole();

        this.selectedHostname.subscribe(this.setHostname);
        this.wildcardSegment.subscribe((wildcardSegment) => {
            const hostname = wildcardSegment
                ? this.selectedHostname().replace("*", wildcardSegment)
                : this.selectedHostname();

            this.setHostname(hostname);
        });
        this.api.subscribe(this.resetConsole);
        this.operation.subscribe(this.resetConsole);
        this.selectedLanguage.subscribe(this.updateRequestSummary);
        this.selectedRepresentation.subscribe(representation => {
            this.consoleOperation().request.selectedRepresentation(representation);
            this.updateRequestSummary();
        });
        this.selectedLanguage.subscribe(this.logLanguageUpdated);
    }

    private async resetConsole(): Promise<void> {
        const selectedOperation = this.operation();
        const selectedApi = this.api();

        if (!selectedApi || !selectedOperation) {
            return;
        }

        this.bodyStash = "";

        this.working(true);
        this.sendingRequest(false);
        this.wsConnected(false);
        this.consoleOperation(null);
        this.secretsRevealed(false);
        this.responseStatusCode(null);
        this.responseStatusText(null);
        this.responseBody(null);

        const operation = await this.apiService.getOperation(selectedOperation.id);
        const consoleOperation = new ConsoleOperation(selectedApi, operation);
        this.consoleOperation(consoleOperation);

        const hostnames = this.hostnames();
        this.hostnameSelectionEnabled(this.hostnames()?.length > 1);

        let hostname = "";

        if (hostnames) {
            hostname = hostnames[0];
            this.selectedHostname(hostname);
        } else {
            this.showHostnameInput(true);
        }

        this.hostnameSelectionEnabled(this.hostnames()?.length > 1);
        consoleOperation.host.hostname(hostname);

        if (this.api().type === TypeOfApi.soap) {
            this.setSoapHeaders();
        }

        if (this.api().type === TypeOfApi.webSocket) {
            this.selectedLanguage("ws_wscat");
        }

        if (!this.isConsumptionMode && this.api().type !== TypeOfApi.webSocket) {
            this.setNoCacheHeader();
        }

        if (this.api().apiVersionSet && this.api().apiVersionSet.versioningScheme === "Header") {
            this.setVersionHeader();
        }

        this.consoleOperation().request.meaningfulHeaders().forEach(header => header.value.subscribe(_ => this.updateRequestSummary()));
        this.consoleOperation().request.body.subscribe(_ => this.updateRequestSummary());
        this.consoleOperation().request.queryParameters().forEach(parameter => parameter.value.subscribe(_ => this.updateRequestSummary()));

        this.updateRequestSummary();
        this.working(false);
    }

    private setSoapHeaders(): void {
        const consoleOperation = this.consoleOperation();
        const representation = consoleOperation.request.representations[0];

        if (representation) {
            if (representation.contentType.toLowerCase() === "text/xml".toLowerCase()) {
                // Soap 1.1
                consoleOperation.setHeader(KnownHttpHeaders.SoapAction, `"${consoleOperation.urlTemplate.split("=")[1]}"`);
            }

            if (representation.contentType.toLowerCase() === "application/soap+xml".toLowerCase()) {
                // Soap 1.2
                const contentHeader = consoleOperation.request.headers()
                    .find(header => header.name().toLowerCase() === KnownHttpHeaders.ContentType.toLowerCase());

                if (contentHeader) {
                    const contentType = `${contentHeader.value()};action="${consoleOperation.urlTemplate.split("=")[1]}"`;
                    contentHeader.value(contentType);
                }
            }
        }
        else {
            consoleOperation.setHeader(KnownHttpHeaders.SoapAction, "\"" + consoleOperation.urlTemplate.split("=")[1] + "\"");
        }

        consoleOperation.urlTemplate = "";
    }

    private loadRequestLanguagesRest(): Object[] {
        return [
            { value: "http", text: "HTTP" },
            { value: "csharp", text: "C#" },
            { value: "curl", text: "Curl" },
            { value: "java", text: "Java" },
            { value: "javascript", text: "JavaScript" },
            { value: "php", text: "PHP" },
            { value: "python", text: "Python" },
            { value: "ruby", text: "Ruby" },
            { value: "swift", text: "Swift" },
        ];
    }

    private loadRequestLanguagesWs(): Object[] {
        return [
            { value: "ws_wscat", text: "wscat" },
            { value: "ws_csharp", text: "C#" },
            { value: "ws_javascript", text: "JavaScript" }
        ];
    }

    private setHostname(hostname: string): void {
        this.consoleOperation().host.hostname(hostname);
        this.updateRequestSummary();
    }

    public addBody(): void {
        this.consoleOperation().hasBody(true);
        this.consoleOperation().request.body(this.bodyStash);
    }

    public removeBody(): void {
        this.consoleOperation().hasBody(false);
        this.bodyStash = this.consoleOperation().request.body();
        this.consoleOperation().request.body(null);
    }

    public revertBody(): void {
        this.consoleOperation().request.body(this.selectedRepresentation().sample);
    }

    public addHeader(): void {
        const newHeader = new ConsoleHeader();
        this.consoleOperation().request.headers.push(newHeader);
        newHeader.value.subscribe(_ => this.updateRequestSummary());

        this.updateRequestSummary();
    }

    public removeHeader(header: ConsoleHeader): void {
        this.consoleOperation().request.headers.remove(header);
        this.updateRequestSummary();
    }

    public addQueryParameter(): void {
        const newParameter = new ConsoleParameter();
        this.consoleOperation().request.queryParameters.push(newParameter);
        newParameter.value.subscribe(_ => this.updateRequestSummary());

        this.updateRequestSummary();
    }

    public removeQueryParameter(parameter: ConsoleParameter): void {
        this.consoleOperation().request.queryParameters.remove(parameter);
        this.updateRequestSummary();
    }

    private setNoCacheHeader(): void {
        this.consoleOperation().setHeader(KnownHttpHeaders.CacheControl, "no-cache", "string", "Disable caching.");
    }

    private setVersionHeader(): void {
        this.consoleOperation().setHeader(this.api().apiVersionSet.versionHeaderName, this.api().apiVersion, "string", "API version");
    }

    public async updateRequestSummary(): Promise<void> {
        const template = templates[this.selectedLanguage()];
        const codeSample = await TemplatingService.render(template, { console: ko.toJS(this.consoleOperation), showSecrets: this.secretsRevealed });

        this.codeSample(codeSample);
    }

    public onFileSelect(file: File): void {
        this.consoleOperation().request.binary(file);
        this.updateRequestSummary();
    }

    public async validateAndSendRequest(): Promise<void> {
        const operation = this.consoleOperation();
        const templateParameters = operation.templateParameters();
        const queryParameters = operation.request.queryParameters();
        const headers = operation.request.headers();
        const binary = operation.request.binary;
        const parameters = [].concat(templateParameters, queryParameters, headers);
        const validationGroup = validation.group(parameters.map(x => x.value).concat(binary), { live: true });
        const clientErrors = validationGroup();

        if (clientErrors.length > 0) {
            validationGroup.showAllMessages();
            return;
        }

        this.sendRequest();
    }

    public async sendFromBrowser(url: string, method: string, headers: ConsoleHeader[], body: any, operationName: string) {
        let headersRequest: HeadersInit = {};

        headers.forEach(header => {
            if (!headersRequest[header.name()]) {
                headersRequest[header.name()] = [];
            }
            headersRequest[header.name()].push(header.value())
        });
        const response = await fetch(url, {
            method: method,
            headers: headersRequest,
            body: body
        });

        let headersString = "";
        response.headers.forEach((value, name) => headersString += `${name}: ${value}\n`);

        const contentTypeHeaderValue = response.headers.get(KnownHttpHeaders.ContentType);

        const responseReturn: any = {
            headers: headersString,
            contentTypeHeader: contentTypeHeaderValue,
            statusCode: response.status,
            statusText: response.statusText
        };

        if (downloadableTypes.some(type => contentTypeHeaderValue.includes(type))) {
            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                chunks.push(value);
            }

            const blob = new Blob(chunks, { type: contentTypeHeaderValue });
            const fileExtension = getExtension(contentTypeHeaderValue);

            if (fileExtension) {
                saveAs(blob, operationName + "." + fileExtension);
            } else {
                saveAs(blob, operationName);
            }
        } else {
            responseReturn.body = await response.text();
        }

        return responseReturn;
    }

    public async sendFromProxy<T>(request: HttpRequest) {
        if (request.body) {
            request.body = Buffer.from(request.body);
        }

        const formData = new FormData();
        const requestPackage = new Blob([JSON.stringify(request)], { type: KnownMimeTypes.Json });
        formData.append("requestPackage", requestPackage);

        const baseProxyUrl = this.backendUrl || "";
        const apiName = this.api().name;

        const proxiedRequest: HttpRequest = {
            url: `${baseProxyUrl}/send`,
            method: "POST",
            headers: [{ name: "X-Ms-Api-Name", value: apiName }],
            body: formData
        };

        const proxiedResponse = await this.httpClient.send<ResponsePackage>(proxiedRequest);
        const responsePackage = proxiedResponse.toObject();

        const responseBodyBuffer = responsePackage.body
            ? Buffer.from(responsePackage.body.data)
            : null;

        const headersString = responsePackage.headers.map(x => `${x.name}: ${x.value}`).join("\n");
        const contentTypeHeader = responsePackage.headers.find(x => x.name === KnownHttpHeaders.ContentType.toLowerCase());

        const response: any = {
            headers: headersString,
            contentTypeHeader: contentTypeHeader && contentTypeHeader.value,
            statusCode: responsePackage.statusCode,
            statusText: responsePackage.statusMessage,
            body: responseBodyBuffer.toString("utf8")
        };

        return response;
    }

    private async sendRequest(): Promise<void> {
        this.requestError(null);
        this.sendingRequest(true);
        this.responseStatusCode(null);
        const consoleOperation = this.consoleOperation();
        const request = consoleOperation.request;
        const url = consoleOperation.requestUrl();
        const method = consoleOperation.method;
        const headers = [...request.headers()];

        let payload;

        switch (consoleOperation.request.bodyFormat()) {
            case RequestBodyType.raw:
                payload = request.body();
                break;

            case RequestBodyType.binary:
                payload = await Utils.readFileAsByteArray(request.binary());
                break;

            case RequestBodyType.form:
                payload = request.getFormDataPayload();
                break;

            default:
                throw new Error("Unknown body format.");
        }

        try {
            const request: HttpRequest = {
                url: url,
                method: method,
                headers: headers
                    .map(x => { return { name: x.name(), value: x.value() ?? "" }; })
                    .filter(x => !!x.name && !!x.value),
                body: payload
            };

            const response = this.useCorsProxy()
                ? await this.sendFromProxy(request)
                : await this.sendFromBrowser(url, method, headers, payload, consoleOperation.name);

            this.responseHeadersString(response.headers);

            const knownStatusCode = KnownStatusCodes.find(x => x.code === response.statusCode);

            const responseStatusText = response.statusText || knownStatusCode
                ? knownStatusCode.description
                : "Unknown";

            this.responseStatusCode(response.statusCode.toString());
            this.responseStatusText(responseStatusText);
            this.responseBody(response.body);

            if (response.contentTypeHeader) {
                if (response.contentTypeHeader.toLowerCase().includes("json")) {
                    this.responseBody(Utils.formatJson(this.responseBody()));
                }

                if (response.contentTypeHeader.toLowerCase().includes("xml")) {
                    this.responseBody(Utils.formatXml(this.responseBody()));
                }
            }

            this.logSentRequest(this.api().name, consoleOperation.opeationName, method, response.statusCode.toString());
        }
        catch (error) {
            this.logSentRequest(this.api().name, consoleOperation.opeationName, method, error.code?.toString());
            
            if (error.code && error.code === "RequestError") {
                this.requestError(`Since the browser initiates the request, it requires Cross-Origin Resource Sharing (CORS) enabled on the server. <a href="https://aka.ms/AA4e482" target="_blank">Learn more</a>`);
            }
        }
        finally {
            this.sendingRequest(false);
        }
    }

    private ws: WebsocketClient;

    public async wsConnect(): Promise<void> {
        const operation = this.consoleOperation();
        const templateParameters = operation.templateParameters();
        const queryParameters = operation.request.queryParameters();
        const headers = operation.request.headers();
        const binary = operation.request.binary;
        const parameters = [].concat(templateParameters, queryParameters, headers);
        const validationGroup = validation.group(parameters.map(x => x.value).concat(binary), { live: true });
        const clientErrors = validationGroup();

        if (clientErrors.length > 0) {
            validationGroup.showAllMessages();
            return;
        }

        this.sendWsConnect();
    }

    public clearLogs(): void {
        this.ws?.clearLogs();
    }

    public async wsDisconnect(): Promise<void> {
        if (this.ws) {
            this.ws.disconnect();
        }
    }

    public async wsSendData(): Promise<void> {
        let data = this.wsPayload();
        if (this.wsDataFormat() === "binary") {
            data = this.consoleOperation().request.binary();
        }
        if (this.ws && data) {
            this.wsSending(true);
            this.wsSendStatus("Sending...");
            this.ws.send(data);
            this.wsSendStatus("Send");
        }
    }

    private initWebSocket(): void {
        if (!this.ws) {
            this.ws = new WebsocketClient();
            this.ws.onOpen = () => {
                this.wsConnecting(false);
                this.wsConnected(true);
                this.wsStatus("Connected");
            };
            this.ws.onClose = () => {
                this.wsSending(false);
                this.wsConnecting(false);
                this.wsConnected(false);
                this.wsStatus("Connect");
            };
            this.ws.onError = (error: string) => {
                this.wsSending(false);
                this.requestError(error);
            };
            this.ws.onMessage = (message: MessageEvent<any>) => {
                this.wsSending(false);
                this.responseBody(message.data);
            };
            this.ws.onLogItem = (data: LogItem) => {
                this.wsLogItems(this.ws.logItems);
            };
        }
    }

    private sendWsConnect(): void {
        if (this.ws?.isConnected) {
            return;
        }

        this.requestError(null);
        this.wsConnecting(true);
        this.wsConnected(false);
        this.responseStatusCode(null);

        const consoleOperation = this.consoleOperation();
        const url = consoleOperation.wsUrl();

        this.initWebSocket();
        this.wsStatus("Connecting...");
        this.ws.connect(url);
    }

    public toggleRequestSummarySecrets(): void {
        this.secretsRevealed(!this.secretsRevealed());
        this.updateRequestSummary();
    }

    public toggleSecretHeader(header: ConsoleHeader): void {
        header.toggleRevealed();
    }

    public toggleSecretParameter(parameter: ConsoleParameter): void {
        parameter.toggleRevealed();
    }

    public async getPlainTextCodeSample(): Promise<string> {
        const template = templates[this.selectedLanguage()];
        return await TemplatingService.render(template, { console: ko.toJS(this.consoleOperation), showSecrets: true });
    }

    public getApiReferenceUrl(): string {
        return this.routeHelper.getApiReferenceUrl(this.api().name);
    }

    public collapseParameters(): void {
        this.collapsedParameters(!this.collapsedParameters());
    }

    public collapseHeaders(): void {
        this.collapsedHeaders(!this.collapsedHeaders());
    }

    public collapseBody(): void {
        this.collapsedBody(!this.collapsedBody());
    }

    public collapseRequest(): void {
        this.collapsedRequest(!this.collapsedRequest());
    }

    public logCopyEvent(): void {
        this.logger.trackEvent("CodeSampleCopied", { "language": this.selectedLanguage(), "message": "Code sample copied to clipboard" });
    }

    public logLanguageUpdated(): void {
        this.logger.trackEvent("CodeLanguageChange", { "language": this.selectedLanguage(), "message": "Code sample language changed" });
    }

    public logSentRequest(apiName: string, operationName: string, apiMethod: string, responseCode: string): void {
        this.logger.trackEvent("TestConsoleRequest", { "apiName": apiName, "operationName": operationName, "apiMethod": apiMethod, "responseCode": responseCode });
    }
}
