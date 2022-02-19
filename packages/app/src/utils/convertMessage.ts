// function convertRobot10Message(message) {
//     if (message.from._id === '5adad39555703565e7903f79') {
//         try {
//             const parseMessage = JSON.parse(message.content);
//             message.from.tag = parseMessage.source;
//             message.from.avatar = parseMessage.avatar;
//             message.from.username = parseMessage.username;
//             message.type = parseMessage.type;
//             message.content = parseMessage.content;
//         } catch (err) {
//             console.warn('parse robot10 failed', err);
//         }
//     }
// }

import { Message } from '../types/redux';

const WuZeiNiangImage = require('../assets/images/admin.png');

function convertSystemMessage(message: Message) {
    if (message.type === 'system') {
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'System';
        message.from.avatar = WuZeiNiangImage;
        message.from.tag = 'system';

        let content = null;
        try {
            content = JSON.parse(message.content);
        } catch {
            content = {
                command: 'parse-error',
            };
        }
        switch (content?.command) {
            case 'roll': {
                message.content = `掷出了${content.value}点 (上限${content.top}点)`;
                break;
            }
            case 'rps': {
                message.content = `使出了 ${content.value}`;
                break;
            }
            default: {
                message.content = 'Unsupported command';
            }
        }
    } else if (message.deleted) {
        message.type = 'system';
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'System';
        message.from.avatar = WuZeiNiangImage;
        message.from.tag = 'system';
        message.content = `Revoded message`;
    }

    return message;
}

/**
 * @param {Object} message 
 */
function convertMessageHtml(message: Message) {
    if (message.type === 'text') {
        message.content = message.content
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }
    return message;
}

export default function convertMessage(message: Message) {
    convertSystemMessage(message);
    convertMessageHtml(message);
    return message;
}
