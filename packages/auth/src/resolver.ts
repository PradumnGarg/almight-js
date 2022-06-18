import { IDENTITY_PROVIDERS } from "@almight-sdk/connector";
import { WebVersion } from "@almight-sdk/utils";
import { IdentityResolver } from "./resolvers/resolver";
import { Web3IdentityResolver } from "./resolvers/web3_resolvers";
import { Web2IdentityResolver } from "./resolvers";






const IDENTITY_RESOLVERS: Record<string, IdentityResolver> = {

}

for (const [provider, Idp] of Object.entries(IDENTITY_PROVIDERS)) {
    switch(Idp.webVersion){
        case WebVersion.Decentralized:
            IDENTITY_RESOLVERS[provider] = new Web3IdentityResolver(Idp);
            break;
        case WebVersion.Centralized:
            IDENTITY_RESOLVERS[provider] = new Web2IdentityResolver(Idp);
            break;

    }
}


export { IDENTITY_RESOLVERS, IdentityResolver, Web2IdentityResolver }