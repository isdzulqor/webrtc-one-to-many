window.onload = () => {
    document.getElementById('my-button').onclick = () => {
        init();
    }
}

async function init() {
    const ws = initWS();

    const peer = createPeer();
    peer.addTransceiver("video", { direction: "recvonly" })
    peer.addTransceiver("audio", { direction: "recvonly" })


    peer.addEventListener("icecandidate", ({ candidate }) => {
        console.log("new candidate");
        console.log(peer.iceGatheringState);
        console.log(candidate);
        if (candidate !== null) {
            ws.send(JSON.stringify({
                from: "viewer",
                candidate: candidate
            }))
        }
    })

    ws.onmessage = function (evt) {
        var received_msg = evt.data;
        alert("Message is received...");
    };

    ws.onclose = function () {
        // websocket is closed.
        alert("Connection is closed...");
    };
}

function initWS() {
    if ("WebSocket" in window) {
        // Let us open a web socket
        return new WebSocket("wss://108.136.184.106:5000");
    } else {
        // The browser doesn't support WebSocket
        alert("WebSocket NOT supported by your Browser!");
    }
}


function createPeer() {
    const peer = new RTCPeerConnection({
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
    console.log(peer.iceGatheringState); // new
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer();
    console.log("offer bosque:", JSON.stringify(offer))
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription
    };

    const { data } = await axios.post('/consumer', payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch(e => console.log(e));
}

function handleTrackEvent(e) {
    document.getElementById("video").srcObject = e.streams[0];
};

