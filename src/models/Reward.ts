import mongoose from 'mongoose';
export type RewardDocument = mongoose.Document & {
    id: number;
    withdrawAmount: number;
    withdrawDuration: number;
    state: number;
    poll: {
        id: number;
        withdrawAmount: number;
        withdrawDuration: number;
        startTime: number;
        endTime: number;
        yesCounter: number;
        noCounter: number;
        totalVoted: number;
    };
};

const rewardSchema = new mongoose.Schema(
    {
        id: Number,
    },
    { timestamps: true },
);

export const Reward = mongoose.model<RewardDocument>('Reward', rewardSchema);
