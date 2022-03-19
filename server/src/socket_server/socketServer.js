const messageModule = require("./transfert/message");
const commandManagerModule = require("./commands/commandManager");
const databaseModule = require("../database/mongoDataBase");
const { v4: uuidv4 } = require('uuid');
const utils = require("./Utils");
const util = require("util");

class SocketServer {
    constructor(io)
    {
        this.socketServer = io;
        this.database = new databaseModule();
        this.CheckSockets().then(() => {
            console.log("\x1b[34m%s\x1b[0m", "/-----------Socket server is ready-----------\\");
            }
        );
    }

    async middleWareConnection(socketClient, next)
    {
        const socketIp = '' + socketClient.handshake.address.split(":")[3];
        let logMsg = [];
        logMsg.push("Connection of socket " + socketClient.id + " from " + socketIp  + ".");
        logMsg.push("Check if User-IP exist and is blacklisted.");

        this.MyUserIp = await this.database.findOne("Users-IP", {ip: socketIp});
        if (this.MyUserIp && this.MyUserIp.blacklisted === true) {
            socketClient.disconnect();
            logMsg.push("User-IP : " + socketIp + " is blacklisted. Disconnecting.");
            await utils.addLog(this.database, socketClient, socketIp, logMsg, null);
            return;
        }
        else if (!this.MyUserIp){
            await this.database.insertOne("Users-IP", {
                ip: socketIp,
                isConnected: true,
                isAdmin: false,
                blacklisted: false,
                created_at: utils.getDateFormated()
            });
            logMsg.push("User-IP not exit, add new User-IP of " + socketIp + " to database.");
        }
        else if (this.MyUserIp && this.MyUserIp.blacklisted === false) {
            await this.database.updateOne("Users-IP", {ip: socketIp}, {$set: {isConnected: true}});
            logMsg.push("User-IP already exist, update isConnected to true.");
        }
        await this.database.insertOne("UsersClient-Socket", {
            _id: socketClient.id,
            username: "User-" + socketClient.id,
            ip: socketIp,
            channel: "general-room",
            canWrite: false,
            connected_at: utils.getDateFormated(),
        });
        logMsg.push("Add new UserClient-Socket : " + socketClient.id + " from ip : " + socketIp + " to database.");
        await utils.addLog(this.database, socketClient, socketIp,  logMsg, null);
        this.MyUserClient = (await this.database.findOne("UsersClient-Socket", {_id: socketClient.id}));

        next();
    }

    async middleWareServerMessage(SocketClient, messageModule, next)
    {
        this.SocketClientIp = '' + SocketClient.handshake.address.split(":")[3];
        this.SocketClient = SocketClient;
        this.MyUserClient = (await this.database.findOne("UsersClient-Socket", {_id: SocketClient.id}));
        this.MyUserIp = (await this.database.findOne("Users-IP", {ip: this.SocketClientIp}));
        if (this.MyUserIp.blacklisted === true) {
            await utils.addLog(this.database, this.SocketClient, this.SocketClientIp,
                "User-Ip vient d'être banni et tente d'envoyer un message. Il est donc deconnecté.", null);
            this.SocketClient.disconnect();
            return;
        }
        next();
    }

    async CheckSockets()
    {
        await this.database.connect();
        this.socketServer.use(async (socket, next) => {
            await this.middleWareConnection(socket, next);
        }).on('connection', async socketClient => {
            socketClient.join("general-room");
            await utils.sendHistory(this.database, this.socketServer, socketClient.id, "general-room");
            socketClient.use(async (messageModule, next) => {
                await this.middleWareServerMessage(socketClient, messageModule, next);
            }).on('server-message', data => {
                this.checkSocketMessage(socketClient, new messageModule(data))}
            );
            socketClient.on('disconnect', () => {this.checkSocketDisconnect(socketClient)});
        });
    }

    async checkSocketMessage(socketClient, msgModule)
    {
        await utils.addLog(this.database, socketClient, this.SocketClientIp,
            "Le serveur vient de recevoir un messageModule de " + socketClient.id + " (IP :" + this.SocketClientIp + ").", msgModule);
        if (msgModule.author) {
            new commandManagerModule(msgModule, socketClient, this.socketServer, this.database, this.MyUserIp, this.MyUserClient);
            if (commandManagerModule.trace.localeCompare("Command not found") === 0)
                await this.broadcastClient(msgModule, socketClient);
        }
    }

    async checkSocketDisconnect(socketClient)
    {
        this.SocketClientIp = '' + socketClient.handshake.address.split(":")[3];
        await this.database.deleteOne("UsersClient-Socket", {_id: socketClient.id});
        let logMsg = [];
        logMsg.push("Delete UserClient-Socket : " + socketClient.id + " from ip : " + this.SocketClientIp + " from database.");
        logMsg.push("Check if User-IP has client connected.");

        if ((await this.database.find("UsersClient-Socket", {ip: this.SocketClientIp})).length === 0) {
            await this.database.updateOne("Users-IP", {ip: this.SocketClientIp}, {$set: {isConnected: false}});
            logMsg.push("User-IP has no client connected, update isConnected to false.");
        }
        else
            logMsg.push("User-IP has client connected, do nothing.");
        await utils.addLog(this.database, socketClient, this.SocketClientIp, logMsg, null);
    }

    async broadcastClient(message, socketClient)
    {
        await this.database.insertOne("Messages", {
            _id: message.uuid,
            channelName: this.MyUserClient.channel,
            error: false,
            author: this.MyUserClient.username,
            message: [message.content],
            created_at: message.date
        });
        message.author = message.author + " " + this.MyUserClient.username;
        message.content = [message.content];
        this.socketServer.in(this.MyUserClient.channel).emit('client-message', [message]);
        await utils.addLog(this.database, socketClient, this.SocketClientIp, "Server broadcast message of " + socketClient.id +  " to channel " + this.MyUserClient.channel + ".", message);
    }
}

module.exports = SocketServer;
