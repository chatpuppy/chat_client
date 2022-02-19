import { Schema, model, Document } from 'mongoose';
import { NAME_REGEXP } from '@chatpuppy/utils/const';

const UserSchema = new Schema({
    createTime: { type: Date, default: Date.now },
    lastLoginTime: { type: Date, default: Date.now },

    username: {
        type: String,
        trim: true,
        unique: true,
        match: NAME_REGEXP,
        index: true,
    },
    salt: String,
    password: String,
    avatar: String,
    tag: {
        type: String,
        default: '',
        trim: true,
        match: NAME_REGEXP,
    },
    expressions: [
        {
            type: String,
        },
    ],
    lastLoginIp: String,
});

export interface UserDocument extends Document {
    username: string;
    salt: string;
    password: string;
    avatar: string;
    tag: string;
    expressions: string[]; // meme
    createTime: Date;
    lastLoginTime: Date;
    lastLoginIp: string;
}

/**
 * User Model
 */
const User = model<UserDocument>('User', UserSchema);

export default User;
