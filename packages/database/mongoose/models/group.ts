import { Schema, model, Document } from 'mongoose';
import { NAME_REGEXP } from '@chatpuppy/utils/const';

const GroupSchema = new Schema({
    createTime: { type: Date, default: Date.now },

    name: {
        type: String,
        trim: true,
        unique: true,
        match: NAME_REGEXP,
        index: true,
    },
    avatar: String,
    announcement: {
        type: String,
        default: '',
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    members: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
});

export interface GroupDocument extends Document {
    /** GroupName */
    name: string;
    /** Avatar */
    avatar: string;
    /** announcement */
    announcement: string;
    /** creator */
    creator: string;
    /** isDefault Group */
    isDefault: boolean;
    /** members */
    members: string[];
    /** createTime */
    createTime: Date;
}

/**
 * Group Model
 */
const Group = model<GroupDocument>('Group', GroupSchema);

export default Group;
