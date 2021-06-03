"use strict";
const Avc = require('./Decoder')
const { initGL } = require('./webgl')
const canvas = document.createElement('canvas')
canvas.width = 960
canvas.height = 540
document.body.appendChild(canvas)
const gl = initGL(canvas)
const startDecoder = () => {
  const avc = new Avc()
  avc.onPictureDecoded = gl.decode
  // avc.configure({ filter: "original", filterHorLuma: "optimized", filterVerLumaEdge: "optimized", getBoundaryStrengthsA: "optimized" })
  return avc
}
const startSocket = () => {
  const avc = startDecoder()
  const ws = new WebSocket('ws://' + document.location.host)
  ws.binaryType = 'arraybuffer'
  ws.onmessage = evt => avc.decode(new Uint8Array(evt.data))
  ws.onopen = () => console.log('connected!')
  ws.onclose = () => {
    console.log('connection closed ... reconnecting in 3 seconds ...')
    setTimeout(startSocket, 3000)
  }
}
startSocket()
