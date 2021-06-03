const Matrix = require('sylvester.js').Matrix
var $M     = Matrix.create;

const error = message => console.trace(console.error(message))
const assert = (condition, message) => !condition && error(message)

const Program = gl => {
  const program = gl.createProgram()
  const attach = shader => gl.attachShader(program, shader)
  const link = () => {
    gl.linkProgram(program)
    // If creating the shader program failed, alert.
    assert(gl.getProgramParameter(program, gl.LINK_STATUS), 'Unable to initialize the shader program.')
  }
  const use = () => gl.useProgram(program)
  const getAttributeLocation = name => gl.getAttribLocation(program, name)
  const setMatrixUniform = (name, array) => gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, array)
  return {attach, link, use, getAttributeLocation, setMatrixUniform, gl, program}
}

const shaderTypes = {
  'x-shader/x-fragment': gl => gl.createShader(gl.FRAGMENT_SHADER),
  'x-shader/x-vertex': gl => gl.createShader(gl.VERTEX_SHADER)
}

const Shader = (gl, script) => {
  const shader = shaderTypes[script.type](gl)
  // Send the source to the shader object.
  gl.shaderSource(shader, script.source)
  // Compile the shader program.
  gl.compileShader(shader)
  // See if it compiled successfully.
  !gl.getShaderParameter(shader, gl.COMPILE_STATUS) && error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader))
  return shader
}
const Texture = (gl, size, format) => {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  format = format ? format : gl.LUMINANCE
  gl.texImage2D(gl.TEXTURE_2D, 0, format, size.w, size.h, 0, format, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const fill = (textureData, useTexSubImage2D) => {
    assert(textureData.length >= size.w * size.h, 'Texture size mismatch, data:' + textureData.length + ', texture: ' + size.w * size.h)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    // texImage2D seems to be faster, thus keeping it as the default
    useTexSubImage2D ? gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size.w , size.h, format, gl.UNSIGNED_BYTE, textureData) : gl.texImage2D(gl.TEXTURE_2D, 0, format, size.w, size.h, 0, format, gl.UNSIGNED_BYTE, textureData)
  }
  let textureIDs;
  const bind = (n, program, name) => {
    textureIDs = textureIDs ? textureIDs : [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2]
    gl.activeTexture(textureIDs[n])
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(gl.getUniformLocation(program.program, name), n)
  }
  return {gl, texture, size, format, fill, bind}
}

function Script() {}

