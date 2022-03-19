const roadModule = require('./road_server/road');
const expressModule = require('express')();
const serverModule = require('http').Server(this.app);
const ioModule = require('socket.io')(serverModule, {
        path: '/irc',
        connectionTimeout: 5000,
        pingTimeout: 5000,
        pingInterval: 250,
    });
const socketModule = require("./socket_server/socketServer");
require("dotenv").config();

class server {
    constructor()
    {
        this.road = new roadModule();
        this.app = expressModule;
        this.http = serverModule;
        this.port = process.env.PORT || 3001;
    }

    async start() {
        this.app.use("/", this.road.router);
        await this.http.listen(this.port, () => {
            console.log("\x1b[31m", "Server is running on port " + this.port + "\x1b[0m");
        });
        new socketModule(ioModule);
    }
}

module.exports = server;
