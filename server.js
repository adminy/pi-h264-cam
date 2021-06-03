'use strict';
const http    = require('http')
const express = require('express')
const spawn     = require('child_process').spawn
const WebSocketServer = require('ws').Server
const Splitter        = require('stream-split')
const NALseparator    = Buffer.from([0, 0, 0, 1]) // NAL break
const state = {}

const app  = express()
app.use(express.static(__dirname))
const server  = http.createServer(app)
const options = { width : 960, height: 540, fps : 12 }
const wss = new WebSocketServer({ server })

const startStream = onFrame => {
  const streamer = spawn('raspivid', ['-t', '0', '-o', '-', '-w', options.width, '-h', options.height, '-fps', options.fps, '-vf', '-pf', 'baseline'])
  streamer.on('exit', code => console.log('Failure', code))
  const stream = streamer.stdout.pipe(new Splitter(NALseparator))
  streamer.stderr.on('data', e => console.error(e.toString()))
  stream.on('data', data => onFrame(Buffer.concat([NALseparator, data])))
  return () => {
    stream.end()
    streamer.kill()
  }
}

wss.on('connection', ws => {
  state.stopStream && state.stopStream()
  state.stopStream = startStream(frame => {
    ws.readyState === 1 && ws.send(frame, { binary: true}, error => error && console.log('error sending', error))
  })
  ws.on('close', state.stopStream)
})
server.listen(80)
