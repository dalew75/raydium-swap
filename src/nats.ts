import 'dotenv/config';

import { connect, NatsConnection, StringCodec } from 'nats';
const sc = StringCodec();
let nc: NatsConnection;
let nc2: NatsConnection;

export async function initNats(useNats2: boolean = false) {
    if ( !nc ) {
        nc = await connect({ servers: process.env.NATS_SERVER });
        console.log(`Connected to NATS server: ${process.env.NATS_SERVER}`);
    }
    if ( !nc2 && useNats2 ) {
        nc2 = await connect({ servers: process.env.NATS_SERVER2, user: process.env.NATS_SERVER2_USER, pass: process.env.NATS_SERVER2_PASSWORD });
        console.log(`Connected to NATS server: ${process.env.NATS_SERVER2}`);
    }
}

export async function publish(subject: string, message: string | object, publishToNats2: boolean = false): Promise<void> {
    //await initNats();
    if (typeof message === 'string') {
        await nc.publish(subject, sc.encode(message));
        if ( nc2 && publishToNats2 ) {
            //console.log(`Publishing message to nats2:${process.env.NATS_SERVER2} at ${new Date().getTime()}: ${message}`);
            await nc2.publish(subject, sc.encode(message));
        }
    } else {
        //console.log(`Publishing message at ${new Date().getTime()}: ${JSON.stringify(message)}`)
        await nc.publish(subject, sc.encode(JSON.stringify(message)));
        if ( publishToNats2 ) await nc2.publish(subject, sc.encode(JSON.stringify(message)));
    }
}

export async function subscribe(subject: string, callback: (msg: string) => void): Promise<void> {
    //await initNats();
    const sub = nc.subscribe(subject);
    console.log(`Subscribed to subject: ${subject}`);
    for await (const m of sub) {
        callback(sc.decode(m.data));
    }
}