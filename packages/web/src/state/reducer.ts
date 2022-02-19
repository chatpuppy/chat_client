import { isMobile } from '@chatpuppy/utils/ua';
import getFriendId from '@chatpuppy/utils/getFriendId';
import convertMessage from '@chatpuppy/utils/convertMessage';
import getData from '../localStorage';
import {
    Action,
    ActionTypes,
    SetUserPayload,
    SetStatusPayload,
    AddLinkmanPayload,
    AddLinkmanHistoryMessagesPayload,
    SetLinkmansLastMessagesPayload,
    SetLinkmanPropertyPayload,
    UpdateMessagePayload,
    AddLinkmanMessagePayload,
    UpdateUserInfoPayload,
    DeleteMessagePayload,
} from './action';

export interface Message {
    _id: string;
    type: string;
    content: string;
    from: {
        _id: string;
        username: string;
        avatar: string;
        originUsername: string;
        tag: string;
    };
    loading: boolean;
    percent: number;
    createTime: string;
    deleted?: boolean;
}

export interface MessagesMap {
    [messageId: string]: Message;
}

export interface GroupMember {
    user: {
        _id: string;
        username: string;
        avatar: string;
    };
    os: string;
    browser: string;
    environment: string;
}

export interface Group {
    _id: string;
    name: string;
    avatar: string;
    createTime: string;
    creator: string;
    onlineMembers: GroupMember[];
}

export interface Friend {
    _id: string;
    name: string;
    avatar: string;
    createTime: string;
}

export interface Linkman extends Group, User {
    type: string;
    unread: number;
    messages: MessagesMap;
}

export interface LinkmansMap {
    [linkmanId: string]: Linkman;
}

export interface User {
    _id: string;
    username: string;
    avatar: string;
    isOnline: boolean;
}

/** redux store state */
export interface State {
    user: {
        _id: string;
        username: string;
        avatar: string;
        tag: string;
        isAdmin: boolean;
    } | null;
    linkmans: LinkmansMap; // contacts map
    focus: string; // is focused
    connect: boolean; // connect status
    status: {
        ready: boolean;
        loginRegisterDialogVisible: boolean;
        theme: string;
        primaryColor: string;
        primaryTextColor: string;
        backgroundImage: string;
        aero: boolean; // gause blur
        soundSwitch: boolean;
        sound: string;
        notificationSwitch: boolean;
        voiceSwitch: boolean;
        selfVoiceSwitch: boolean;
        /**
         * User tag color
         * singleColor: one color
         * fixedColor: one color for same words
         * randomColor: random color for same words
         */
        tagColorMode: string;
        sidebarVisible: boolean;
        functionBarAndLinkmanListVisible: boolean;
        enableSearchExpression: boolean;
    };
}

/**
 * @param linkmans 
 */
function getLinkmansMap(linkmans: Linkman[]) {
    return linkmans.reduce((map: LinkmansMap, linkman) => {
        map[linkman._id] = linkman;
        return map;
    }, {});
}

/**
 * @param messages 
 */
function getMessagesMap(messages: Message[]) {
    return messages.reduce((map: MessagesMap, message) => {
        map[message._id] = message;
        return map;
    }, {});
}

/**
 * @param obj 
 * @param keys 
 */
function deleteObjectKeys<T>(obj: T, keys: string[]): T {
    let entries = Object.entries(obj);
    const keysSet = new Set(keys);
    entries = entries.filter((entry) => !keysSet.has(entry[0]));
    return entries.reduce((result: any, entry) => {
        const [k, v] = entry;
        result[k] = v;
        return result;
    }, {});
}

/**
 * @param obj 
 * @param key 
 */
function deleteObjectKey<T>(obj: T, key: string): T {
    return deleteObjectKeys(obj, [key]);
}

/**
 * Initialize contact's fields
 * @param linkman 
 * @param type 
 */
function initLinkmanFields(linkman: Linkman, type: string) {
    linkman.type = type;
    linkman.unread = 0;
    linkman.messages = {};
}

/**
 * @param group 
 */
function transformGroup(group: Linkman): Linkman {
    initLinkmanFields(group, 'group');
    group.creator = group.creator || '';
    group.onlineMembers = [];
    return group;
}

/**
 * @param friend 
 */
