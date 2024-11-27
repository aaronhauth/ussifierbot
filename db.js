import {PrismaClient} from '@prisma/client';
import * as pg from 'pg';
const Pool = pg.default.Pool;

const prisma = new PrismaClient();
export class dbClient {
    pgClient = null;
    constructor() {
        this.pgClient = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false
            }
          });
    }

    async queryTables() {
        try {
          const res = await this.pgClient.query('SELECT table_schema,table_name FROM information_schema.tables;');
          for (let row of res.rows) {
            console.log(JSON.stringify(row));
          }
        } catch (err) {
          throw err;
        } 
    }

    async insertChannel(channelName) {
      try {
        await prisma.channellist.create({
          data: {
            username: channelName
          }
        })
      } catch (err) {
        throw err;
      }
    }

    async getAllChannels() {
      try {
        const channels = await prisma.channellist.findMany();
        return channels;
      } catch (err) {
        throw err;
      }
    }

    async getChannel(channelName) {
      try {
        return await prisma.channellist.findFirst({
          where: {
            username: channelName
          }
        })
      } catch (err) {
        throw err;
      }
    }

    async deleteChannel(channelName) {
      try {
        await prisma.channellist.delete({
          where: {
            username: channelName
          }
        });
        return;
      } catch (err) {
        throw err;
      }
    }

    async setMessageFrequency(channelName, messageFrequency) {
      try {
        await prisma.channellist.update({
          data: {
            messagefrequency: messageFrequency
          },
          where: {
            username: channelName
          }
        });
        return;
      } catch (err) {
        throw err;
      }
    }

    async setWordFrequency(channelName, wordFrequency) {
      try {
        return await prisma.channellist.update({
          data: {
            wordfrequency: wordFrequency
          },
          where: {
            username: channelName
          }
        })
      } catch (err) {
        throw err;
      }
    }

    async updateIgnoreList(channelName, ignoreList) {
      try {
        await prisma.channellist.update({
          data: {
            ignorelist: ignoreList
          },
          where: {
            username: channelName
          }
        })
        return;
      } catch(err) {
        throw err;
      }
    }
}