const IPFS = require('ipfs');
const Room = require('ipfs-pubsub-room');
const webrtc = require('wrtc');
const readline = require('readline');

//instance specific stuff
let pc = null;
let id = Math.random();
let name = "alice";

//are we alice or bob?
if (process.argv[2] == "--b" || process.argv[3] == "--b") {
  name = "bob";
}

const ipfs = new IPFS({
    repo: `pubsub-signaling-${name}`,
    config: {
      Addresses: {
        Swarm: [
          '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
        ],
      },
    },
    EXPERIMENTAL: {
        pubsub: true,
    }
});

ipfs.once('ready', () => ipfs.id((err, info) => {
    if (err) { throw err }
    nodeAdress = info.id
    console.log('ready!');
}));


const room = Room(ipfs, 'ipfs-signaling-poc')

room.on('peer joined', peer => {
  if (process.argv[2] == "--create") {
    console.log('found peer, signaling');
    makeOffer();
  }
});

room.on('peer left', peer => {
  console.log('peer left');
});

room.on('message', message => {
  let data = JSON.parse(message.data);
  if (data.id == id)
    return;

  if (data.offer) {
    getOffer(data.offer);
  } else {
    getAnswer(data.answer);
  }
});


const dataChannelSettings = {
  'reliable': {
        ordered: true,
        maxRetransmits: 10,
  },
};

const settings = [
  {
    iceServers: [{url:'stun:stun.l.google.com:19302'}]
  },
  {
    'optional': [{DtlsSrtpKeyAgreement: false}]
  }
];

const pendingDataChannels = {};
const dataChannels = {}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


function doHandleError(error) {
  throw error;
}

function inputLoop(channel) {
  rl.question("> ", function(text) {
    channel.send(JSON.stringify({message: text}));
    inputLoop(channel);
  });
}

function getOffer(data) {
  let offer = new webrtc.RTCSessionDescription(data);
  pc = new webrtc.RTCPeerConnection(settings);
  pc.onicecandidate = function(candidate) {
    // Waiting until now
    // to create the answer saves us from having to send offer +
    // answer + iceCandidates separately.
    if (candidate.candidate == null) {
      sendAnswer();
    }
  }
  doHandleDataChannels(offer);
}

function sendAnswer() {
  room.broadcast(JSON.stringify({
    answer: pc.localDescription,
    id,
  }));
}

function doCreateAnswer() {
  pc.createAnswer(doSetLocalDesc, doHandleError);
}

function doSetLocalDesc(desc) {
  pc.setLocalDescription(desc, () => {}, doHandleError);
};

function doHandleDataChannels(offer) {
  let labels = Object.keys(dataChannelSettings);
  pc.ondatachannel = function(evt) {
    let channel = evt.channel;
    let label = channel.label;
    pendingDataChannels[label] = channel;
    channel.onopen = function() {
      dataChannels[label] = channel;
      delete pendingDataChannels[label];
      if(Object.keys(dataChannels).length === labels.length) {
        console.log("\nConnected!");
        inputLoop(channel);
      }
    };
    channel.onmessage = function(evt) {
      data = JSON.parse(evt.data);
      console.log(data.message);
      inputLoop(channel);
    };
    channel.onerror = doHandleError;
  };

  pc.setRemoteDescription(offer, doCreateAnswer, doHandleError);
}

function makeOffer() {
  pc = new webrtc.RTCPeerConnection(settings);
  makeDataChannel();
  pc.createOffer(function (desc) {
    pc.setLocalDescription(desc, function () {}, doHandleError);
  }, doHandleError);
  pc.onicecandidate = function(candidate) {
    if (candidate.candidate == null) {
      room.broadcast(JSON.stringify({
        offer: pc.localDescription,
        id,
      }));
    }
  }
}

function makeDataChannel() {
  // data channels apparently need to be made before doing anything
  let channel = pc.createDataChannel('chat', { reliable: true});
  channel.onopen = function() {
    console.log("\nConnected!");
    inputLoop(channel);
  };
  channel.onmessage = function(evt) {
    data = JSON.parse(evt.data);
    console.log(data.message);
    inputLoop(channel);
  };
  channel.onerror = doHandleError;
}

function getAnswer(data) {
  let answer = new webrtc.RTCSessionDescription(data);
  pc.setRemoteDescription(answer);
}
