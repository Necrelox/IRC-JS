const messageModule = require("../transfert/message");
const { v4: uuidv4 } = require('uuid');
const utils = require("../Utils");

class CommandManager {
    static trace = "Command not found";

    constructor(msgModule, socketClient, socketServer, database, myUserIp, myUserClient)
    {
        this.database = database;
        this.socketClient = socketClient;
        this.socketServer = socketServer;
        this.socketClientIp = '' + this.socketClient.handshake.address.split(":")[3];
        this.MyUserIp = myUserIp;
        this.MyUserClient = myUserClient;
        this.msgModule = msgModule;
        this.parser();
    }

    parser()
    {
        const command = {
            nick: this.commandNick.bind(this),
            create: this.commandCreateChannel.bind(this),
            join: this.commandJoin.bind(this),
            quit: this.commandQuitChannel.bind(this),
            delete: this.commandDeleteChannel.bind(this),
            msg: this.commandMessagePrivate.bind(this),
            users: this.commandListUsers.bind(this),
            list: this.commandListChannel.bind(this),
            ban: this.commandBan.bind(this),
            deban: this.commandDeban.bind(this),
            macrex: this.commandMacrex.bind(this),
        };
        let message = this.msgModule.content;
        if (message.charAt(0) === '/') {
            message = message.substring(1);
            const who = message.split(" ");
            if (command[who[0]]) {
                command[who[0]]();
                CommandManager.trace = "Command found";
                return;
            }
        }
        CommandManager.trace = "Command not found";
    }

    async commandNick()
    {
        let logMsg = [];
        logMsg.push("Commande " + this.msgModule.content);
        let newNick;

        if ((this.msgModule.content.split(" ")).length === 2) {
            newNick = this.msgModule.content.split(" ")[1];
            if (await utils.verifStringContainAlphaAndNumberOnly(newNick)) {
                if ((await this.database.find("UsersClient-Socket", {username: newNick})).length > 0) {
                    logMsg.push("Erreur : pseudo déjà utilisé");
                    await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : pseudo déjà utilisé.", true);
                } else {
                    logMsg.push("Nouveau pseudo : " + newNick);
                    await this.database.updateOne("UsersClient-Socket", {_id: this.socketClient.id}, {$set: {username: newNick}});
                    await utils.sendServerMessage(this.socketServer, this.MyUserClient.channel, this.MyUserClient.username + " change de pseudo en " + newNick + ".");
                }
            } else {
                logMsg.push("Erreur : le nom d'utilisateur doit contenir uniquement des lettres et des chiffres");
                await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : le nom d'utilisateur doit contenir uniquement des lettres et des chiffres.", true);
            }
        } else if ((this.msgModule.content.split(" ")).length === 1) {
            logMsg.push("Erreur : pas d'argument.");
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : pas d'argument.", true);

        } else if ((this.msgModule.content.split(" ")).length > 2) {
            logMsg.push("Erreur : trop d'arguments.");
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : trop d'arguments.", true);
        }
        await utils.addLog(this.database, this.socketClient, this.socketClientIp, logMsg, null);
        await utils.addMessageHistory(this.database, "$ System", this.MyUserClient.channel, this.MyUserClient.username + " change de pseudo en " + newNick + ".")
    }

