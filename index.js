const K = require("koa");
const R = require("koa-router");
const C = require("openid-client");
const KoaError = require("koa-error");

// Configs

const hostname = process.env.PROJECT_DOMAIN ? process.env.PROJECT_DOMAIN + ".glitch.me" : "localhost";
const proto = process.env.PROJECT_DOMAIN ? "https" : "http";
const port = process.env.PORT ? process.env.PORT : 8080;
const portstr = (proto == "https") ? "" : ":8080";

const mycallback = proto + "://" + hostname + portstr + "/callback";
const oidc_op = "https://oidcbadop.glitch.me/op/.well-known/openid-configuration";
//const oidc_op = "http://localhost:4000/op/.well-known/openid-configuration";
const op_client_id = "testing";
const op_client_secret = "testing";

function res_start(oidc_client){
    return async function(ctx, next){
        const nexturl = oidc_client.authorizationUrl({scope: "openid"});

        ctx.redirect(nexturl);
    };
}

function res_callback(oidc_client){
    return async function(ctx, next){
        const params = oidc_client.callbackParams(ctx.req);
        const tokenSet = await oidc_client.callback(mycallback, params);
        console.log("Token set = ", tokenSet);

        // FIXME: Implement it.
        ctx.status = 200;
        ctx.response.type = "json";
        ctx.response.body = tokenSet;
    };
}

// Setup server
function startup(oidc_client){
    const app = new K();
    const router = new R();

    // Router config
    router.get("/", res_start(oidc_client));
    router.get("/callback", res_callback(oidc_client));

    // app
    app.use(KoaError({}));
    app.use(router.routes())
       .use(router.allowedMethods());


    app.listen(port);
}

let prepared = false;

function prepare(){
    // OIDC OP Discovery
    C.Issuer.discover(oidc_op)
        .then(op => {
            const client = new op.Client({
                                         client_id: op_client_id,
                                         client_secret: op_client_secret,
                                         redirect_uris: [mycallback],
                                         response_types: ["code"],
            });
            client[C.custom.clock_tolerance] = 10;

            prepared = true;
            console.log("Startup...");
            startup(client);
        });
}

async function entry(){
    while(! prepared){
        try {
            console.log("Trying connect...");
            await prepare();
            await new Promise(r => setTimeout(_ => r(), 4000));
        } catch (e) {
            console.log(e);
        }
    }
}

entry();
