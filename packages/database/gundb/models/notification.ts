import { v4 as uuid } from 'uuid';
import logger from '@chatpuppy/utils/logger';
import { gun } from "../initGundb";
import { UserDocument } from './user';

const Notification = {
    async get( token: string) {
        const notifications = [] as Array<NotificationDocument>
        gun.get("notifications").map().on(data => {
            if (data && data.token === token) {
                notifications.push(data)
            }
        })
        return notifications
    },

    async get_by_user( user: string) {
        const notifications = [] as Array<NotificationDocument>
        try {
            gun.get("notifications").map().on((data, key) => {
                if (data.user === user) {
                    notifications.push(data)
                }
            })
        }catch (e) {
        }



        return notifications
    },

}

export interface NotificationDocument extends Document {
    user: string;
    token: string;
}

export default Notification;