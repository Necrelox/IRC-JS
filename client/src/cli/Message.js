import {v4 as uuidv4} from 'uuid';

class Message {
  constructor(data, auth) {
    this.author = auth;
    this.error = false;
    this.uuid = uuidv4();
    this.content = data;
    this.date = new Date();
  }
}

export default Message;