Script.createFromElementId = function(id) {
  var script = document.getElementById(id);
  
  // Didn't find an element with the specified ID, abort.
  assert(script , 'Could not find shader with ID: ' + id);
  
  // Walk through the source element's children, building the shader source string.
  var source = "";
  var currentChild = script .firstChild;
  while(currentChild) {
    if (currentChild.nodeType == 3) {
      source += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
  
  var res = new Scriptor();
  res.type = script.type;
  res.source = source;
  return res;
};

Script.createFromSource = function(type, source) {
  var res = new Script();
  res.type = type;
  res.source = source;
  return res;
}

/**
 * Generic WebGL backed canvas that sets up: a quad to paint a texture on, appropriate vertex/fragment shaders,
 * scene parameters and other things. Specialized versions of this class can be created by overriding several 
 * initialization methods.

 */
 
 // augment Sylvester some
 Matrix.Translation = function (v)
 {
   if (v.elements.length == 2) {
     var r = Matrix.I(3);
     r.elements[2][0] = v.elements[0];
     r.elements[2][1] = v.elements[1];
     return r;
   }
 
   if (v.elements.length == 3) {
     var r = Matrix.I(4);
     r.elements[0][3] = v.elements[0];
     r.elements[1][3] = v.elements[1];
     r.elements[2][3] = v.elements[2];
     return r;
   }
 
   throw "Invalid length for Translation";
 }
 
 Matrix.prototype.flatten = function ()
 {
     var result = [];
     if (this.elements.length == 0)
         return [];
 
 
     for (var j = 0; j < this.elements[0].length; j++)
         for (var i = 0; i < this.elements.length; i++)
             result.push(this.elements[i][j]);
     return result;
 }
 
 Matrix.prototype.ensure4x4 = function()
 {
     if (this.elements.length == 4 &&
         this.elements[0].length == 4)
         return this;
 
     if (this.elements.length > 4 ||
         this.elements[0].length > 4)
         return null;
 
     for (var i = 0; i < this.elements.length; i++) {
         for (var j = this.elements[i].length; j < 4; j++) {
             if (i == j)
                 this.elements[i].push(1);
             else
                 this.elements[i].push(0);
         }
     }
 
     for (var i = this.elements.length; i < 4; i++) {
         if (i == 0)
             this.elements.push([1, 0, 0, 0]);
         else if (i == 1)
             this.elements.push([0, 1, 0, 0]);
         else if (i == 2)
             this.elements.push([0, 0, 1, 0]);
         else if (i == 3)
             this.elements.push([0, 0, 0, 1]);
     }
 
     return this;
 };
 
//  Vector.prototype.flatten = function () { return this.elements; };
 
 //
 // gluPerspective
 //
 function makePerspective(fovy, aspect, znear, zfar) {
     var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
     var ymin = -ymax;
     var xmin = ymin * aspect;
     var xmax = ymax * aspect;
     return makeFrustum(xmin, xmax, ymin, ymax, znear, zfar);
 }
 
 //
 // glFrustum
 //
 function makeFrustum(left, right, bottom, top, znear, zfar) {
     const X = 2*znear/(right-left)
     const Y = 2*znear/(top-bottom)
     const A = (right+left)/(right-left)
     const B = (top+bottom)/(top-bottom)
     const C = -(zfar+znear)/(zfar-znear)
     const D = -2*zfar*znear/(zfar-znear)
     return $M([[X, 0, A, 0],
                [0, Y, B, 0],
                [0, 0, C, D],
                [0, 0, -1, 0]])
 }

const vertexShaderScript = Script.createFromSource("x-shader/x-vertex", `
  attribute vec3 aVertexPosition;
  attribute vec2 aTextureCoord;
  uniform mat4 uMVMatrix;
  uniform mat4 uPMatrix;
  varying highp vec2 vTextureCoord;
  void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
  }
`)

const fragmentShaderScript = Script.createFromSource("x-shader/x-fragment", `
  precision highp float;
  varying highp vec2 vTextureCoord;
  uniform sampler2D YTexture;
  uniform sampler2D UTexture;
  uniform sampler2D VTexture;
  const mat4 YUV2RGB = mat4
  (
   1.1643828125, 0, 1.59602734375, -.87078515625,
   1.1643828125, -.39176171875, -.81296875, .52959375,
   1.1643828125, 2.017234375, 0, -1.081390625,
   0, 0, 0, 1
  );

  void main(void) {
   gl_FragColor = vec4( texture2D(YTexture,  vTextureCoord).x, texture2D(UTexture, vTextureCoord).x, texture2D(VTexture, vTextureCoord).x, 1) * YUV2RGB;
  }
`)

function Size(w, h) {
  this.w = w;
  this.h = h;
}
Size.prototype = {
  toString: function() { return "(" + this.w + ", " + this.h + ")" },
  getHalfSize: function() { return new Size(this.w >>> 1, this.h >>> 1) },
  length: function() { return this.w * this.h }
}

const initGL = canvas => {
	const size = new Size(canvas.width, canvas.height)
	const gl = canvas.getContext('experimental-webgl')
	// shaders
	const program = Program(gl)
	program.attach(Shader(gl, vertexShaderScript))
	program.attach(Shader(gl, fragmentShaderScript))
	program.link()
	program.use()
	const vertexPositionAttribute = program.getAttributeLocation('aVertexPosition')
	gl.enableVertexAttribArray(vertexPositionAttribute)
	const textureCoordAttribute = program.getAttributeLocation('aTextureCoord')
	gl.enableVertexAttribArray(textureCoordAttribute)
	//init buffers
	// Create vertex position buffer.
	let quadVPBuffer = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVPBuffer)
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 1.0,  1.0, 0.0, -1.0,  1.0, 0.0,  1.0, -1.0, 0.0,  -1.0, -1.0, 0.0]), gl.STATIC_DRAW);
	quadVPBuffer.itemSize = 3
	quadVPBuffer.numItems = 4
	/*
	+--------------------+ 
	| -1,1 (1)           | 1,1 (0)
	|                    |
	|                    |
	|                    |
	|                    |
	|                    |
	| -1,-1 (3)          | 1,-1 (2)
	+--------------------+
	*/

	const scaleX = 1.0
	const scaleY = 1.0
	// Create vertex texture coordinate buffer.
	let quadVTCBuffer = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVTCBuffer)
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ scaleX, 0.0, 0.0, 0.0, scaleX, scaleY, 0.0, scaleY,]), gl.STATIC_DRAW)
	const texture = Texture(gl, size, gl.RGBA)
	// Establish the perspective with which we want to view the
	// scene. Our field of view is 45 degrees, with a width/height
	// ratio of 640:480, and we only want to see objects between 0.1 units
	// and 100 units away from the camera.

	const perspectiveMatrix = makePerspective(45, 1, 0.1, 100.0)

	// Draw the cube by binding the array buffer to the cube's vertices
	// array, setting attributes, and pushing it to GL.
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVPBuffer)
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0)

	// Set the texture coordinates attribute for the vertices.

	gl.bindBuffer(gl.ARRAY_BUFFER, quadVTCBuffer)
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0)

	texture.bind(0, program, 'texture')

	program.setMatrixUniform('uPMatrix', new Float32Array(perspectiveMatrix.flatten()))
	// Set the drawing position to the "identity" point, which is
	// the center of the scene.
	// Now move the drawing position a bit to where we want to start
	// drawing the square.
	program.setMatrixUniform('uMVMatrix', new Float32Array(Matrix.I(4).x(Matrix.Translation($V([0.0, 0.0, -2.4])).ensure4x4()).flatten()))

	// textures
	console.log('creatingTextures: size: ' + size)
	const YTexture = Texture(gl, size)
	const UTexture = Texture(gl, size.getHalfSize())
	const VTexture = Texture(gl, size.getHalfSize())
	// scene textures
	YTexture.bind(0, program, 'YTexture')
	UTexture.bind(1, program, 'UTexture')
	VTexture.bind(2, program, 'VTexture')

	const decode = (buffer, width, height) => {
		if (!buffer) return
		const lumaSize = width * height
		const chromaSize = lumaSize >> 2
		YTexture.fill(buffer.subarray(0, lumaSize))
		UTexture.fill(buffer.subarray(lumaSize, lumaSize + chromaSize))
		VTexture.fill(buffer.subarray(lumaSize + chromaSize, lumaSize + 2 * chromaSize))
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
	}
	return { decode }
}

module.exports = { initGL }