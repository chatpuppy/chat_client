import { Schema, model, Document } from 'mongoose';

const FriendSchema = new Schema({
    createTime: { type: Date, default: Date.now },

    from: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
});

export interface FriendDocument extends Document {
    from: string;
    to: string;
    createTime: Date;
}

/**
 * Friend Model
 */
const Friend = model<FriendDocument>('Friend', FriendSchema);

export default Friend;
