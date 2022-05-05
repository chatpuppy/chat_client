import fetch from './utils/fetch';
import { User, GroupMember } from './state/reducer';

function saveUsername(username: string) {
    window.localStorage.setItem('username', username);
}

/**
 * Register new user
 * @param address 
 * @param avatar
 * @param username
 * @param os 
 * @param browser 
 * @param environment 
 */
export async function register(
    address: string,
    avatar: string,
    username: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch('register', {
        address,
        avatar,
        username,
        os,
        browser,
        environment,
    });

    if (err) {
        return null;
    }

    saveUsername(user.username);
    return user;
}

/**
 * Login by username
 * @param address 
 * @param os 
 * @param browser 
 * @param environment 
 */
export async function login(
    address: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch('login', {
        address,
        os,
        browser,
        environment,
    });

    if (err) {
        return null;
    }

    saveUsername(user.username);
    return user;
}

/**
 * Login by token
 * @param token 
 * @param os 
 * @param browser 
 * @param environment 
 */
export async function loginByToken(
    token: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch(
        'loginByToken',
        {
            token,
            os,
            browser,
            environment,
        },
        { toast: false },
    );

    if (err) {
        return null;
    }

    saveUsername(user.username);
    return user;
}

/**
 * Visitor login
 * @param os 
 * @param browser 
 * @param environment 
 */
export async function guest(os = '', browser = '', environment = '') {
    const [err, res] = await fetch('guest', { os, browser, environment });
    if (err) {
        return null;
    }
    return res;
}

/**
 * Update user avatar
 * @param avatar avatar url
 */
export async function changeAvatar(avatar: string, address: string) {
    const [error] = await fetch('changeAvatar', { avatar, address });
    return !error;
}

/**
 * Update user name
 * @param username 
 */
export async function changeUsername(username: string, address: string) {
    const [error] = await fetch('changeUsername', {
        username,
        address
    });
    return !error;
}

/**
 * Update group name
 * @param old_name 
 * @param name 
 */
export async function changeGroupName(old_name: string, name: string) {
    const [error] = await fetch('changeGroupName', { old_name, name });
    return !error;
}

/**
 * Update group avatar image
 * @param name 
 * @param avatar 
 */
export async function changeGroupAvatar(name: string, avatar: string) {
    const [error] = await fetch('changeGroupAvatar', { name, avatar });
    return !error;
}

/**
 * Create group
 * @param name 
 */
export async function createGroup(name: string) {
    const [, group] = await fetch('createGroup', { name });
    return group;
}

/**
 * Delete group
 * @param groupId 
 */
export async function deleteGroup(groupId: string) {
    const [error] = await fetch('deleteGroup', { groupId });
    return !error;
}

/**
 * Join group
 * @param groupId 
 */
export async function joinGroup(groupId: string) {
    const [, group] = await fetch('joinGroup', { groupId });
    return group;
}

/**
 * Leave group
 * @param groupId 
 */
export async function leaveGroup(groupId: string) {
    const [error] = await fetch('leaveGroup', { groupId });
    return !error;
}

/**
 * Add buddy
 * @param userId 
 */
export async function addFriend(userId: string) {
    const [, user] = await fetch<User>('addFriend', { userId });
    return user;
}

/**
 * Add NickName Friend buddy
 * @param userId 
 */
 export async function changeNickNameFriend(userId: string,friendId: string, nickname: string) {
    const [, user] = await fetch<User>('changeNameBuddy', { userId, friendId, nickname });
    return user;
}

/**
 * Delete buddy
 * @param userId 
 */
export async function deleteFriend(userId: string) {
    const [err] = await fetch('deleteFriend', { userId });
    return !err;
}

/**
 * Get the last messages and unread number of a group of linkmans
 * @param linkmanIds Linkman ids who need to get the last messages
 */
export async function getLinkmansLastMessagesV2(linkmanIds: string[]) {
    const [, linkmanMessages] = await fetch('getLinkmansLastMessagesV2', {
        linkmans: linkmanIds,
    });
    return linkmanMessages;
}

/**
 * Get contacts' history messages
 * @param linkmanId 
 * @param existCount 
 */
