const ioModule = require("socket.io-client");

const socketModule = ioModule('http://192.168.1.13:3001', {
    path: '/irc',
    transports : ['websocket'],
    reconnectionDelay: 1000,
    reconnectionDelayMax : 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
});

class SocketClient {
    constructor() {
        console.log('SocketClient constructor');
        this.socket = socketModule;
        this.ReadSocketConnect()
        this.ReadSocketMessage()
    }

    getId() {
        return this.socket.id;
    }

    static Messages = [];

    ReadSocketConnect() {
        this.socket.on('connect', function () {
            console.log('connected');
        });
    }

    ReadSocketMessage() {
        this.socket.on('client-message', function (data) {
            // console.log('message reçus : ', data);
            SocketClient.Messages = [];
            for (let i = 0; i < data.length; i++)
                SocketClient.Messages.push(data[i]);
            // console.log('SocketClient.Messages : ', SocketClient.Messages);

        });

    }

    sendMessage(message) {
        console.log("id : " + this.socket.id);
        this.socket.emit('server-message', message);
        console.log('sendMessage : ', message);
    }
}

export default SocketClient;
