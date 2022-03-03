import http from 'http';
import Koa from 'koa';
import Gun from 'gun';

const app = new Koa();
app.proxy = true;
const port = 9201
const main =  http.createServer( app);
main.listen( port );
Gun({web: main });