function transformFriend(friend: Linkman): Linkman {
    // @ts-ignore
    const { from, to } = friend;
    const transformedFriend = {
        _id: getFriendId(from, to._id),
        name: to.username,
        avatar: to.avatar,
        // @ts-ignore
        createTime: friend.createTime,
    };
    initLinkmanFields(transformedFriend as unknown as Linkman, 'friend');
    return transformedFriend as Linkman;
}

function transformTemporary(temporary: Linkman): Linkman {
    initLinkmanFields(temporary, 'temporary');
    return temporary;
}

const localStorage = getData();
export const initialState: State = {
    user: null,
    linkmans: {},
    focus: '',
    connect: false,
    status: {
        ready: false,
        loginRegisterDialogVisible: false,
        theme: localStorage.theme,
        primaryColor: localStorage.primaryColor,
        primaryTextColor: localStorage.primaryTextColor,
        backgroundImage: localStorage.backgroundImage,
        aero: localStorage.aero,
        soundSwitch: localStorage.soundSwitch,
        sound: localStorage.sound,
        notificationSwitch: localStorage.notificationSwitch,
        voiceSwitch: localStorage.voiceSwitch,
        selfVoiceSwitch: localStorage.selfVoiceSwitch,
        tagColorMode: localStorage.tagColorMode,
        sidebarVisible: !isMobile,
        functionBarAndLinkmanListVisible: !isMobile,
        enableSearchExpression: localStorage.enableSearchExpression,
    },
};

