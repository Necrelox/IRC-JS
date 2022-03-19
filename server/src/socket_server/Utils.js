const {v4: uuidv4} = require("uuid");
const messageModule = require("./transfert/message");

class Utils {

    static async verifStringContainAlphaAndNumberOnly(string)
    {
        return RegExp(/^[a-zA-Z0-9]+$/).test(string);
    }

    static async sendServerMessage(socketServer, channel, message, isError = false)
    {
        socketServer.in(channel).emit('client-message', [new messageModule({
            author: "$ System",
            error: isError,
            uuid: uuidv4(),
            content: [message],
            date: Utils.getDateFormated()
        })])
    }

    static async addMessageHistory(database, author, channel, message, isError = false)
    {
        await database.insertOne("Messages", {
            _id: uuidv4(),
            channelName: channel,
            author: author,
            message: [message],
            created_at: Utils.getDateFormated()
        });
    }

    static async addLog(database, socketClient, SocketIp, logMessage, data = null)
    {
        console.log("\x1b[93m%s\x1b[0m", "       /-----------Log added-----------\\");
        console.log("\x1b[32m%s\x1b[0m", logMessage);
        console.log("\x1b[93m%s\x1b[0m", "       \\-------------------------------/");
        await database.insertOne("Logs", {
            _id: '' + uuidv4(),
            log: logMessage,
            data: data,
            socket: socketClient.id,
            ip: SocketIp,
            date: Utils.getDateFormated()
        });
    }

    static getDateFormated()
    {
        return new Date().toLocaleString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        });
    }

    static async sendHistory(database, socketServer, socketClientId, channel)
    {
        let limitHistory = 5;
        let data = await database.findAndLimit(
            "Messages",
            {channelName: channel},
            limitHistory
        );
        limitHistory = data.length >= limitHistory ? limitHistory : data.length;
        let historyToSend = [];
        for(let i = limitHistory; i  > 0; --i)
            historyToSend.push(new messageModule({
                author: data[i-1].author + " " + data[i-1].author,
                error: data[i-1].error,
                uuid: data[i-1]._id,
                content: data[i-1].message,
                date: data[i-1].created_at,
            }));
        socketServer.in(socketClientId).emit("client-message", historyToSend);
    }
}

module.exports = Utils;
