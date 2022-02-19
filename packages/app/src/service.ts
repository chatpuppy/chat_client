import { User } from './types/redux';
import fetch from './utils/fetch';

function saveUsername(username: string) {
    window.localStorage.setItem('username', username);
}

/**
 * Register new user
 * @param username Username to register
 * @param password Password
 * @param os OS
 * @param browser Browser
 * @param environment Environment
 */
export async function register(
    username: string,
    password: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch('register', {
        username,
        password,
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
 * @param username 
 * @param password 
 * @param os 
 * @param browser 
 * @param environment 
 */
export async function login(
    username: string,
    password: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch('login', {
        username,
        password,
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
 * Vistor login
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
 * Change Avatar
 * @param avatar 
 */
export async function changeAvatar(avatar: string) {
    const [error] = await fetch('changeAvatar', { avatar });
    return !error;
}

/**
 * Change password
 * @param oldPassword 
 * @param newPassword 
 */
export async function changePassword(oldPassword: string, newPassword: string) {
    const [error] = await fetch('changePassword', {
        oldPassword,
        newPassword,
    });
    return !error;
}

/**
 * Change username
 * @param username 
 */
export async function changeUsername(username: string) {
    const [error] = await fetch('changeUsername', {
        username,
    });
    return !error;
}

/**
 * Change group name
 * @param groupId 
 * @param name 
 */
export async function changeGroupName(groupId: string, name: string) {
    const [error] = await fetch('changeGroupName', { groupId, name });
    return !error;
}

/**
 * Change group avatar
 * @param groupId 
 * @param name 
 */
export async function changeGroupAvatar(groupId: string, avatar: string) {
    const [error] = await fetch('changeGroupAvatar', { groupId, avatar });
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
 * Delete buddy
 * @param userId 
 */
export async function deleteFriend(userId: string) {
    const [err] = await fetch('deleteFriend', { userId });
    return !err;
}

/**
 * Get buddie's history messages
 * @param linkmanId 
 * @param existCount 
 */
export async function getLinkmanHistoryMessages(
    linkmanId: string,
    existCount: number,
) {
    const [, messages] = await fetch('getLinkmanHistoryMessages', {
        linkmanId,
        existCount,
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
 * Search username or group
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
 * Get group online members
 * @param groupId 
 */
export async function getGroupOnlineMembers(groupId: string) {
    const [, members] = await fetch('getGroupOnlineMembers', { groupId });
    return members;
}

/**
 * Get default group online members
 */
export async function getDefaultGroupOnlineMembers() {
    const [, members] = await fetch('getDefaultGroupOnlineMembers');
    return members;
}

/**
 * ban user
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
 * Ban all online uses' IP addresses
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

/**
 * Reset user's password
 * @param username 
 */
export async function resetUserPassword(username: string) {
    const [, res] = await fetch('resetUserPassword', { username });
    return res;
}

/**
 * Update user's tag
 * @param username 
 * @param tag 
 */
export async function setUserTag(username: string, tag: string) {
    const [err] = await fetch('setUserTag', { username, tag });
    return !err;
}

/**
 * Get user's ip
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

export async function setNotificationToken(token: string) {
    const [, res] = await fetch(
        'setNotificationToken',
        { token },
        { toast: false },
    );
    return res && res.isOK;
}
