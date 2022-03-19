const {v4: uuidv4} = require("uuid");
const utils = require("../socket_server/Utils");
const mongoClient = require("mongodb").MongoClient;
require("dotenv").config();

class MongoDB {
    constructor()
    {
        this.url = process.env.CLUSTER_URL;
        this.dbName = process.env.DB_NAME;
    }

    async connect() {
        try {
            let start = new Date();
            console.log("\x1b[33m", "Connecting to MongoDB...");
            this.client = await mongoClient.connect(this.url);
            this.db = this.client.db(this.dbName);
            let end = new Date();
            console.log("\x1b[32m", "Connected to MongoDB in", end - start, "ms");
        } catch (error) {
            console.log(error);
            process.exit(1);
        }
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
            date: utils.getDateFormated()
        });
    }

    async getCollection(collectionName) {
        try {
            return await this.db.collection(collectionName);
        } catch (error) {
            console.log(error);
        }
    }

    async insertOne(collectionName, data) {
        try {
            return await this.db.collection(collectionName).insertOne(data);
        } catch (error) {
            console.log(error);
        }
    }

    async insertMany(collectionName, data) {
        try {
            return await this.db.collection(collectionName).insertMany(data);
        } catch (error) {
            console.log(error);
        }
    }

    async find(collectionName, query) {
        try {
            return await this.db.collection(collectionName).find(query).toArray();
        } catch (error) {
            console.log(error);
        }
    }

    async findOne(collectionName, query) {
        try {
            return await this.db.collection(collectionName).findOne(query);
        } catch (error) {
            console.log(error);
        }
    }

    async findAndLimit(collectionName, query, skipCount) {
        try {
            return await this.db.collection(collectionName).find(query).sort({ $natural: -1 }).limit(skipCount).toArray();
        } catch (error) {
            console.log(error);
        }
    }

    async updateOne(collectionName, query, data) {
        try {
            return await this.db.collection(collectionName).updateOne(query, data);
        } catch (error) {
            console.log(error);
        }
    }

    async updateMany(collectionName, query, data) {
        try {
            return await this.db.collection(collectionName).updateMany(query, data);
        } catch (error) {
            console.log(error);
        }
    }

    async deleteOne(collectionName, query) {
        try {
            return await this.db.collection(collectionName).deleteOne(query);
        } catch (error) {
            console.log(error);
        }
    }

    async deleteMany(collectionName, query) {
        try {
            return await this.db.collection(collectionName).deleteMany(query);
        } catch (error) {
            console.log(error);
        }
    }

}

module.exports = MongoDB;
