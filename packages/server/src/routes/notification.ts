import { AssertionError } from 'assert';
import User from '@chatpuppy/database/mongoose/models/user';
import Notification from '@chatpuppy/database/mongoose/models/notification';

export async function setNotificationToken(ctx: Context<{ token: string }>) {
    const { token } = ctx.data;

    const user = await User.findOne({ _id: ctx.socket.user });
    if (!user) {
        throw new AssertionError({ message: 'User not found' });
    }

    const notification = await Notification.findOne({ token: ctx.data.token });
    if (notification) {
        notification.user = user;
        await notification.save();
    } else {
        await Notification.create({
            user,
            token,
        });

        const existNotifications = await Notification.find({ user });
        if (existNotifications.length > 3) {
            await Notification.deleteOne({ _id: existNotifications[0]._id });
        }
    }

    return {
        isOK: true,
    };
}
