import React, {Component} from "react";
import 'animate.css';

import './bubble.css';
import moment from "moment";

class Bubble extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messageModule: props.messageModule,
            who: props.messageModule.otherMsg
        }

        console.log(this.state.who);
    }

    render() {
        return (
            <div className={this.state.who + " animate__animated animate__flipInX"}>
                <div className="bubble-header">
                    <div className="bubble-title-author">
                        <p className={"title-author"}>{this.state.messageModule.author.split(' ')[1]} :</p>
                    </div>

                </div>
                <div className="bubble-content">
                    {
                        this.state.messageModule.content.map((item, index) => {
                            return (
                                <p key={index}>{item}</p>
                            )
                        })
                    }
                </div>

                <div className="bubble-footer">
                    <div className="bubble-footer-date">
                        {moment(this.state.messageModule.date).format('lll')}
                    </div>
                </div>
            </div>
        );
    }
}

export default Bubble;
