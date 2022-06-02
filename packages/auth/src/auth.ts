import { BaseConnector, IDENTITY_PROVIDERS, ISession } from "@almight-sdk/connector";
import { AlmightClient, authAxiosInstance, projectAxiosInstance } from "@almight-sdk/core";
import { BaseStorageInterface, Class, Providers } from "@almight-sdk/utils";
import { AuthenticationFrame, Web3NativeAuthenticationFrame } from "./frames";
import { IAuthenticationApp, ResponseMessageCallbackArgument, UserData, ErrorResponseMessageCallbackArgument, IAuthenticationFrame, AllowedQueryParams, ServerSentIdentityProvider, CurrentSessionStruct } from "./types";

export interface AuthenticationAppConstructorOptions {
    almightClient: AlmightClient;
    frame?: AuthenticationFrame;
    onSuccessCallback: (data: ResponseMessageCallbackArgument) => void;
    onFailureCallback: (data: ErrorResponseMessageCallbackArgument) => void;
    baseAuthenticaionURL?: string;
}

export class AuthenticationApp implements IAuthenticationApp {



    core: AlmightClient;
    frame?: IAuthenticationFrame;
    storage: BaseStorageInterface;
    connector?: BaseConnector;
    sessions: ISession = [];
    baseAuthenticationURL: string = "http://localhost:3000"
    token?: string;

    readonly userKeyName = "almight_user";
    readonly userIdpsName = "almight_user_idps";
    readonly currentSessionName = "almight_connector_current_session"
    readonly AUTH_HEADER_KEY = "AUTHORIZATION"

    onSuccessCallback: (data: ResponseMessageCallbackArgument) => void;
    onFailureCallback: (data: ErrorResponseMessageCallbackArgument) => void;

    setFrame(frame?: IAuthenticationFrame): void {
        if(frame !== undefined){
            this.frame = frame;
            this.frame.app = this;
        }
    }


    getFrame(provider: string): IAuthenticationFrame {
        const idp = IDENTITY_PROVIDERS[provider];
        return new this.webVersionFrameMap[idp.webVersion]();
    }

    webVersionFrameMap: Record<number, Class<IAuthenticationFrame>> = {
        3: Web3NativeAuthenticationFrame
    }



    constructor(options: AuthenticationAppConstructorOptions) {
        this.core = options.almightClient;
        this.storage = this.core.storage;
        this.setFrame(options.frame);
        this.onSuccessCallback = options.onSuccessCallback;
        this.onFailureCallback = options.onFailureCallback;
        this.baseAuthenticationURL = options.baseAuthenticaionURL ?? this.baseAuthenticationURL;

        // TODO: need the below line to load token as variable from localstorage [JUST FOR TESTING]
        this.storage.getItem<string>("auth_token").then((token) => {this.token = token})
    }


    async getToken(token?: string): Promise<string> {
        if (token !== undefined && token !== null) return token;
        if (this.token !== undefined && this.token !== null) return this.token;
        return await this.storage.getItem<string>("auth_token")
    }


    async isAuthenticated(): Promise<boolean> {
        //TODO: Need to implemen
        const header = this.getAuthenticationHeaders();
        if (header[this.AUTH_HEADER_KEY] === undefined) return false;
        const token = await this.getToken();
        if (token === null) return false
        return await this.verifyToken(token)

    }



    async verifyToken(token: string): Promise<boolean>{
        const res = await authAxiosInstance.post("/verify", {"token": this.token});
        return res.status === 200
    }




    async storeJWTToken(token: string): Promise<void> {
        await this.convertTokenToCookie(token)
        // TODO: will remove storage of token on web after working of cookie stick
        // Cookie at the time of development isn't working because of google's policy
        // Google's policy of not allowing cookies to stick when nay port is included in url
        await this.storage.setItem("auth_token", token)
        this.token = token;
        //TODO: Need cover aspects of react native
    }


    async getIdpsFromStore(): Promise<ServerSentIdentityProvider[]> {
        return await this.storage.getItem<ServerSentIdentityProvider[]>(this.userIdpsName);
    }

    async saveUserData(user: UserData): Promise<void> {
        await this.storage.setItem(this.userKeyName, user.user);
        await this.storage.setItem(this.userIdpsName, user.idps);
        await this.setCurrentSession(user.user.current_session);
    }



    async convertTokenToCookie(token: string): Promise<void> {
        await projectAxiosInstance.post("/cooking", {
            "type": "jwt",
            "token": token
        })
    }


    async getProjectIdentifier(): Promise<string> {
        return await this.core.getProjectIdentifier();
    }


    async getUserIdentifier(user_id?: string, token?: string): Promise<string> {

        user_id = user_id ?? (await this.getUserData()).user.user_id;
        if (user_id === undefined) throw new Error("No user is defined")

        const res = await authAxiosInstance.post<{ identifier: string }>("/user/ident", {
            "user_id": user_id
        }, {
            headers: this.getAuthenticationHeaders(token)
        }
        )
        return res.data.identifier;
    }

    getAuthenticationHeaders(token?: string): Record<string, string> {
        token = token ?? this.token;
        return (token === undefined && token !== null) ? {} : {
            [this.AUTH_HEADER_KEY]: `Bearer ${token}`
        }
    }

    async getUserData(token?: string): Promise<UserData> {
        const res = await authAxiosInstance.get<{ data: UserData }>("/me", {
            headers: this.getAuthenticationHeaders(token)
        });
        return res.data.data
    }


    async startAuthentication(provider: Providers): Promise<void> {
        this.setFrame(this.getFrame(provider));
        const projectIdentifier = await this.getProjectIdentifier();
        const data = {
            [AllowedQueryParams.ProjectId]: projectIdentifier,
            [AllowedQueryParams.Provider]: provider,
            
        }
        if(await this.isAuthenticated()){
            data[AllowedQueryParams.UserIdentifier] = await this.getUserIdentifier()
        }
        this.frame.initAuth(data);
    }
    /**
     * In case of web3 session data, update the current session on server
     * Fetch new User data and setup connector
     * 
     * 
     * @param data 
     */
    async setCurrentSession(data: {
        uid: string,
        provider: string,
        session: ISession,
        connector_type: string
    }): Promise<void> {
        await this.storage.setItem(this.currentSessionName, data);
    }



    async getCurrentSession<S = ISession>(): Promise<CurrentSessionStruct<S>> {
        return await this.storage.getItem<CurrentSessionStruct<S>>(this.currentSessionName);
    }



}