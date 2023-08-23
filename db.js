import * as pg from 'pg';
const Pool = pg.default.Pool;

export class dbClient {
    pgClient = null;
    constructor() {
        console.log(`constructor with ${process.env.DATABASE_URL}`)
        this.pgClient = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false
            }
          });
    }

    async queryTables() {
        console.log("querying tables?");
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
        await this.pgClient.query('INSERT INTO channellist(username) VALUES($1);', [channelName]);
        console.log('added!');
      } catch (err) {
        throw err;
      }
    }

    async getAllChannels() {
      try {
        const {rows} = await this.pgClient.query('SELECT * FROM channellist;');
        return rows;
      } catch (err) {
        throw err;
      }
    }

    async getChannel(channelName) {
      try {
        const {rows} = await this.pgClient.query('SELECT * FROM channellist where username = $1;', [channelName]);
        return rows;
      } catch (err) {
        throw err;
      }
    }

    async deleteChannel(channelName) {
      try {
        await this.pgClient.query('DELETE FROM channellist where username = $1;', [channelName]);
        return;
      } catch (err) {
        throw err;
      }
    }

    async setMessageFrequency(channelName, messageFrequency) {
      try {
        await this.pgClient.query('UPDATE channellist SET messagefrequency = $1 where username = $2;', [messageFrequency, channelName]);
        return;
      } catch (err) {
        throw err;
      }
    }

    async setWordFrequency(channelName, wordFrequency) {
      try {
        await this.pgClient.query('UPDATE channellist SET wordfrequency = $1 where username = $2;', [wordFrequency, channelName]);
        return;
      } catch (err) {
        throw err;
      }
    }

    async getUserInIgnoreList(channelName, userName) {
      try {
        const {rows} = await this.pgClient.query('select * from channellist where username = $2 AND $1 = ANY(ignorelist)', [userName, channelName])
        return rows;
      } catch(err) {
        throw err;
      }
    }

    async addUserToIgnoreList(channelName, userName) {
      try {
        await this.pgClient.query('update channellist set ignorelist = array_append(ignorelist, $1) where username = $2;', [userName, channelName])
        return;
      } catch(err) {
        throw err;
      }
    }

    async removeUserFromIgnoreList(channelName, userName) {
      try {
        await this.pgClient.query('update channellist set ignorelist = array_remove(ignorelist, $1) where username = $2;', [userName, channelName])
        return;
      } catch(err) {
        throw err;
      }
    }
}