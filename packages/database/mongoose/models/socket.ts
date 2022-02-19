import { Schema, model, Document } from 'mongoose';

const SocketSchema = new Schema({
    createTime: { type: Date, default: Date.now },

    id: {
        type: String,
        unique: true,
        index: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    ip: String,
    os: {
        type: String,
        default: '',
    },
    browser: {
        type: String,
        default: '',
    },
    environment: {
        type: String,
        default: '',
    },
});

export interface SocketDocument extends Document {
    id: string; // socket id
    user: any;
    ip: string;
    os: string;
    browser: string;
    environment: string;
    createTime: Date;
}

/**
 * Socket Model
 */
const Socket = model<SocketDocument>('Socket', SocketSchema);

export default Socket;
