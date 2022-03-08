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
    /** Source user id */
    from: string;
    /** Target user id */
    to: string;
    /** createTime */
    createTime: Date;
}

/**
 * Friend Model
 * Friend information
 * Friendship is one-way.
 */
const Friend = model<FriendDocument>('Friend', FriendSchema);

export default Friend;
