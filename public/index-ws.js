window.onload = () => {
    document.getElementById('my-button').onclick = () => {
        init();
    }
}

async function init() {
    const ws = initWS();
    
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localVideo = document.getElementById("video");
    localVideo.srcObject = stream;
    localVideo.muted = true;

    const peer = createPeer();
    stream.getTracks().forEach(track => peer.addTrack(track, stream));


    peer.addEventListener("icecandidate", ({ candidate }) => {
        console.log("new candidate");
        console.log(peer.iceGatheringState);
        console.log(candidate);
        if (candidate !== null) {
            ws.send(JSON.stringify({
                from: "broadcaster",
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
        return new WebSocket("wss://localhost:8080");
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
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer, ws) {
    const offer = await peer.createOffer();
    console.log("offer bosque:", JSON.stringify(offer))
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription
    };

    const { data } = await axios.post('/broadcast', payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch(e => console.log(e));
}


