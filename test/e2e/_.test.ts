import mongoose from 'mongoose';
import db from '../../src/util/database';
import MongoAdapter from '../../src/oidc/adapter';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { deployFacets } from '../../scripts/lib/facets';
import { deployFactory } from '../../scripts/lib/factory';
import { deployRegistry } from '../../scripts/lib/registry';
import { NetworkProvider } from '../../src/util/network';

beforeAll(async () => {
    const memServer = new MongoMemoryServer({
        instance: {
            ip: 'localhost',
            port: 27027,
            dbName: 'test',
        },
        autoStart: true,
    });

    await memServer.ensureInstance();

    await MongoAdapter.connect();

    console.log('Facets: ', await deployFacets(NetworkProvider.Test));
    console.log('Factory: ', await deployFactory(NetworkProvider.Test));
    console.log('Registry: ', await deployRegistry(NetworkProvider.Test));
});

afterAll(async () => {
    await db.disconnect();
    await mongoose.disconnect();
});

// require('./encrypt.ts');
require('./api.ts');
require('./signup.ts');
require('./bypass_polls.ts');
require('./propose_withdrawal.ts');
require('./unlimited_token.ts');
require('./voting.ts');
require('./roles.ts');
require('./gas_station.ts');
require('./oidc_admin.ts');
