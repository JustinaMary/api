import bcrypt from 'bcrypt-nodejs';
import mongoose, { Error } from 'mongoose';
import { encryptString } from '../util/encrypt';

export type AccountDocument = mongoose.Document & {
    email: string;
    password: string;
    authenticationToken: string;
    authenticationTokenExpires: number;
    passwordResetToken: string;
    passwordResetExpires: number;
    address: string;
    privateKey: string;
    tokens: AuthToken[];
    burnProofs: string[];
    memberships: { [poolAddress: string]: string };
    privateKeys: { [address: string]: string };
    comparePassword: Function;
};

export interface AuthToken {
    accessToken: string;
    kind: string;
}

const accountSchema = new mongoose.Schema(
    {
        email: { type: String, unique: true },
        password: String,
        passwordResetToken: String,
        passwordResetExpires: Date,
        authenticationToken: String,
        authenticationTokenExpires: String,
        address: String,
        privateKey: String,
        tokens: Array,
        burnProofs: Array,
        memberships: Map,
        privateKeys: Map,
    },
    { timestamps: true },
);

/**
 * Password hash middleware.
 */
accountSchema.pre('save', function save(next) {
    const account = this as AccountDocument;

    if (!account.isModified('password')) {
        return next();
    }

    // Skip if the password has not been mofified. This will
    // not be the case when save is executed first time
    // Make sure to decrypt private key and encrypt again using
    // new password if still stored in db
    if (account.privateKey.length) {
        account.privateKey = encryptString(account.privateKey, account.password);
    }

    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return next(err);
        }
        bcrypt.hash(account.password, salt, undefined, (err: mongoose.Error, hash) => {
            if (err) {
                return next(err);
            }
            account.password = hash;
            next();
        });
    });
});

const comparePassword = function (candidatePassword: string) {
    try {
        const isMatch = bcrypt.compareSync(candidatePassword, this.password);
        return { isMatch };
    } catch (error) {
        return { error };
    }
};

accountSchema.methods.comparePassword = comparePassword;

export const Account = mongoose.model<AccountDocument>('Account', accountSchema);
