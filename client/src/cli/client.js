import './Client.css';
import React, {Component} from "react";
import SocketClient from "../socket/SocketClient";
import Message from "./Message";
import Bubble from "../View/bubble";

class Client extends Component {
    constructor(props) {
        super(props);
        this.SocketClient = new SocketClient();
        this.state = {
            listMsg: [{}],
            interval: 100
        };
        this.scrolled = false;
    }

    componentDidMount() {
        this.interval = setInterval(this.tick, this.state.interval);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.delay !== this.state.delay) {
            clearInterval(this.interval);
            this.interval = setInterval(this.tick, this.state.delay);
        }
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    tick = () => {
        if (SocketClient.Messages.length > 0) {
            this.setState({
                listMsg: this.state.listMsg.concat(SocketClient.Messages)
            });
            SocketClient.Messages = [];
        }
    };

    handleFormSubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.target);

        if ((data.get('message')).length > 0) {
            this.SocketClient.sendMessage(
                new Message(
                    data.get('message'),
                    this.SocketClient.getId()
                )
            );
        }
        event.target.reset();
    };

    scrollDown(){
        window.scroll(0,document.body.scrollHeight);
    }

    render() {
        return (
            <div className="Client">
                <header className="Client-header">
                    <div className="container">
                        <div className="displayMsg" id="msgs">
                        {

                            this.state.listMsg.map((obj, index) => {
                                if (obj && obj.uuid) {
                                    window.setTimeout(this.scrollDown, 1);
                                    console.log(obj);
                                    if (('' + this.SocketClient.getId()) === (obj.author.split(' ')[0])) {
                                        let otherMsg = {otherMsg: "bubble"};
                                        let merged = {...obj, ...otherMsg};
                                        return <li className={"lineMsg"} key={index}> <div className={"MyMsg"}><Bubble messageModule={merged}/> </div></li>
                                    }
                                    else {
                                        let otherMsg = {otherMsg: "bubble2"};
                                        let merged = {...obj, ...otherMsg};
                                        return <li className={"lineMsg"} key={index}> <div className={"OtherMsg"}><Bubble messageModule={merged}/> </div></li>
                                    }
                                }
                            })
                        }
                    </div>
                        <form className="client-emit-form" onSubmit={this.handleFormSubmit}>
                        <input autoComplete="off" type="text" name="message" placeholder="Message"/>
                        <input type="submit" value="Send"/>
                    </form>
                    </div>
                </header>
            </div>
        );
    }
}

export default Client;
