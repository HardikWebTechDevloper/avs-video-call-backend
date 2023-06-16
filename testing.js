const express = require('express');
const { Worker } = require('worker_threads');

const app = express();
const PORT = 9999;
const THREAD_COUNT = 4;

function createWorker() {
    return new Promise((resolve, reject) => {
        let worker = new Worker("./worker.js", {
            workerData: {
                thread_count: THREAD_COUNT
            }
        });

        worker.on('message', (data) => {
            resolve(data);
        });

        worker.on('error', (err) => {
            reject(err);
        });
    });
}

// APIs
app.get("/non-blocking", (req, res) => {
    return res.status(200).send("This API is non-blocking.");
});

app.get("/blocking", async (req, res) => {
    let workerPromise = [];

    for (let index = 0; index < THREAD_COUNT; index++) {
        workerPromise.push(createWorker());
    }

    let thread_result = await Promise.all(workerPromise);
    let total = thread_result[0] + thread_result[1] + thread_result[2] + thread_result[3];
    return res.status(200).send("This API is non-blocking. " + total);
});

app.listen(PORT, () => {
    console.log('Server is running on port -->', PORT);
});