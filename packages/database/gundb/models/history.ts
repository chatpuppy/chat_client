import { v4 as uuid } from 'uuid';
import logger from '@chatpuppy/utils/logger';
import { gun } from "../initGundb";

const History = {
    async getOne(user: string, linkman: string) {
        let history = {} as HistoryDocument
        gun.get("histories").map().on((data, key) => {
            if (data.userId === user && data.linkman === linkman) {
                history = data
            }
        })
        return history
    },

    async save(history: HistoryDocument) {
        gun.get("histories").get(history.uuid).put(history)
        return history
    },

    // eslint-disable-next-line no-shadow
    async getLinkMans(uuid: string, linkmans: Array<string>) {
        const histories = [] as Array<HistoryDocument>
        await gun.get("histories").map().on((data, key) => {
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
