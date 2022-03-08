import WuZeiNiangImage from '@chatpuppy/assets/images/admin.png';

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

function convertSystemMessage(message: any) {
    if (message.type === 'system') {
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'System';
        message.from.avatar = WuZeiNiangImage;
        message.from.tag = 'system';

        const content = JSON.parse(message.content);
        switch (content.command) {
            case 'roll': {
                message.content = `Throw out${content.value} Point (upper limit${content.top}Point)`;
                break;
            }
            case 'rps': {
                message.content = `Make out ${content.value}`;
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
        message.content = `Revoked the message`;
    }
}

export default function convertMessage(message: any) {
    convertSystemMessage(message);
    return message;
}
