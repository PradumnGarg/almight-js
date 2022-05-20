import { BaseProviderChannel, BrowserProviderChannel } from "./channel";
import { ChannelIsNotDefined } from "./exceptions";
import { IProviderAdapter, ProviderRequestMethodArguments, SubscriptionCallback } from "./types";

/**
 * ChainAdapters wrap individual setup and method calls for different chains
 * to one plug&play class.
 * 
 * The Base class will later be extended for creating method wrappers such as
 * Account methods, Transaction methods, etc.
 * Each ChainMethodAdapter will have their own implementation of common methods with
 * description input and output typing along with extended set of un-common methods
 * 
 * Initialisation with channel
 * 
 * const chainAdapter = new BaseChainAdapter({channel: new BaseProviderChannel(...)}) 
 * chainAdapter.request(...)
 * 
 */


interface IChainAdapterOptions {
    channel: BaseProviderChannel,
    onConnect?: (options?: any) => void
}
export class BaseChainAdapter implements IProviderAdapter {

    public static providerPath = null;

    public get providerPath(): string { return (this.constructor as any).providerPath }

    protected _channel: BaseProviderChannel;

    protected _methodNameMap: Record<string, string> = {};

    // Allow high-order classes to easily differentiate between an instance and class
    public static isAdapterClass = true;



    public channelConnect?: <T = any, R = any>(options?: R) => Promise<T>;
    public channelCheckSession?: <P = any, S = any>(session: S) => Promise<[boolean, P]>;

    public channelOnConnect?: (options?: any) => void;


    public onConnectCallback?: (options?: any) => void;

    protected getMethodName(name: string): string {
        return this._methodNameMap[name] ?? name;
    }

    public setMethodName(key: string, value: string): void {
        this._methodNameMap[key] = value;
    }

    public get channel(): BaseProviderChannel { return this._channel }

    public set channel(_channel: BaseProviderChannel) { this._channel = _channel }


    public bindChannelDelegations(): void {
        let self = this;
        if (this.channel instanceof BrowserProviderChannel) {
            this.channel.providerPath = this.providerPath;
        }

        this.channelOnConnect = function (options?: any): void {
            self.onConnectCallback(options);
        }
    }



    constructor(options: IChainAdapterOptions) {
        this.channel = options.channel;
        this.onConnectCallback = options.onConnect;
        this.checkChannel()
        this.bindChannelDelegations();
    }

    async checkSession<P>(): Promise<[boolean, P]> {
        this.checkChannel()
        return await this.channel.checkSession(this)
    }
    async connect(options?: any): Promise<void> {
        this.checkChannel()

        await this.channel.connect(options, this)

    }

    protected checkChannel(): void {
        if (this.channel === undefined) throw new ChannelIsNotDefined(this.constructor.name);
    }

    async request<T = any>(data: ProviderRequestMethodArguments, timeout?: number): Promise<T> {
        this.checkChannel();
        return await this.channel.request<T>(data, timeout);
    }


    async checkConnection(): Promise<boolean> {
        return await this.channel.checkConnection(this);
    }

    on(event: string, callback: SubscriptionCallback): void {
        if (this.channel === undefined) throw new ChannelIsNotDefined(this.constructor.name)
        this.channel.on(event, callback);
    }
}

export class EthereumChainAdapter extends BaseChainAdapter {

    public static providerPath = "ethereum";

}


