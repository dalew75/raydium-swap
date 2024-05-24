import { initNats, subscribe } from "nats-wrapper";

let [subject] = process.argv.slice(2);

(async () => {
    await initNats();
    await subscribe(subject, (msg) => {
        const now = new Date().getTime();
        const msgObj = JSON.parse(msg);
        const delay = now - msgObj.time;
        console.log(`Received a message with delay of ${delay}ms: at ${now}`,msg);

    });
})();