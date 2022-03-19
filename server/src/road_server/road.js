class road {
    constructor()
    {
        this.router = require("express").Router();
        this.InitRoad()
    }

    InitRoad()
    {
        this.router.get('/', (req, res) => {
            res.send('Hello World!');
        });
    }
}

module.exports = road;

