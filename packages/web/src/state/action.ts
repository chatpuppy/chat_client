import { Group, Friend, Message, Linkman } from './reducer';

// eslint-disable-next-line import/prefer-default-export
export enum ActionTypes {
    SetGuest = 'SetGuest',
    SetUser = 'SetUser',
    UpdateUserInfo = 'UpdateUserInfo',
    SetStatus = 'SetStatus',
    Logout = 'Logout',
    SetAvatar = 'SetAvatar',
    AddLinkman = 'AddLinkman',
    RemoveLinkman = 'RemoveLinkman',
    SetFocus = 'SetFocus',
    SetLinkmansLastMessages = 'SetLinkmansLastMessages',
    AddLinkmanHistoryMessages = 'AddLinkmanHistoryMessages',
    AddLinkmanMessage = 'AddLinkmanMessage',
    SetLinkmanProperty = 'SetLinkmanProperty',
    UpdateMessage = 'UpdateMessage',
    DeleteMessage = 'DeleteMessage',
    Connect = 'Connect',
    Disconnect = 'Disconnect',
    Ready = 'Ready',
}

export type SetGuestPayload = Group;

export type SetUserPayload = {
    _id: string;
    username: string;
    tag: string;
    avatar: string;
    groups: Group[];
    friends: Friend[];
    isAdmin: boolean;
};

export type UpdateUserInfoPayload = Object;

export interface SetStatusPayload {
    key: string;
    value: any;
}

export type SetAvatarPayload = string;

export interface AddLinkmanPayload {
    linkman: Linkman;
    focus: boolean;
}

export type SetFocusPayload = string;

export interface SetLinkmansLastMessagesPayload {
    [linkmanId: string]: {
        messages: Message[];
        unread: number;
    };
}

export interface AddLinkmanHistoryMessagesPayload {
    linkmanId: string;
    messages: Message[];
}

export interface AddLinkmanMessagePayload {
    linkmanId: string;
    message: Message;
}

export interface SetLinkmanPropertyPayload {
    linkmanId: string;
    key: string;
    value: any;
}

export type RemoveLinkmanPayload = string;

export interface UpdateMessagePayload {
    linkmanId: string;
    messageId: string;
    value: any;
}

export interface DeleteMessagePayload {
    linkmanId: string;
    messageId: string;
    shouldDelete: boolean;
}

export interface Action {
    type: ActionTypes;
    payload:
        | SetUserPayload
        | UpdateUserInfoPayload
        | SetGuestPayload
        | SetStatusPayload
        | SetAvatarPayload
        | AddLinkmanPayload
        | SetFocusPayload
        | AddLinkmanHistoryMessagesPayload
        | AddLinkmanMessagePayload
        | SetLinkmanPropertyPayload
        | RemoveLinkmanPayload
        | SetLinkmansLastMessagesPayload
        | UpdateMessagePayload
        | DeleteMessagePayload;
}
