import bcrypt from 'bcryptjs';
import assert, { AssertionError } from 'assert';
import jwt from 'jwt-simple';
import { Types } from '@chatpuppy/database/mongoose';

import config from '@chatpuppy/config/server';
import getRandomAvatar from '@chatpuppy/utils/getRandomAvatar';
import { SALT_ROUNDS } from '@chatpuppy/utils/const';
import User, { UserDocument } from '@chatpuppy/database/mongoose/models/user';
import Group, { GroupDocument } from '@chatpuppy/database/mongoose/models/group';
import Friend, { FriendDocument } from '@chatpuppy/database/mongoose/models/friend';
import Socket from '@chatpuppy/database/mongoose/models/socket';
import Message, {
    handleInviteV2Messages,
} from '@chatpuppy/database/mongoose/models/message';
import Notification from '@chatpuppy/database/mongoose/models/notification';
import {
    getNewRegisteredUserIpKey,
    getNewUserKey,
    Redis,
} from '@chatpuppy/database/redis/initRedis';

const { isValid } = Types.ObjectId;

/** a day */
const OneDay = 1000 * 60 * 60 * 24;

interface Environment {
    os: string;
    browser: string;
    environment: string;
}

/**
 * generate jwt token
 * @param user 
 * @param environment 
 */
function generateToken(user: string, environment: string) {
    return jwt.encode(
        {
            user,
            environment,
            expires: Date.now() + config.tokenExpiresTime,
        },
        config.jwtSecret,
    );
}

/**
 * Handle new user(less than 24hours)
 * @param user 
 */
async function handleNewUser(user: UserDocument, ip = '') {
    // Add user into new user list, delete 24 hours later
    if (Date.now() - user.createTime.getTime() < OneDay) {
        const userId = user._id.toString();
        await Redis.set(getNewUserKey(userId), userId, Redis.Day);

        if (ip) {
            const registeredCount = await Redis.get(
                getNewRegisteredUserIpKey(ip),
            );
            await Redis.set(
                getNewRegisteredUserIpKey(ip),
                (parseInt(registeredCount || '0', 10) + 1).toString(),
                Redis.Day,
            );
        }
    }
}

async function getUserNotificationTokens(user: UserDocument) {
    const notifications = (await Notification.find({ user })) || [];
    return notifications.map(({ token }) => token);
}

/**
 * Register
 * @param ctx Context
 */
export async function register(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    assert(!config.disableRegister, 'Register disabled, contact administrator');

    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Username can not be empty');
    assert(password, 'Password can not be empty');

    const user = await User.findOne({ username });
    assert(!user, 'This username is exist');

    const registeredCountWithin24Hours = await Redis.get(
        getNewRegisteredUserIpKey(ctx.socket.ip),
    );
    assert(parseInt(registeredCountWithin24Hours || '0', 10) < 100, 
        'In 24 hours, only 100 new users are allowd to register');

    const defaultGroup = await Group.findOne({ isDefault: true });
    if (!defaultGroup) {
        // TODO: refactor when node types support "Assertion Functions" https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
        throw new AssertionError({ message: 'Default group is not exist' });
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);

    let newUser = null;
    try {
        newUser = await User.create({
            username,
            salt,
            password: hash,
            avatar: getRandomAvatar(),
            lastLoginIp: ctx.socket.ip,
        } as UserDocument);
    } catch (err) {
        if ((err as Error).name === 'ValidationError') {
            return 'Username format is wrong';
        }
        throw err;
    }

    await handleNewUser(newUser, ctx.socket.ip);

    if (!defaultGroup.creator) {
        defaultGroup.creator = newUser._id;
    }
    defaultGroup.members.push(newUser._id);
    await defaultGroup.save();

    const token = generateToken(newUser._id.toString(), environment);

    ctx.socket.user = newUser._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: newUser._id,
            os,
            browser,
            environment,
        },
    );

    return {
        _id: newUser._id,
        avatar: newUser.avatar,
        username: newUser.username,
        groups: [
            {
                _id: defaultGroup._id,
                name: defaultGroup.name,
                avatar: defaultGroup.avatar,
                creator: defaultGroup.creator,
                createTime: defaultGroup.createTime,
                messages: [],
            },
        ],
        friends: [],
        token,
        isAdmin: false,
        notificationTokens: [],
    };
}

/**
 * @param ctx Context
 */
export async function login(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Username can not be empty');
    assert(password, 'Password can not be empty');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'User not exist' });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    console.log(`[login] ${username} ${user._id.toString()}`);

    assert(isPasswordCorrect, `Wrong password!`);
    
    await handleNewUser(user);

    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;
    await user.save();

    const groups = await Group.find(
        { members: user._id },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    const token = generateToken(user._id.toString(), environment);

    ctx.socket.user = user._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    const notificationTokens = await getUserNotificationTokens(user);
    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        token,
        isAdmin: config.administrator.includes(user._id.toString()),
        notificationTokens,
    };
}

/**
 * @param ctx Context
 */
export async function loginByToken(
    ctx: Context<{ token: string } & Environment>,
) {
    const { token, os, browser, environment } = ctx.data;
    assert(token, 'token can not be empty');

    let payload = null;
    try {
        payload = jwt.decode(token, config.jwtSecret);
    } catch (err) {
        return 'Inavailable token';
    }

    assert(Date.now() < payload.expires, 'token timeout');
    assert.equal(environment, payload.environment, 'Illegal login');

    const user = await User.findOne(
        { _id: payload.user },
        {
            _id: 1,
            avatar: 1,
            username: 1,
            tag: 1,
            createTime: 1,
        },
    );
    if (!user) {
        throw new AssertionError({ message: 'User not exist' });
    }

    await handleNewUser(user);

    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;
    await user.save();

    const groups = await Group.find(
        { members: user._id },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group: GroupDocument) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    ctx.socket.user = user._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    const notificationTokens = await getUserNotificationTokens(user);

    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        isAdmin: config.administrator.includes(user._id.toString()),
        notificationTokens,
    };
}