    async commandCreateChannel()
    {
        await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Commande " + this.msgModule.content, null);

        if (this.msgModule.content.split(" ").length === 2) {
            const channelName = this.msgModule.content.split(" ")[1];
            if (await utils.verifStringContainAlphaAndNumberOnly(channelName)) {
                if (!(await this.database.findOne("Channels", {name: channelName}))) {
                    await this.database.insertOne("Channels",{
                        _id: uuidv4(),
                        name: channelName,
                        users: [],
                        date: utils.getDateFormated(),
                    });
                    await utils.sendServerMessage(this.socketServer, this.MyUserClient.channel, "Le channel " + channelName + " a été créé.");
                    await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Ajout du channel.", null);
                    await utils.addMessageHistory(this.database, "$ System", this.MyUserClient.channel, "Le channel " + channelName + " a été créé.");

                } else {
                    await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : channel existant.", null);
                    await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : channel déjà existant.");
                }
                return;
            }
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : " + channelName + " est un nom invalid.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : " + channelName + " est un nom invalid.", true);

        } else if (this.msgModule.content.split(" ").length === 1) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : pas d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : pas d'argumet.", true);

        } else {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : trop d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : trop d'argumet.", true);
        }
    }

    async commandJoin()
    {

        if (this.msgModule.content.split(" ").length === 2) {
            const room = this.msgModule.content.split(" ")[1];
            if (await utils.verifStringContainAlphaAndNumberOnly(room)) {
                if (await this.database.findOne("Channels", {name: room}) != null) {
                    this.socketClient.leave(this.MyUserClient.channel);
                    this.socketClient.join(room);
                    await this.database.updateOne("UsersClient-Socket", {_id: this.socketClient.id}, {$set: {channel: room}});
                    await utils.addLog(this.database, this.socketClient, this.socketClientIp, this.MyUserClient.channel, this.MyUserClient.username + " vient de rejoindre le channel: ", null);
                    await utils.addMessageHistory(this.database, "$ System", room, this.MyUserClient.username + " vient de rejoindre le channel : " + room);
                    await utils.sendHistory(this.database, this.socketServer, this.socketClient.id, room);
                    await utils.sendServerMessage(this.socketServer, this.socketClient.id, this.MyUserClient.username + " vient de rejoindre le channel : " + room);

                }
                else {
                    await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : channel inexistant.", null);
                    await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : channel inexistant.", true);
                }
            } else {
                await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : " + room + " est un nom invalid.", null);
                await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : " + room + " est un nom invalid.", true);
            }
        }
        else if (this.msgModule.content.split(" ").length === 1) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : pas d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : pas d'argumet.", true);

        } else {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : trop d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : trop d'argumet.", true);
        }

    }


    async commandQuitChannel()
    {
        if (this.msgModule.content.split(" ").length === 2) {
            let channelName = this.msgModule.content.split(" ")[1];
            if (this.MyUserClient.channel === channelName && channelName !== "general-room"){
                await utils.addLog(this.database, this.socketClient, this.socketClientIp, this.MyUserClient.username +  " quitte le channel : " +  channelName, null);
                await utils.sendServerMessage(this.socketServer, this.MyUserClient.channel, this.MyUserClient.username + " quitte le channel : " +  channelName);
                await utils.addMessageHistory(this.database, "$ System", this.MyUserClient.channel, this.MyUserClient.username + " quitte le channel : " +  channelName);
                this.socketClient.leave(this.MyUserClient.channel);

                this.socketClient.join("general-room");
                await this.database.updateOne("UsersClient-Socket", {_id: this.socketClient.id}, {$set: {channel: "general-room"}});

                await utils.addLog(this.database, this.socketClient, this.socketClientIp, this.MyUserClient.channel, this.socketClient.username + " vient de rejoindre le channel: " + "general-room", null);
                await utils.addMessageHistory(this.database, "$ System", "general-room", this.MyUserClient.username + " vient de rejoindre le channel : " + "general-room");
                await utils.sendHistory(this.database, this.socketServer, this.socketClient.id, "general-room");
                await utils.sendServerMessage(this.socketServer, this.socketClient.id, this.MyUserClient.username + " vient de rejoindre le channel : " + "general-room");
            }
            else {
                await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Vous n'êtes pas dans " + channelName + ", vous ne pouvez pas " +
                    "quitter ce channel. #TESUNPEUCON", null);
                await utils.sendServerMessage(this.socketServer, this.MyUserClient.channel, "Vous n'êtes pas dans " + channelName + ", vous ne pouvez pas " +
                "quitter ce channel. #TESUNPEUCON", true);
            }
        } else if (this.msgModule.content.split(" ").length === 1) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : pas d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : pas d'argumet.", true);
        }  else if (this.msgModule.content.split(" ").length > 2) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : trop d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : trop d'argumet.", true);
        }
    }

    async commandDeleteChannel()
    {
        if (this.msgModule.content.split(" ").length === 2) {
            let channelQuery = this.msgModule.content.split(" ")[1];
            const channel = await this.database.findOne("Channels", {name: channelQuery});
            if (channel) {
                const queryUserAwait = await this.database.find("UsersClient-Socket", {channel: channelQuery});
                if (queryUserAwait != null) {
                    for (let i = 0; queryUserAwait[i]; ++i) {
                        await this.database.updateOne("UsersClient-Socket", {_id: queryUserAwait[i]._id}, {$set: {channel: "general-room"}});
                        await utils.addLog(this.database, this.socketServer.sockets.sockets.get(queryUserAwait[i]._id), this.socketClientIp, queryUserAwait[i].username +  " quitte le channel : " +  queryUserAwait[i].channel, null);
                        await utils.sendServerMessage(this.socketServer, this.MyUserClient.channel, queryUserAwait[i].username + " quitte le channel : " +  queryUserAwait[i].channel);
                        await utils.addMessageHistory(this.database, "$ System", queryUserAwait[i].channel, queryUserAwait[i].username + " quitte le channel : " +  queryUserAwait[i].channel);


                        this.socketServer.sockets.sockets.get(queryUserAwait[i]._id).leave(channelQuery);
                        this.socketServer.sockets.sockets.get(queryUserAwait[i]._id).join(channelQuery);


                        await utils.addLog(this.database, this.socketClient, this.socketServer.sockets.sockets.get(queryUserAwait[i]._id), this.MyUserClient.channel, queryUserAwait[i].username + " vient de rejoindre le channel: " + "general-room", null);
                        await utils.addMessageHistory(this.database, "$ System", "general-room", queryUserAwait[i].username + " vient de rejoindre le channel : " + "general-room");
                        await utils.sendHistory(this.database, this.socketServer, this.socketClient.id, "general-room");
                        await utils.sendServerMessage(this.socketServer, this.socketClient.id, queryUserAwait[i].username + " vient de rejoindre le channel : " + "general-room");
                    }
                }
                await this.database.deleteOne("Channels", {name: channelQuery});
            }
        }
        else if (this.msgModule.content.split(" ").length === 1) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : pas d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : pas d'argumet.", true);
        } else if (this.msgModule.content.split(" ").length > 2) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Erreur : trop d'argumet.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Erreur : trop d'argumet.", true);
        }
    }

    async commandMessagePrivate() {
        let message = this.msgModule.content.split(" ");
        if (message.length != 3) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Merci d'ecrire une message comme ceci : /msg [destinataire] [message] !!", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Merci d'ecrire une message comme ceci : /msg [destinataire] [message] !!", true);
            return;
        }
        const queryFindUser = await this.database.findOne("UsersClient-Socket", {'username': message[1]});
        if (queryFindUser) {
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Vous venez d'envoyer : " + message[2] + " à " + message[1] + " !!", true);
            await utils.sendServerMessage(this.socketServer, queryFindUser._id, "Vous venez de recevoir : " + message[2] + " de " + this.MyUserClient.username + " !!",);

        }
        else {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Destinataire introuvable !!", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Destinataire introuvable !!", true);
        }
    }

    async commandListUsers()
    {
        const queryFindUser = await this.database.find("UsersClient-Socket", {channel: this.MyUserClient.channel});
        if (queryFindUser.length > 0) {
            let listUsers = [];
            for (let i = 0; queryFindUser[i]; ++i) {
                listUsers.push(queryFindUser[i].username + " ");
            }
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Liste des utilisateurs : " + listUsers, null);

            this.socketServer.in(this.socketClient.id).emit('client-message', [new messageModule({
                author: "$ System",
                error: false,
                uuid: uuidv4(),
                content: listUsers,
                date: utils.getDateFormated()
            })])
        }
    }

    async commandListChannel() {
        let message = this.msgModule.content.split(" ");
        const queryChannel = await this.database.find("Channels");

        if (queryChannel == null || queryChannel.length < 1) {
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Aucun channel actuellement disponible !!", true);
            return;
        }
        if (message.length == 1) {
            let ChannelUserList = ["Les channels actuellement disponible sont : "];

            for(let i = 0; queryChannel[i] ; ++i)
                ChannelUserList.push(queryChannel[i].name + " ");

            this.socketServer.in(this.socketClient.id).emit('client-message', [new messageModule({
                author: "$ System",
                error: false,
                uuid: uuidv4(),
                content: ChannelUserList,
                date: utils.getDateFormated()
            })])
        }
        else if (message.length == 2) {
            let ChannelUserList = ["Les channels actuellement disponible contenant le mot : " + message[1] +" sont : "];
            let tmp = 0;
            for(let i = 0; queryChannel[i] ;i++)
                if (queryChannel[i].name.includes(message[1])) {
                    ChannelUserList.push(queryChannel[i].name + " ")
                    tmp++
                }
            if (tmp == 0) {
                await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Aucun channel actuellement disponible !!", true);
                return;
            }
            this.socketServer.in(this.socketClient.id).emit('client-message', [new messageModule({
                author: "$ System",
                error: false,
                uuid: uuidv4(),
                content: ChannelUserList,
                date: utils.getDateFormated()
            })])
        }
    }


    async commandDeban()
    {
        const Targetip = this.msgModule.content.split(" ")[1];

        await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Commande /deban of " + Targetip + ".", null);

        if (this.MyUserIp.isAdmin === false) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, this.socketClientIp + " a essayé de débannir un utilisateur, mais il n'a pas les droits.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Vous n'êtes pas un administrateur.", true);
            return;
        }
        await utils.addMessageHistory(this.database, "$ System", this.MyUserClient.channel, "(IP: " + Targetip + ") a été debanni.");
        await utils.sendServerMessage(this.socketServer, this.MyUserClient.channel, "(IP: " + Targetip + ") a été debanni.");
        await this.database.updateOne("Users-IP", {ip: Targetip}, {$set: {blacklisted: false}});
    }

    async commandBan()
    {
        const username = this.msgModule.content.split(" ")[1];
        const TargetUserClient = (await this.database.findOne("UsersClient-Socket", {username: username}));
        if (TargetUserClient == null)
            return;
        const TargetUserIP = TargetUserClient.ip;
        await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Commande /ban of " + username + "(IP: " +  TargetUserIP + ").", null);

        if (this.MyUserIp.isAdmin === false) {
            await utils.addLog(this.database, this.socketClient, this.socketClientIp, this.socketClientIp + " a essayé de bannir un utilisateur, mais il n'a pas les droits.", null);
            await utils.sendServerMessage(this.socketServer, this.socketClient.id, "Vous n'êtes pas un administrateur.", true);
            return;
        }

        let channel = TargetUserClient.channel;
        await utils.addMessageHistory(this.database, "$ System", channel, username + " (IP: " + TargetUserIP + ") a été banni. CHEH !");
        await utils.sendServerMessage(this.socketServer, channel, username + " (IP: " + TargetUserIP + ") a été banni. CHEH !");
        await this.database.updateOne("Users-IP", {ip: TargetUserIP}, {$set: {blacklisted: true}});
    }



    async commandMacrex()
    {
        const data = require('fs').readFileSync("/home/ruby/Documents/macrex", "utf8")
        await utils.addLog(this.database, this.socketClient, this.socketClientIp, "Commande /macrex.", null);
        await utils.addMessageHistory(this.database, "$ System", this.MyUserClient.channel, data);
        await utils.sendServerMessage(this.socketServer, this.MyUserClient.channel, data);
    }


}

module.exports = CommandManager;