export async function getLinkmanHistoryMessages(
    linkmanId: string,
    existCount: number,
    createTime: string,
) {
    const [, messages] = await fetch('getLinkmanHistoryMessages', {
        linkmanId,
        existCount,
        createTime
    });
    return messages;
}

/**
 * Get default group history messages
 * @param existCount 
 */
export async function getDefaultGroupHistoryMessages(existCount: number) {
    const [, messages] = await fetch('getDefaultGroupHistoryMessages', {
        existCount,
    });
    return messages;
}

/**
 * Search user and group
 * @param keywords 
 */
export async function search(keywords: string) {
    const [, result] = await fetch('search', { keywords });
    return result;
}

/**
 * Search memes
 * @param keywords 
 */
export async function searchExpression(keywords: string) {
    const [, result] = await fetch('searchExpression', { keywords });
    return result;
}

/**
 * Send message to
 * @param to 
 * @param type 
 * @param content 
 */
export async function sendMessage(to: string, type: string, content: string) {
    return fetch('sendMessage', { to, type, content });
}

/**
 * Delete message
 * @param messageId 
 */
export async function deleteMessage(messageId: string) {
    const [err] = await fetch('deleteMessage', { messageId });
    return !err;
}

/**
 * Get group online users
 * @param groupId 
 */
export const getGroupOnlineMembers = (() => {
    let cache: {
        groupId: string;
        key: string;
        members: GroupMember[];
    } = {
        groupId: '',
        key: '',
        members: [],
    };
    return async function _getGroupOnlineMembers(
        groupId: string,
    ): Promise<GroupMember[]> {
        const [, result] = await fetch('getGroupOnlineMembersV2', {
            groupId,
            cache: cache.groupId === groupId ? cache.key : undefined,
        });
        if (!result) {
            return [];
        }

        if (result.cache === cache.key) {
            return cache.members as GroupMember[];
        }
        cache = {
            groupId,
            key: result.cache,
            members: result.members,
        };
        return result.members;
    };
})();

/**
 * Get default group online members
 */
export async function getDefaultGroupOnlineMembers() {
    const [, members] = await fetch('getDefaultGroupOnlineMembers');
    return members;
}

/**
 * Ban user
 * @param username 
 */
export async function sealUser(username: string) {
    const [err] = await fetch('sealUser', { username });
    return !err;
}

/**
 * Ban IP
 * @param ip 
 */
export async function sealIp(ip: string) {
    const [err] = await fetch('sealIp', { ip });
    return !err;
}

/**
 * Ban online user IP
 * @param userId 
 */
export async function sealUserOnlineIp(userId: string) {
    const [err] = await fetch('sealUserOnlineIp', { userId });
    return !err;
}

/**
 * Get banned user list
 */
export async function getSealList() {
    const [, sealList] = await fetch('getSealList');
    return sealList;
}

export async function getSystemConfig() {
    const [, systemConfig] = await fetch('getSystemConfig');
    return systemConfig;
}

/**
 * @param username 
 */
export async function resetUserPassword(username: string) {
    const [, res] = await fetch('resetUserPassword', { username });
    return res;
}

/**
 * Update user tag
 * @param username 
 * @param tag 
 */
export async function setUserTag(username: string, tag: string) {
    const [err] = await fetch('setUserTag', { username, tag });
    return !err;
}

/**
 * get user ip
 * @param userId 
 */
export async function getUserIps(userId: string) {
    const [, res] = await fetch('getUserIps', { userId });
    return res;
}

export async function getUserOnlineStatus(userId: string) {
    const [, res] = await fetch('getUserOnlineStatus', { userId });
    return res && res.isOnline;
}

export async function updateHistory(linkmanId: string, messageId: string) {
    const [, result] = await fetch('updateHistory', { linkmanId, messageId });
    return !!result;
}

export async function toggleSendMessage(enable: boolean) {
    const [, result] = await fetch('toggleSendMessage', { enable });
    return !!result;
}

export async function toggleNewUserSendMessage(enable: boolean) {
    const [, result] = await fetch('toggleNewUserSendMessage', { enable });
    return !!result;
}
