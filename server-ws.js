const session = require('express-session');
const express = require('express');
const https = require("https");
const bodyParser = require('body-parser');
const webrtc = require("wrtc");
const fs = require('fs');

const { WebSocketServer } = require('ws');

const app = express();

const map = new Map();
let senderStream;

//
// We need the same instance of the session parser in express and
// WebSocket server.
//
const sessionParser = session({
    saveUninitialized: false,
    secret: '$eCuRiTy',
    resave: false
});


app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sessionParser);

let consumerPeer;
let broadcasterPeer;

app.post("/consumer", async ({ body }, res) => {
    consumerPeer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:openrelay.metered.ca:80"
            },
            {
                urls: "turn:openrelay.metered.ca:80",
                credential: "openrelayproject",
                username: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
            },

        ],
        iceTransportPolicy: "all"
    });

    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await consumerPeer.setRemoteDescription(desc);
    senderStream.getTracks().forEach(track => consumerPeer.addTrack(track, senderStream));
    const answer = await consumerPeer.createAnswer();
    await consumerPeer.setLocalDescription(answer);
    const payload = {
        sdp: consumerPeer.localDescription
    }

    res.json(payload);
});



app.post('/broadcast', async ({ body }, res) => {
    broadcasterPeer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:openrelay.metered.ca:80"
            },
            {
                urls: "turn:openrelay.metered.ca:80",
                credential: "openrelayproject",
                username: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
            },

        ],
        iceTransportPolicy: "all"
    });

    broadcasterPeer.ontrack = (e) => handleTrackEvent(e, broadcasterPeer);
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await broadcasterPeer.setRemoteDescription(desc);
    const answer = await broadcasterPeer.createAnswer();
    await broadcasterPeer.setLocalDescription(answer);
    const payload = {
        sdp: broadcasterPeer.localDescription
    }

    res.json(payload);
});

function handleTrackEvent(e, peer) {
    senderStream = e.streams[0];
};

const server = https.createServer({
    cert: fs.readFileSync('cert.pem'),
    key: fs.readFileSync('key.pem')
}, app);

//
// Create a WebSocket server completely detached from the HTTP server.
//
const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {
    console.log('Parsing session from request...');

    sessionParser(request, {}, () => {
        // if (!request.session.userId) {
        //     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        //     socket.destroy();
        //     return;
        // }

        console.log('Session is parsed!');
        wss.handleUpgrade(request, socket, head, function (ws) {
            wss.emit('connection', ws, request);
        });

    });
});




wss.on('connection', function (ws, request) {
    ws.on('message', function (message) {
        const data = JSON.parse(message.toString());

        if (data.from == "broadcaster") {
            console.log("from broadcaster data.candidate bosque:", data.candidate)
            broadcasterPeer.addIceCandidate(data.candidate);
        }
        if (data.from == "viewer"){
            console.log("from viewer data.candidate bosque:", data.candidate)
            consumerPeer.addIceCandidate(data.candidate);
        }
        //
        // // Here we can now use session parameters.
        // //
        // // console.log('Received Message:', message.data);

        // // console.log(`Received message.data ${message.data}`);
        // console.log(`Received message ${message.toJSON()}`);
    });

    ws.on('close', function () {
        // map.delete(userId);
    });
});

//
// Start the server.
//
server.listen(5000, function () {
    console.log('Listening on http://localhost:5000');
});