function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.Ready: {
            return {
                ...state,
                status: {
                    ...state.status,
                    ready: true,
                },
            };
        }
        case ActionTypes.Connect: {
            return {
                ...state,
                connect: true,
            };
        }
        case ActionTypes.Disconnect: {
            return {
                ...state,
                connect: false,
            };
        }

        case ActionTypes.SetGuest: {
            const group = action.payload as Linkman;
            transformGroup(group);
            return {
                ...state,
                user: {
                    _id: '',
                    username: '',
                    avatar: '',
                    tag: '',
                    isAdmin: false,
                },
                linkmans: {
                    [group._id]: group,
                },
                focus: group._id,
            };
        }

        case ActionTypes.SetUser: {
            const { _id, username, avatar, tag, groups, friends, isAdmin } =
                action.payload as SetUserPayload;
            // @ts-ignore
            const linkmans: Linkman[] = [
                // @ts-ignore
                ...groups.map(transformGroup),
                // @ts-ignore
                ...friends.map(transformFriend),
            ];

            // If have not login, set the first focus contact as default
            let { focus } = state;
            /* istanbul ignore next */
            if (!state.user && linkmans.length > 0) {
                focus = linkmans[0]._id;
            }

            return {
                ...state,
                user: {
                    _id,
                    username,
                    avatar,
                    tag,
                    isAdmin,
                },
                linkmans: getLinkmansMap(linkmans),
                focus,
            };
        }

        case ActionTypes.UpdateUserInfo: {
            const payload = action.payload as UpdateUserInfoPayload;
            return {
                ...state,
                // @ts-ignore
                user: {
                    ...state.user,
                    ...payload,
                },
            };
        }

        case ActionTypes.Logout: {
            return {
                ...initialState,
                status: {
                    ...state.status,
                },
            };
        }

        case ActionTypes.SetAvatar: {
            return {
                ...state,
                // @ts-ignore
                user: {
                    ...state.user,
                    avatar: action.payload as string,
                },
            };
        }

        case ActionTypes.SetFocus: {
            const focus = action.payload as string;
            if (!state.linkmans[focus]) {
                /* istanbul ignore next */
                if (!__TEST__) {
                    console.warn(
                        `ActionTypes.SetFocus Error: contact ${focus} is not exist`,
                    );
                }
                return state;
            }

            /**
             * If history messages are more than 50, only keep 50 messages
             */
            const { messages } = state.linkmans[focus];
            const messageKeys = Object.keys(messages);
            let reserveMessages = messages;
            if (messageKeys.length > 50) {
                reserveMessages = deleteObjectKeys(
                    messages,
                    messageKeys.slice(0, messageKeys.length - 50),
                );
            }

            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [focus]: {
                        ...state.linkmans[focus],
                        messages: reserveMessages,
                        unread: 0,
                    },
                },
                focus,
            };
        }

        case ActionTypes.AddLinkman: {
            const payload = action.payload as AddLinkmanPayload;
            const { linkman } = payload;
            const focus = payload.focus ? linkman._id : state.focus;

            let transformedLinkman = linkman;
            switch (linkman.type) {
                case 'group': {
                    transformedLinkman = transformGroup(linkman);
                    break;
                }
                case 'friend': {
                    transformedLinkman = transformFriend(linkman);
                    break;
                }
                case 'temporary': {
                    transformedLinkman = transformTemporary(linkman);
                    transformedLinkman.unread = 1;
                    break;
                }
                default: {
                    return state;
                }
            }

            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [transformedLinkman._id]: transformedLinkman,
                },
                focus,
            };
        }

        case ActionTypes.RemoveLinkman: {
            const linkmans = deleteObjectKey(
                state.linkmans,
                action.payload as string,
            );
            const linkmanIds = Object.keys(linkmans);
            const focus = linkmanIds.length > 0 ? linkmanIds[0] : '';
            return {
                ...state,
                linkmans: {
                    ...linkmans,
                },
                focus,
            };
        }

        case ActionTypes.SetLinkmansLastMessages: {
            const linkmansMessages =
                action.payload as SetLinkmansLastMessagesPayload;
            const { linkmans } = state;
            const newState = { ...state, linkmans: {} };
            Object.keys(linkmans).forEach((linkmanId) => {
                // @ts-ignore
                newState.linkmans[linkmanId] = {
                    ...linkmans[linkmanId],
                    ...(linkmansMessages[linkmanId]
                        ? {
                            messages: getMessagesMap(
                                linkmansMessages[linkmanId].messages,
                            ),
                            unread: linkmansMessages[linkmanId].unread,
                        }
                        : {}),
                };
            });
            return newState;
        }

        case ActionTypes.AddLinkmanHistoryMessages: {
            const payload = action.payload as AddLinkmanHistoryMessagesPayload;
            const messagesMap = getMessagesMap(payload.messages);
            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        messages: {
                            ...messagesMap,
                            ...state.linkmans[payload.linkmanId].messages,
                        },
                    },
                },
            };
        }

        case ActionTypes.AddLinkmanMessage: {
            const payload = action.payload as AddLinkmanMessagePayload;
            let { unread } = state.linkmans[payload.linkmanId];
            if (state.focus !== payload.linkmanId) {
                unread++;
            }
            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        messages: {
                            ...state.linkmans[payload.linkmanId].messages,
                            [payload.message._id]: payload.message,
                        },
                        unread,
                    },
                },
            };
        }

        case ActionTypes.DeleteMessage: {
            const { linkmanId, messageId, shouldDelete } =
                action.payload as DeleteMessagePayload;
            if (!state.linkmans[linkmanId]) {
                /* istanbul ignore next */
                if (!__TEST__) {
                    console.warn(
                        `ActionTypes.DeleteMessage Error: contact ${linkmanId} is not exist`,
                    );
                }
                return state;
            }

            const newMessages = shouldDelete
                ? deleteObjectKey(state.linkmans[linkmanId].messages, messageId)
                : {
                    ...state.linkmans[linkmanId].messages,
                    [messageId]: convertMessage({
                        ...state.linkmans[linkmanId].messages[messageId],
                        deleted: true,
                    }),
                };

            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [linkmanId]: {
                        ...state.linkmans[linkmanId],
                        messages: newMessages,
                    },
                },
            };
        }

        case ActionTypes.SetLinkmanProperty: {
            const payload = action.payload as SetLinkmanPropertyPayload;
            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        [payload.key]: payload.value,
                    },
                },
            };
        }

        case ActionTypes.UpdateMessage: {
            const payload = action.payload as UpdateMessagePayload;

            let messages = {};
            if (payload.value._id) {
                messages = {
                    ...deleteObjectKey(
                        state.linkmans[payload.linkmanId].messages,
                        payload.messageId,
                    ),
                    [payload.value._id]: payload.value,
                };
            } else {
                messages = {
                    ...state.linkmans[payload.linkmanId].messages,
                    [payload.messageId]: {
                        ...state.linkmans[payload.linkmanId].messages[
                            payload.messageId
                        ],
                        ...payload.value,
                    },
                };
            }

            return {
                ...state,
                linkmans: {
                    ...state.linkmans,
                    [payload.linkmanId]: {
                        ...state.linkmans[payload.linkmanId],
                        messages,
                    },
                },
            };
        }

        case ActionTypes.SetStatus: {
            const payload = action.payload as SetStatusPayload;
            return {
                ...state,
                status: {
                    ...state.status,
                    [payload.key]: payload.value,
                },
            };
        }

        default:
            return state;
    }
}

export default reducer;
