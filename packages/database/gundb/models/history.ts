import { v4 as uuid } from 'uuid';
import logger from '@chatpuppy/utils/logger';
import { gun } from "../initGundb";

const History = {
    async getOne(user: string, linkman: string) {
        let new_history = {} as HistoryDocument
        gun.get("histories").map(
            async history => {
                if (history){
                    if (history.userId === user && history.linkman === linkman) {
                        new_history = history
                    }
                }
            })
        // ).on((data, key) => {
        //     if (data.userId === user && data.linkman === linkman) {
        //         history = data
        //     }
        // })
        return new_history
    },

    async save(history: HistoryDocument, uuid: string = '') {
        if (uuid == ''){
            gun.get("histories").get(history.uuid).put(history)
        }else {
            // @ts-ignore
            gun.get("histories").get(history.uuid).get('message').put(history.message)
        }
        return history
    },

    // eslint-disable-next-line no-shadow
    async getLinkMans(uuid: string, linkmans: Array<string>) {
        const histories = [] as Array<HistoryDocument>
        await gun.get("histories").map().on( async (data, key) => {
            if (data.user === uuid && linkmans.filter(linkman => data.linkman === linkman).length > 0) {
                histories.push(data)
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
    const history = await History.getOne(userId, linkmanId);
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