/**
 * @param ctx Context
 */
export async function guest(ctx: Context<Environment>) {
    const { os, browser, environment } = ctx.data;

    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            os,
            browser,
            environment,
        },
    );

    const group = await Group.findOne(
        { isDefault: true },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            createTime: 1,
            creator: 1,
        },
    );
    if (!group) {
        throw new AssertionError({ message: 'Default group is not found' });
    }
    ctx.socket.join(group._id.toString());

    const messages = await Message.find(
        { to: group._id },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
            deleted: 1,
        },
        { sort: { createTime: -1 }, limit: 15 },
    ).populate('from', { username: 1, avatar: 1 });
    await handleInviteV2Messages(messages);
    messages.reverse();

    return { messages, ...group.toObject() };
}

/**
 * @param ctx Context
 */
export async function changeAvatar(ctx: Context<{ avatar: string }>) {
    const { avatar } = ctx.data;
    assert(avatar, 'Url of avatar cannot be empty');

    await User.updateOne(
        { _id: ctx.socket.user },
        {
            avatar,
        },
    );

    return {};
}

/**
 * @param ctx Context
 */
export async function addFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(isValid(userId), 'Invalid user ID');
    assert(ctx.socket.user !== userId, 'Can add yourself');

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new AssertionError({ message: 'User is not exist' });
    }

    const friend = await Friend.find({ from: ctx.socket.user, to: user._id });
    assert(friend.length === 0, 'Your have added already');

    const newFriend = await Friend.create({
        from: ctx.socket.user as string,
        to: user._id,
    } as FriendDocument);

    return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        from: newFriend.from,
        to: newFriend.to,
    };
}

/**
 * @param ctx Context
 */
export async function deleteFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(isValid(userId), 'Invalid user ID');

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new AssertionError({ message: 'User is not exist' });
    }

    await Friend.deleteOne({ from: ctx.socket.user, to: user._id });
    return {};
}

/**
 * @param ctx Context
 */
export async function changePassword(
    ctx: Context<{ oldPassword: string; newPassword: string }>,
) {
    const { oldPassword, newPassword } = ctx.data;
    assert(newPassword, 'New password can not be empty');
    assert(oldPassword !== newPassword, 'New password can not be same as old password');

    const user = await User.findOne({ _id: ctx.socket.user });
    if (!user) {
        throw new AssertionError({ message: 'User is not exist' });
    }
    const isPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
    assert(isPasswordCorrect, 'Old password is incorrect');

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password = hash;
    await user.save();

    return {
        msg: 'ok',
    };
}

/**
 * @param ctx Context
 */
export async function changeUsername(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username, 'New username can not be empty');

    const user = await User.findOne({ username });
    assert(!user, 'Username is exist, change a new username');

    const self = await User.findOne({ _id: ctx.socket.user });
    if (!self) {
        throw new AssertionError({ message: 'User is not exist' });
    }

    self.username = username;
    await self.save();

    return {
        msg: 'ok',
    };
}

/**
 * @param ctx Context
 */
export async function resetUserPassword(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', 'Username cannot be empty');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'User is not exist' });
    }

    const newPassword = 'helloworld';
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(newPassword, salt);

    user.salt = salt;
    user.password = hash;
    await user.save();

    return {
        newPassword,
    };
}

/**
 * @param ctx Context
 */
export async function setUserTag(
    ctx: Context<{ username: string; tag: string }>,
) {
    const { username, tag } = ctx.data;
    assert(username !== '', 'Username can not be empty');
    assert(tag !== '', 'Tag can not be empty');
    assert(
        /^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,5}$/.test(tag),
        'Tag format is invalid, 10 characters',
    );

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'Username is not exist' });
    }

    user.tag = tag;
    await user.save();

    const sockets = await Socket.find({ user: user._id });
    const socketIdList = sockets.map((socket) => socket.id);
    if (socketIdList.length) {
        ctx.socket.emit(socketIdList, 'changeTag', user.tag);
    }

    return {
        msg: 'ok',
    };
}

export async function getUserIps(
    ctx: Context<{ userId: string }>,
): Promise<string[]> {
    const { userId } = ctx.data;
    assert(userId, 'UserId can not be empty');
    assert(isValid(userId), 'Illegal userId');

    const sockets = await Socket.find({ user: userId });
    const ipList = sockets.map((socket) => socket.ip) || [];
    return Array.from(new Set(ipList));
}

const UserOnlineStatusCacheExpireTime = 1000 * 60;
function getUserOnlineStatusWrapper() {
    const cache: Record<
        string,
        {
            value: boolean;
            expireTime: number;
        }
    > = {};
    return async function getUserOnlineStatus(
        ctx: Context<{ userId: string }>,
    ) {
        const { userId } = ctx.data;
        assert(userId, 'userId can not be empty');
        assert(isValid(userId), 'Illegal userId');

        if (cache[userId] && cache[userId].expireTime > Date.now()) {
            return {
                isOnline: cache[userId].value,
            };
        }

        const sockets = await Socket.find({ user: userId });
        const isOnline = sockets.length > 0;
        cache[userId] = {
            value: isOnline,
            expireTime: Date.now() + UserOnlineStatusCacheExpireTime,
        };
        return {
            isOnline,
        };
    };
}
export const getUserOnlineStatus = getUserOnlineStatusWrapper();
