# ipfs-signaling
WebRTC signaling done on top of IPFS pubsub. This allows for completely peer to peer messaging (minus the bootstrap node).  

This is a proof of concept chat application that uses [serverless -webrtc](https://github.com/cjb/serverless-webrtc/blob/master/serverless-webrtc.js) and [ipfs-pubsub](https://github.com/ipfs-shipyard/ifps-pubsub-room).

It works surprisingly quickly, but please consider that it will distribute your system information without encrypting it.

WebRTC allows for rich p2p communication apps (like video chat), so maybe a terminal-based chat isn't the best illustration of WebRTC's usefulness. A browser example is in the works!

## Installation

Make sure you have a working Node.js installation.

To install cli, simply run:
```
$ npm install
```

## Usage

Testing locally will require you to go to the project directory in one window and run:
```
$ node index.js --create
```

Then in another window do:
```
$ node index.js --b
```

This signals that one window is the 'Alice', while the other is the 'Bob'.

The --create option initiates the signaling process.
