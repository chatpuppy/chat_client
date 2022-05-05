import { v4 as uuid } from 'uuid';
import logger from '@chatpuppy/utils/logger';
import { gun } from "../initGundb";

var history_gun = gun.get("histories")
const History = {
    async getOne(user: string, linkman: string) {
        let new_history = {} as HistoryDocument
        var match = {
            // lexical queries are kind of like a limited RegEx or Glob.
            '.': {
              // property selector
              '>': new Date(+new Date() - 1 * 1000 * 60 * 60 * 24).toISOString(), // find any indexed property larger ~3 hours ago
            //   '<': ''
            },
            // '-': 1, // filter in reverse
          };
        // @ts-ignore
        history_gun.get(match).map(
        ).once((data, key) => {
            if (data) {
                if (data.userId === user && data.linkman === linkman) {
                    new_history = data as HistoryDocument
                }
            }
        })
        return new_history
    },

    async save(history: HistoryDocument, uuid: string = '') {
        const index = new Date().toISOString()
        if (uuid == ''){
            history_gun.get(index).put(history)
        }else {
            // @ts-ignore
            history_gun.get(index).get('message').put(history.message)
        }
        return history
    },

    // eslint-disable-next-line no-shadow
    async getLinkMans(uuid: string, linkmans: Array<string>) {
        const histories = [] as Array<HistoryDocument>
        var match = {
            // lexical queries are kind of like a limited RegEx or Glob.
            '.': {
              // property selector
              '>': new Date(+new Date() - 1 * 1000 * 60 * 60 * 24).toISOString(), // find any indexed property larger ~3 hours ago
            //   '<': ''
            },
            // '-': 1, // filter in reverse
          };
        // @ts-ignore
        history_gun.get(match).map().once( async (data, key) => {
            if(data){
                if (data.user === uuid && linkmans.filter(linkman => data.linkman === linkman).length > 0) {
                    histories.push(data as HistoryDocument)
                }
            }
            
        })
        return histories
    }
}

export interface HistoryDocument extends Document {
    uuid: string;
    /** user id */
    user: string;

    /** linkman id */
    linkman: string;

    /** last readed message id */
    message: string;
}

export default History;

export async function createOrUpdateHistory(
    userId: string,
    linkmanId: string,
    messageId: string,
) {
    // const history = await History.getOne( userId, linkmanId);
    // if (history) {
    //     history.message = messageId;
    //     await history.save();
    // } else {
    //     await History.create({
    //         user: userId,
    //         linkman: linkmanId,
    //         message: messageId,
    //     });
    let history = await History.getOne(userId, linkmanId);
    if (Object.keys(history).length > 0) {
        history.message = messageId;
        await History.save(history)
    } else {
        await History.save({
            uuid: uuid(),
            user: userId,
            linkman: linkmanId,
            message: messageId
        } as HistoryDocument)
    }

    return {};
}

function delay(ms: number) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
}