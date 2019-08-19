const K = require("koa");
const R = require("koa-router");
const C = require("openid-client");

// Configs
const mycallback = "http://127.0.0.1:8080/callback";
const oidc_op = "https://stripe.local/dex/.well-known/openid-configuration";
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
    app.use(router.routes())
       .use(router.allowedMethods());

    app.listen(8080);
}


// OIDC OP Discovery
C.Issuer.discover(oidc_op)
.then(op => {
    const client = new op.Client({
        client_id: op_client_id,
        client_secret: op_client_secret,
        redirect_uris: [mycallback],
        response_types: ["code"],
    });

    startup(client);
});

