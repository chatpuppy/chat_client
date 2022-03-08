import { AssertionError } from 'assert';
import User from '@chatpuppy/database/gundb/models/user';
import Notification from '@chatpuppy/database/gundb/models/notification';


export async function setNotificationToken(ctx: Context<{ token: string }>) {
    const { token } = ctx.data;
    const user = await User.get_one(ctx.socket.user)

    if (Object.keys(user).length == 0) {
        throw new AssertionError({ message: 'User not found' });
    }

    // const notification = await Notification.get()
    return {}
}
