class Message {
    constructor(data) {
        this.author = data.author;
        this.error = data.error;
        this.uuid = data.uuid;
        this.content = data.content;
        this.date = data.date;
    }
}

module.exports = Message;
