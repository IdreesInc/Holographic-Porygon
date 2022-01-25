var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var cbor = createCommonjsModule(function (module) {
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Patrick Gansterer <paroga@paroga.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function(global, undefined$1) {var POW_2_24 = Math.pow(2, -24),
    POW_2_32 = Math.pow(2, 32),
    POW_2_53 = Math.pow(2, 53);

function encode(value) {
  var data = new ArrayBuffer(256);
  var dataView = new DataView(data);
  var lastLength;
  var offset = 0;

  function ensureSpace(length) {
    var newByteLength = data.byteLength;
    var requiredLength = offset + length;
    while (newByteLength < requiredLength)
      newByteLength *= 2;
    if (newByteLength !== data.byteLength) {
      var oldDataView = dataView;
      data = new ArrayBuffer(newByteLength);
      dataView = new DataView(data);
      var uint32count = (offset + 3) >> 2;
      for (var i = 0; i < uint32count; ++i)
        dataView.setUint32(i * 4, oldDataView.getUint32(i * 4));
    }

    lastLength = length;
    return dataView;
  }
  function write() {
    offset += lastLength;
  }
  function writeFloat64(value) {
    write(ensureSpace(8).setFloat64(offset, value));
  }
  function writeUint8(value) {
    write(ensureSpace(1).setUint8(offset, value));
  }
  function writeUint8Array(value) {
    var dataView = ensureSpace(value.length);
    for (var i = 0; i < value.length; ++i)
      dataView.setUint8(offset + i, value[i]);
    write();
  }
  function writeUint16(value) {
    write(ensureSpace(2).setUint16(offset, value));
  }
  function writeUint32(value) {
    write(ensureSpace(4).setUint32(offset, value));
  }
  function writeUint64(value) {
    var low = value % POW_2_32;
    var high = (value - low) / POW_2_32;
    var dataView = ensureSpace(8);
    dataView.setUint32(offset, high);
    dataView.setUint32(offset + 4, low);
    write();
  }
  function writeTypeAndLength(type, length) {
    if (length < 24) {
      writeUint8(type << 5 | length);
    } else if (length < 0x100) {
      writeUint8(type << 5 | 24);
      writeUint8(length);
    } else if (length < 0x10000) {
      writeUint8(type << 5 | 25);
      writeUint16(length);
    } else if (length < 0x100000000) {
      writeUint8(type << 5 | 26);
      writeUint32(length);
    } else {
      writeUint8(type << 5 | 27);
      writeUint64(length);
    }
  }
  
  function encodeItem(value) {
    var i;

    if (value === false)
      return writeUint8(0xf4);
    if (value === true)
      return writeUint8(0xf5);
    if (value === null)
      return writeUint8(0xf6);
    if (value === undefined$1)
      return writeUint8(0xf7);
  
    switch (typeof value) {
      case "number":
        if (Math.floor(value) === value) {
          if (0 <= value && value <= POW_2_53)
            return writeTypeAndLength(0, value);
          if (-POW_2_53 <= value && value < 0)
            return writeTypeAndLength(1, -(value + 1));
        }
        writeUint8(0xfb);
        return writeFloat64(value);

      case "string":
        var utf8data = [];
        for (i = 0; i < value.length; ++i) {
          var charCode = value.charCodeAt(i);
          if (charCode < 0x80) {
            utf8data.push(charCode);
          } else if (charCode < 0x800) {
            utf8data.push(0xc0 | charCode >> 6);
            utf8data.push(0x80 | charCode & 0x3f);
          } else if (charCode < 0xd800) {
            utf8data.push(0xe0 | charCode >> 12);
            utf8data.push(0x80 | (charCode >> 6)  & 0x3f);
            utf8data.push(0x80 | charCode & 0x3f);
          } else {
            charCode = (charCode & 0x3ff) << 10;
            charCode |= value.charCodeAt(++i) & 0x3ff;
            charCode += 0x10000;

            utf8data.push(0xf0 | charCode >> 18);
            utf8data.push(0x80 | (charCode >> 12)  & 0x3f);
            utf8data.push(0x80 | (charCode >> 6)  & 0x3f);
            utf8data.push(0x80 | charCode & 0x3f);
          }
        }

        writeTypeAndLength(3, utf8data.length);
        return writeUint8Array(utf8data);

      default:
        var length;
        if (Array.isArray(value)) {
          length = value.length;
          writeTypeAndLength(4, length);
          for (i = 0; i < length; ++i)
            encodeItem(value[i]);
        } else if (value instanceof Uint8Array) {
          writeTypeAndLength(2, value.length);
          writeUint8Array(value);
        } else {
          var keys = Object.keys(value);
          length = keys.length;
          writeTypeAndLength(5, length);
          for (i = 0; i < length; ++i) {
            var key = keys[i];
            encodeItem(key);
            encodeItem(value[key]);
          }
        }
    }
  }
  
  encodeItem(value);

  if ("slice" in data)
    return data.slice(0, offset);
  
  var ret = new ArrayBuffer(offset);
  var retView = new DataView(ret);
  for (var i = 0; i < offset; ++i)
    retView.setUint8(i, dataView.getUint8(i));
  return ret;
}

function decode(data, tagger, simpleValue) {
  var dataView = new DataView(data);
  var offset = 0;
  
  if (typeof tagger !== "function")
    tagger = function(value) { return value; };
  if (typeof simpleValue !== "function")
    simpleValue = function() { return undefined$1; };

  function read(value, length) {
    offset += length;
    return value;
  }
  function readArrayBuffer(length) {
    return read(new Uint8Array(data, offset, length), length);
  }
  function readFloat16() {
    var tempArrayBuffer = new ArrayBuffer(4);
    var tempDataView = new DataView(tempArrayBuffer);
    var value = readUint16();

    var sign = value & 0x8000;
    var exponent = value & 0x7c00;
    var fraction = value & 0x03ff;
    
    if (exponent === 0x7c00)
      exponent = 0xff << 10;
    else if (exponent !== 0)
      exponent += (127 - 15) << 10;
    else if (fraction !== 0)
      return fraction * POW_2_24;
    
    tempDataView.setUint32(0, sign << 16 | exponent << 13 | fraction << 13);
    return tempDataView.getFloat32(0);
  }
  function readFloat32() {
    return read(dataView.getFloat32(offset), 4);
  }
  function readFloat64() {
    return read(dataView.getFloat64(offset), 8);
  }
  function readUint8() {
    return read(dataView.getUint8(offset), 1);
  }
  function readUint16() {
    return read(dataView.getUint16(offset), 2);
  }
  function readUint32() {
    return read(dataView.getUint32(offset), 4);
  }
  function readUint64() {
    return readUint32() * POW_2_32 + readUint32();
  }
  function readBreak() {
    if (dataView.getUint8(offset) !== 0xff)
      return false;
    offset += 1;
    return true;
  }
  function readLength(additionalInformation) {
    if (additionalInformation < 24)
      return additionalInformation;
    if (additionalInformation === 24)
      return readUint8();
    if (additionalInformation === 25)
      return readUint16();
    if (additionalInformation === 26)
      return readUint32();
    if (additionalInformation === 27)
      return readUint64();
    if (additionalInformation === 31)
      return -1;
    throw "Invalid length encoding";
  }
  function readIndefiniteStringLength(majorType) {
    var initialByte = readUint8();
    if (initialByte === 0xff)
      return -1;
    var length = readLength(initialByte & 0x1f);
    if (length < 0 || (initialByte >> 5) !== majorType)
      throw "Invalid indefinite length element";
    return length;
  }

  function appendUtf16data(utf16data, length) {
    for (var i = 0; i < length; ++i) {
      var value = readUint8();
      if (value & 0x80) {
        if (value < 0xe0) {
          value = (value & 0x1f) <<  6
                | (readUint8() & 0x3f);
          length -= 1;
        } else if (value < 0xf0) {
          value = (value & 0x0f) << 12
                | (readUint8() & 0x3f) << 6
                | (readUint8() & 0x3f);
          length -= 2;
        } else {
          value = (value & 0x0f) << 18
                | (readUint8() & 0x3f) << 12
                | (readUint8() & 0x3f) << 6
                | (readUint8() & 0x3f);
          length -= 3;
        }
      }

      if (value < 0x10000) {
        utf16data.push(value);
      } else {
        value -= 0x10000;
        utf16data.push(0xd800 | (value >> 10));
        utf16data.push(0xdc00 | (value & 0x3ff));
      }
    }
  }

  function decodeItem() {
    var initialByte = readUint8();
    var majorType = initialByte >> 5;
    var additionalInformation = initialByte & 0x1f;
    var i;
    var length;

    if (majorType === 7) {
      switch (additionalInformation) {
        case 25:
          return readFloat16();
        case 26:
          return readFloat32();
        case 27:
          return readFloat64();
      }
    }

    length = readLength(additionalInformation);
    if (length < 0 && (majorType < 2 || 6 < majorType))
      throw "Invalid length";

    switch (majorType) {
      case 0:
        return length;
      case 1:
        return -1 - length;
      case 2:
        if (length < 0) {
          var elements = [];
          var fullArrayLength = 0;
          while ((length = readIndefiniteStringLength(majorType)) >= 0) {
            fullArrayLength += length;
            elements.push(readArrayBuffer(length));
          }
          var fullArray = new Uint8Array(fullArrayLength);
          var fullArrayOffset = 0;
          for (i = 0; i < elements.length; ++i) {
            fullArray.set(elements[i], fullArrayOffset);
            fullArrayOffset += elements[i].length;
          }
          return fullArray;
        }
        return readArrayBuffer(length);
      case 3:
        var utf16data = [];
        if (length < 0) {
          while ((length = readIndefiniteStringLength(majorType)) >= 0)
            appendUtf16data(utf16data, length);
        } else
          appendUtf16data(utf16data, length);
        return String.fromCharCode.apply(null, utf16data);
      case 4:
        var retArray;
        if (length < 0) {
          retArray = [];
          while (!readBreak())
            retArray.push(decodeItem());
        } else {
          retArray = new Array(length);
          for (i = 0; i < length; ++i)
            retArray[i] = decodeItem();
        }
        return retArray;
      case 5:
        var retObject = {};
        for (i = 0; i < length || length < 0 && !readBreak(); ++i) {
          var key = decodeItem();
          retObject[key] = decodeItem();
        }
        return retObject;
      case 6:
        return tagger(decodeItem(), length);
      case 7:
        switch (length) {
          case 20:
            return false;
          case 21:
            return true;
          case 22:
            return null;
          case 23:
            return undefined$1;
          default:
            return simpleValue(length);
        }
    }
  }

  var ret = decodeItem();
  if (offset !== data.byteLength)
    throw "Remaining bytes";
  return ret;
}

var obj = { encode: encode, decode: decode };

if (typeof undefined$1 === "function" && undefined$1.amd)
  undefined$1("cbor/cbor", obj);
else if ( module.exports)
  module.exports = obj;
else if (!global.CBOR)
  global.CBOR = obj;

})(commonjsGlobal);
});

/**
 * This files defines the HoloPlayClient class and Message class.
 *
 * Copyright (c) [2019] [Looking Glass Factory]
 *
 * @link    https://lookingglassfactory.com/
 * @file    This files defines the HoloPlayClient class and Message class.
 * @author  Looking Glass Factory.
 * @version 0.0.8
 * @license SEE LICENSE IN LICENSE.md
 */

// Polyfill WebSocket for nodejs applications.
const WebSocket =
    typeof window === 'undefined' ? require('ws') : window.WebSocket;

/** Class representing a client to communicates with the HoloPlayService. */
class Client {
  /**
   * Establish a client to talk to HoloPlayService.
   * @constructor
   * @param {function} initCallback - optional; a function to trigger when
   *     response is received
   * @param {function} errCallback - optional; a function to trigger when there
   *     is a connection error
   * @param {function} closeCallback - optional; a function to trigger when the
   *     socket is closed
   * @param {boolean} debug - optional; default is false
   * @param {string}  appId - optional
   * @param {boolean} isGreedy - optional
   * @param {string}  oncloseBehavior - optional, can be 'wipe', 'hide', 'none'
   */
  constructor(
      initCallback, errCallback, closeCallback, debug = false, appId, isGreedy,
      oncloseBehavior) {
    this.reqs = [];
    this.reps = [];
    this.requestId = this.getRequestId();
    this.debug = debug;
    this.isGreedy = isGreedy;
    this.errCallback = errCallback;
    this.closeCallback = closeCallback;
    this.alwaysdebug = false;
    this.isConnected = false;
    let initCmd = null;
    if (appId || isGreedy || oncloseBehavior) {
      initCmd = new InitMessage(appId, isGreedy, oncloseBehavior, this.debug);
    } else {
      if (debug) this.alwaysdebug = true;
      if (typeof initCallback == 'function') initCmd = new InfoMessage();
    }
    this.openWebsocket(initCmd, initCallback);
  }
  /**
   * Send a message over the websocket to HoloPlayService.
   * @public
   * @param {Message} msg - message object
   * @param {integer} timeoutSecs - optional, default is 60 seconds
   */
  sendMessage(msg, timeoutSecs = 60) {
    if (this.alwaysdebug) msg.cmd.debug = true;
    let cborData = msg.toCbor();
    return this.sendRequestObj(cborData, timeoutSecs);
  }
  /**
   * Disconnects from the web socket.
   * @public
   */
  disconnect() {
    this.ws.close();
  }
  /**
   * Open a websocket and set handlers
   * @private
   */
  openWebsocket(firstCmd = null, initCallback = null) {
    this.ws =
        new WebSocket('ws://localhost:11222/driver', ['rep.sp.nanomsg.org']);
    this.ws.parent = this;
    this.ws.binaryType = 'arraybuffer';
    this.ws.onmessage = this.messageHandler;
    this.ws.onopen = (() => {
      this.isConnected = true;
      if (this.debug) {
        console.log('socket open');
      }
      if (firstCmd != null) {
        this.sendMessage(firstCmd).then(initCallback);
      }
    });
    this.ws.onerror = this.onSocketError;
    this.ws.onclose = this.onClose;
  }
  /**
   * Send a request object over websocket
   * @private
   */
  sendRequestObj(data, timeoutSecs) {
    return new Promise((resolve, reject) => {
      let reqObj = {
        id: this.requestId++,
        parent: this,
        payload: data,
        success: resolve,
        error: reject,
        send: function() {
          if (this.debug)
            console.log('attemtping to send request with ID ' + this.id);
          this.timeout = setTimeout(reqObj.send.bind(this), timeoutSecs * 1000);
          let tmp = new Uint8Array(data.byteLength + 4);
          let view = new DataView(tmp.buffer);
          view.setUint32(0, this.id);
          tmp.set(new Uint8Array(this.payload), 4);
          this.parent.ws.send(tmp.buffer);
        }
      };
      this.reqs.push(reqObj);
      reqObj.send();
    });
  }
  /**
   * Handles a message when received
   * @private
   */
  messageHandler(event) {
    console.log('message');
    let data = event.data;
    if (data.byteLength < 4) return;
    let view = new DataView(data);
    let replyId = view.getUint32(0);
    if (replyId < 0x80000000) {
      this.parent.err('bad nng header');
      return;
    }
    let i = this.parent.findReqIndex(replyId);
    if (i == -1) {
      this.parent.err('got reply that doesn\'t match known request!');
      return;
    }
    let rep = {id: replyId, payload: cbor.decode(data.slice(4))};
    if (rep.payload.error == 0) {
      this.parent.reqs[i].success(rep.payload);
    } else {
      this.parent.reqs[i].error(rep.payload);
    }
    clearTimeout(this.parent.reqs[i].timeout);
    this.parent.reqs.splice(i, 1);
    this.parent.reps.push(rep);
    if (this.debug) {
      console.log(rep.payload);
    }
  }
  getRequestId() {
    return Math.floor(this.prng() * (0x7fffffff)) + 0x80000000;
  }
  onClose(event) {
    this.parent.isConnected = false;
    if (this.parent.debug) {
      console.log('socket closed');
    }
    if (typeof this.parent.closeCallback == 'function')
      this.parent.closeCallback(event);
  }
  onSocketError(error) {
    if (this.parent.debug) {
      console.log(error);
    }
    if (typeof this.parent.errCallback == 'function') {
      this.parent.errCallback(error);
    }
  }
  err(errorMsg) {
    if (this.debug) {
      console.log('[DRIVER ERROR]' + errorMsg);
    }
    // TODO : make this return an event obj rather than a string
    // if (typeof this.errCallback == 'function')
    //   this.errCallback(errorMsg);
  }
  findReqIndex(replyId) {
    let i = 0;
    for (; i < this.reqs.length; i++) {
      if (this.reqs[i].id == replyId) {
        return i;
      }
    }
    return -1;
  }
  prng() {
    if (this.rng == undefined) {
      this.rng = generateRng();
    }
    return this.rng();
  }
}

/** A class to represent messages being sent over to HoloPlay Service */
class Message {
  /**
   * Construct a barebone message.
   * @constructor
   */
  constructor(cmd, bin) {
    this.cmd = cmd;
    this.bin = bin;
  }
  /**
   * Convert the class instance to the CBOR format
   * @public
   * @returns {CBOR} - cbor object of the message
   */
  toCbor() {
    return cbor.encode(this);
  }
}
/** Message to init. Extends the base Message class. */
class InitMessage extends Message {
  /**
   * @constructor
   * @param {string}  appId - a unique id for app
   * @param {boolean} isGreedy - will it take over screen
   * @param {string}  oncloseBehavior - can be 'wipe', 'hide', 'none'
   */
  constructor(appId = '', isGreedy = false, onclose = '', debug = false) {
    let cmd = {'init': {}};
    if (appId != '') cmd['init'].appid = appId;
    if (onclose != '') cmd['init'].onclose = onclose;
    if (isGreedy) cmd['init'].greedy = true;
    if (debug) cmd['init'].debug = true;
    super(cmd, null);
  }
}
/** Get info from the HoloPlayService */
class InfoMessage extends Message {
  /**
   * @constructor
   */
  constructor() {
    let cmd = {'info': {}};
    super(cmd, null);
  }
}
/* helper function */
function generateRng() {
  function xmur3(str) {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19;
    return function() {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^= h >>> 16) >>> 0;
    }
  }
  function xoshiro128ss(a, b, c, d) {
    return (() => {
      var t = b << 9, r = a * 5;
      r = (r << 7 | r >>> 25) * 9;
      c ^= a;
      d ^= b;
      b ^= c;
      a ^= d;
      c ^= t;
      d = d << 11 | d >>> 21;
      return (r >>> 0) / 4294967296;
    })
  }  var state = Date.now();
  var seed = xmur3(state.toString());
  return xoshiro128ss(seed(), seed(), seed(), seed());
}

const DEFAULT_CALIBRATION = {
  'configVersion': '1.0',
  'serial': '00000',
  'pitch': {'value': 47.556365966796878},
  'slope': {'value': -5.488804340362549},
  'center': {'value': 0.15815216302871705},
  'viewCone': {'value': 40.0},
  'invView': {'value': 1.0},
  'verticalAngle': {'value': 0.0},
  'DPI': {'value': 338.0},
  'screenW': {'value': 2560.0},
  'screenH': {'value': 1600.0},
  'flipImageX': {'value': 0.0},
  'flipImageY': {'value': 0.0},
  'flipSubp': {'value': 0.0}
};

function checkDriverInstall() {
  if (confirm(
          'HoloPlayService not detected! Click OK to download. If you have it already installed, please make sure it is running.')) {
    window.location.href = 'http://look.glass/holoplayservice';
  }
}

let cachedPromise = null;

function getDevices(showAlert = true) {
  if (!cachedPromise) {
    cachedPromise = new Promise((resolve, reject) => {
      new Client(
          (data) => {
            if (data.devices.length == 0 && showAlert) {
              alert(
                  'No Looking Glass detected. Please make sure your Looking Glass is plugged in.');
            }
            resolve(data.devices);
          },
          (err) => {
            console.error('error loading calibration', err);
            checkDriverInstall();
            reject(err);
          },
          console.log);
    });
  }
  return cachedPromise;
}

function getFirstDevice() {
  return getDevices().then((devices) => {
    if (devices.length == 0) {
      throw new Error('no devices');
    }
    return devices[0];
  });
}

function detectDevice(callback) {
  return getDevices(false).then(callback);
}

function getCalibration() {
  return getFirstDevice()
      .then((d) => {
        return d.calibration;
      })
      .catch((err) => {
        console.error('no devices connected. using default calibration.');
        return DEFAULT_CALIBRATION;
      });
}

const IDEAL_PROPERTIES = {
  'standard': {
    'quiltResolution': 4096,
    'tileCount': new THREE.Vector2(5, 9),
    'viewCone': 35,
    'fov': 12.5,
  },
  'large': {
    'quiltResolution': 4096,
    'tileCount': new THREE.Vector2(5, 9),
    'viewCone': 35,
    'fov': 12.5,
  },
  'pro': {
    'quiltResolution': 4096,
    'tileCount': new THREE.Vector2(5, 9),
    'viewCone': 35,
    'fov': 12.5,
  },
  '8k': {
    'quiltResolution': 8192,
    'tileCount': new THREE.Vector2(5, 9),
    'viewCone': 35,
    'fov': 12.5,
  },
  'default': {
    'quiltResolution': 2048,
    'tileCount': new THREE.Vector2(4, 8),
    'viewCone': 35,
    'fov': 12.5,
  },
};

function getIdealProperty(propName) {
  return getFirstDevice()
      .then((d) => {
        return IDEAL_PROPERTIES[d.hardwareVersion][propName];
      })
      .catch((err) => {
        return IDEAL_PROPERTIES['default'][propName];
      });
}

function getIdealQuiltResolution() {
  return getIdealProperty('quiltResolution');
}

function getIdealQuiltTileCount() {
  return getIdealProperty('tileCount');
}

function getIdealViewCone() {
  return getIdealProperty('viewCone');
}

function getIdealFov() {
  return getIdealProperty('fov');
}

var calibration = /*#__PURE__*/Object.freeze({
  __proto__: null,
  DEFAULT_CALIBRATION: DEFAULT_CALIBRATION,
  getFirstDevice: getFirstDevice,
  getCalibration: getCalibration,
  getIdealQuiltResolution: getIdealQuiltResolution,
  getIdealQuiltTileCount: getIdealQuiltTileCount,
  getIdealViewCone: getIdealViewCone,
  getIdealFov: getIdealFov
});

const QUILT_VERTEX_SHADER = `
  varying vec2 iUv;

  void main() {
    iUv = uv;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const QUILT_FRAGMENT_SHADER = `
  uniform sampler2D quiltTexture;
  uniform float pitch;
  uniform float tilt;
  uniform float center;
  uniform float invView; 
  uniform float flipX; 
  uniform float flipY; 
  uniform float subp; 
  uniform float tilesX;
  uniform float tilesY;
  uniform vec2 quiltViewPortion;
  varying vec2 iUv;

  vec2 texArr(vec3 uvz) {
    float z = floor(uvz.z * tilesX * tilesY);
    float x = (mod(z, tilesX) + uvz.x) / tilesX;
    float y = (floor(z / tilesX) + uvz.y) / tilesY;
    return vec2(x, y) * quiltViewPortion;
  }

  float remap(float value, float from1, float to1, float from2, float to2) {
   return (value - from1) / (to1 - from1) * (to2 - from2) + from2;
  }

  void main() {
    vec4 rgb[3];
    vec3 nuv = vec3(iUv.xy, 0.0);

    // Flip UVs if necessary
    nuv.x = (1.0 - flipX) * nuv.x + flipX * (1.0 - nuv.x);
    nuv.y = (1.0 - flipY) * nuv.y + flipY * (1.0 - nuv.y);

    for (int i = 0; i < 3; i++) {
      nuv.z = (iUv.x + float(i) * subp + iUv.y * tilt) * pitch - center;
      nuv.z = mod(nuv.z + ceil(abs(nuv.z)), 1.0);
      nuv.z = (1.0 - invView) * nuv.z + invView * (1.0 - nuv.z); 
      rgb[i] = texture2D(quiltTexture, texArr(vec3(iUv.x, iUv.y, nuv.z)));
    }

    gl_FragColor = vec4(rgb[0].r, rgb[1].g, rgb[2].b, 1);
  }
`;

const QUILT_SHADER_PROPERTIES = {
  uniforms: {
    quiltTexture: {value: null},
    pitch: {value: 0},
    tilt: {value: 0},
    center: {value: 0},
    invView: {value: 0},
    flipX: {value: 0},
    flipY: {value: 0},
    subp: {value: 0},
    tilesX: {value: 0},
    tilesY: {value: 0},
    screenW: {value: 0},
    screenH: {value: 0},
    quiltViewPortion: {value: new THREE.Vector2(1, 1)},
  },
  vertexShader: QUILT_VERTEX_SHADER,
  fragmentShader: QUILT_FRAGMENT_SHADER,
};

class QuiltRenderer {
  constructor(tileCount, opt_renderer) {
    getCalibration().then((calibration) => {
      this.calibrationData = calibration;
      this.updateCalibration();
    });

    this.tileCount = tileCount;

    this.scene = new THREE.Scene();

    const quiltPlaneGeometry = new THREE.PlaneGeometry(1, 1);
    const quiltPlaneMaterial =
        new THREE.ShaderMaterial(QUILT_SHADER_PROPERTIES);
    this.quiltPlane = new THREE.Mesh(quiltPlaneGeometry, quiltPlaneMaterial);
    this.scene.add(this.quiltPlane);

    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0);
    this.renderer = opt_renderer || new THREE.WebGLRenderer();

    this.renderSize = new THREE.Vector2(window.innerWidth, window.innerHeight);

    this.domElement = this.renderer.domElement;
    this.domElement.style.position = 'absolute';
  }

  render() {
    this.renderer.setSize(this.renderSize.x, this.renderSize.y);
    this.negateWindowZoomAndOffset();
    this.renderer.render(this.scene, this.camera);
  }

  update(quiltResolution, tileCount) {
    this.tileCount.copy(tileCount);
    this.quiltPlane.material.uniforms.tilesX.value = this.tileCount.x;
    this.quiltPlane.material.uniforms.tilesY.value = this.tileCount.y;

    this.quiltPlane.material.uniforms.quiltViewPortion.value.set(
        (Math.floor(quiltResolution / this.tileCount.x) * this.tileCount.x) /
            quiltResolution,
        (Math.floor(quiltResolution / this.tileCount.y) * this.tileCount.y) /
            quiltResolution);
  }

  negateWindowZoomAndOffset() {
    const windowZoom =
        window.outerWidth / document.body.getBoundingClientRect().width;
    const browserToolbarHeight = window.outerHeight - window.innerHeight;
    this.domElement.style.width = `${this.domElement.width / windowZoom}px`;
    this.domElement.style.height = `${this.domElement.height / windowZoom}px`;
    this.domElement.style.left =
        `${(window.screen.availLeft - window.screenLeft) / windowZoom}px`;
    this.domElement.style.top =
        `${- (window.screenTop + browserToolbarHeight) / windowZoom}px`;
  }

  setQuiltImageURL(url) {
    const quiltImage = new Image();
    quiltImage.src = url;
    this.setQuiltImage(quiltImage);
  }

  setQuiltImage(quiltImage) {
    const imageTexture = new THREE.Texture();
    imageTexture.image = quiltImage;
    imageTexture.minFilter = THREE.NearestFilter;
    imageTexture.magFilter = THREE.NearestFilter;

    this.setQuiltTexture(imageTexture);

    // Update the texture when the image loads.
    quiltImage.addEventListener('load', () => {
      imageTexture.needsUpdate = true;
      this.render();
    });

    if (quiltImage.complete) {
      // Force a load event for an already downloaded file.
      quiltImage.load();
    }
  }

  setQuiltTexture(quiltTexture) {
    this.quiltPlane.material.uniforms.quiltTexture.value = quiltTexture;
  }

  updateCalibration() {
    if (!this.calibrationData) {
      return;
    }

    this.renderSize.set(
        this.calibrationData.screenW.value, this.calibrationData.screenH.value);

    const quiltMaterial = this.quiltPlane.material;

    const screenInches =
        this.calibrationData.screenW.value / this.calibrationData.DPI.value;
    let newPitch = this.calibrationData.pitch.value * screenInches;

    // account for tilt in measuring pitch horizontally
    newPitch *= Math.cos(Math.atan(1.0 / this.calibrationData.slope.value));
    quiltMaterial.uniforms.pitch.value = newPitch;

    // tilt
    let newTilt = this.calibrationData.screenH.value /
        (this.calibrationData.screenW.value * this.calibrationData.slope.value);
    if (this.calibrationData.flipImageX.value == 1) {
      newTilt *= -1;
    }
    quiltMaterial.uniforms.tilt.value = newTilt;

    // center
    // I need the relationship between the amount of pixels I have moved over to
    // the amount of lenticulars I have jumped
    // ie how many pixels are there to a lenticular?
    quiltMaterial.uniforms.center.value = this.calibrationData.center.value;

    // should we invert?
    quiltMaterial.uniforms.invView.value = this.calibrationData.invView.value;

    // Should we flip it for peppers?
    quiltMaterial.uniforms.flipX.value = this.calibrationData.flipImageX.value;
    quiltMaterial.uniforms.flipY.value = this.calibrationData.flipImageY.value;

    quiltMaterial.uniforms.subp.value =
        1 / (this.calibrationData.screenW.value * 3);

    // tiles
    quiltMaterial.uniforms.tilesX.value = this.tileCount.x;
    quiltMaterial.uniforms.tilesY.value = this.tileCount.y;
  };
}

/*! (c) Andrea Giammarchi - ISC */
var self$1 = undefined || /* istanbul ignore next */ {};
try {
  self$1.EventTarget = (new EventTarget).constructor;
} catch(EventTarget) {
  (function (Object, wm) {
    var create = Object.create;
    var defineProperty = Object.defineProperty;
    var proto = EventTarget.prototype;
    define(proto, 'addEventListener', function (type, listener, options) {
      for (var
        secret = wm.get(this),
        listeners = secret[type] || (secret[type] = []),
        i = 0, length = listeners.length; i < length; i++
      ) {
        if (listeners[i].listener === listener)
          return;
      }
      listeners.push({target: this, listener: listener, options: options});
    });
    define(proto, 'dispatchEvent', function (event) {
      var secret = wm.get(this);
      var listeners = secret[event.type];
      if (listeners) {
        define(event, 'target', this);
        define(event, 'currentTarget', this);
        listeners.slice(0).forEach(dispatch, event);
        delete event.currentTarget;
        delete event.target;
      }
      return true;
    });
    define(proto, 'removeEventListener', function (type, listener) {
      for (var
        secret = wm.get(this),
        listeners = secret[type] || (secret[type] = []),
        i = 0, length = listeners.length; i < length; i++
      ) {
        if (listeners[i].listener === listener) {
          listeners.splice(i, 1);
          return;
        }
      }
    });
    self$1.EventTarget = EventTarget;
    function EventTarget() {      wm.set(this, create(null));
    }
    function define(target, name, value) {
      defineProperty(
        target,
        name,
        {
          configurable: true,
          writable: true,
          value: value
        }
      );
    }
    function dispatch(info) {
      var options = info.options;
      if (options && options.once)
        info.target.removeEventListener(this.type, info.listener);
      if (typeof info.listener === 'function')
        info.listener.call(info.target, this);
      else
        info.listener.handleEvent(this);
    }
  }(Object, new WeakMap));
}
var EventTarget$1 = self$1.EventTarget;

const BUTTON_NAMES = ['square', 'left', 'right', 'circle'];

class Buttons extends EventTarget$1 {
  constructor() {
    super();

    this.lastButtonState = [];
    for (let i = 0; i < BUTTON_NAMES.length; i++) {
      this.lastButtonState.push(false);
    }

    this.gamepadInfo = null;

    window.addEventListener('gamepadconnected', (e) => {
      if (e.gamepad.id.indexOf('HoloPlay') > -1) {
        this.gamepadInfo = navigator.getGamepads()[e.gamepad.index];
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.id.indexOf('HoloPlay') > -1) {
        this.gamepadInfo = null;
      }
    });

    requestAnimationFrame(this.update.bind(this));
  }

  update() {
    requestAnimationFrame(this.update.bind(this));

    if (this.gamepadInfo == null) {
      return;
    }

    let holoplayGamepad;
    let allGamepads = navigator.getGamepads();
    for (let i = 0; i < allGamepads.length; i++) {
      if (allGamepads[i].index == this.gamepadInfo.index) {
        holoplayGamepad = allGamepads[i];
        break;
      }
    }

    if (!holoplayGamepad) {
      return;
    }

    for (let i = 0; i < holoplayGamepad.buttons.length; i++) {
      if (!this.lastButtonState[i] && holoplayGamepad.buttons[i].pressed) {
        this.dispatchButtonEvent('buttonDown', i);
        this.dispatchButtonEvent('buttonPressed', i);
      } else if (
          this.lastButtonState[i] && holoplayGamepad.buttons[i].pressed) {
        this.dispatchButtonEvent('buttonPressed', i);
      } else if (
          this.lastButtonState[i] && !holoplayGamepad.buttons[i].pressed) {
        this.dispatchButtonEvent('buttonUp', i);
      }

      this.lastButtonState[i] = holoplayGamepad.buttons[i].pressed;
    }
  }

  dispatchButtonEvent(type, buttonIndex) {
    this.dispatchEvent(new CustomEvent(type, {
      detail: {
        name: BUTTON_NAMES[buttonIndex],
        index: buttonIndex,
      }
    }));
  }
}

class Camera extends THREE.ArrayCamera {
  constructor() {
    super();

    this.tileCount = new THREE.Vector2();
    this.target = new THREE.Vector3(0, 0, 0);
    this.position.set(0, 0, 1);

    // just some defaults. we'll get them from calibration in a sec.
    this.fov = 12.5;
    this.aspect = 2560 / 1600;
    this.viewCone = 35;

    getIdealViewCone().then((viewCone) => {
      this.viewCone = viewCone;
    });

    getIdealFov().then((fov) => {
      this.fov = fov;
      this.cameras.forEach((c) => {
        c.fov = this.fov;
        c.updateProjectionMatrix();
      });
    });

    getCalibration().then((calibration) => {
      this.aspect = calibration.screenW.value / calibration.screenH.value;
      this.cameras.forEach((c) => {
        c.aspect = this.aspect;
        c.updateProjectionMatrix();
      });
    });
  }

  update(quiltResolution, tileCount) {
    // rebuild camera array if the camera count changes
    if (this.tileCount.x != tileCount.x || this.tileCount.y != tileCount.y) {
      this.cameras = [];
      for (let i = 0; i < tileCount.x * tileCount.y; i++) {
        const subcamera = new THREE.PerspectiveCamera(this.fov, this.aspect);
        subcamera.viewport = new THREE.Vector4();
        this.cameras.push(subcamera);
      }
      this.tileCount.copy(tileCount);
    }

    const tileSize = new THREE.Vector2(
        Math.floor(quiltResolution / tileCount.x),
        Math.floor(quiltResolution / tileCount.y));

    for (let i = 0; i < this.cameras.length; i++) {
      const subcamera = this.cameras[i];
      subcamera.rotation.copy(this.rotation);

      const tileGridPos =
          new THREE.Vector2(i % tileCount.x, Math.floor(i / tileCount.x));
      subcamera.viewport.set(
          tileGridPos.x * tileSize.x, tileGridPos.y * tileSize.y, tileSize.x,
          tileSize.y);

      const distanceToTarget = this.position.distanceTo(this.target);
      const angleToThisCamera = THREE.Math.degToRad(THREE.Math.lerp(
          -this.viewCone / 2, this.viewCone / 2,
          i / (this.cameras.length - 1)));
      const offsetAlongBaseline =
          distanceToTarget * Math.tan(angleToThisCamera);

      subcamera.position.copy(
          this.localToWorld(new THREE.Vector3(offsetAlongBaseline, 0, 0)));
      subcamera.updateMatrixWorld();

      subcamera.projectionMatrix.elements[8] = -2 * offsetAlongBaseline /
          (2 * distanceToTarget *
           Math.tan(0.5 * THREE.Math.degToRad(subcamera.fov)) *
           subcamera.aspect);
    }
  }

  lookAt(targetPosition) {
    super.lookAt(targetPosition);
    this.target.copy(targetPosition);
  }
}

/*!
 * fullscreen-polyfill
 * 1.0.2 - 5/23/2018
 * https://github.com/nguyenj/fullscreen-polyfill#readme
 * (c) John Nguyen; MIT License
 */
var FullscreenPolyfill=function(){var l=["fullscreen","fullscreenEnabled","fullscreenElement","fullscreenchange","fullscreenerror","exitFullscreen","requestFullscreen"],e=["webkitIsFullScreen","webkitFullscreenEnabled","webkitFullscreenElement","webkitfullscreenchange","webkitfullscreenerror","webkitExitFullscreen","webkitRequestFullscreen"],n=["mozFullScreen","mozFullScreenEnabled","mozFullScreenElement","mozfullscreenchange","mozfullscreenerror","mozCancelFullScreen","mozRequestFullScreen"],u=["","msFullscreenEnabled","msFullscreenElement","MSFullscreenChange","MSFullscreenError","msExitFullscreen","msRequestFullscreen"];document||(document={});var t,c=(t=[l[1],e[1],n[1],u[1]].find(function(e){return document[e]}),[l,e,n,u].find(function(e){return e.find(function(e){return e===t})})||[]);function r(e,n){document[l[0]]=document[c[0]]||!!document[c[2]]||!1,document[l[1]]=document[c[1]]||!1,document[l[2]]=document[c[2]]||null,document.dispatchEvent(new Event(e),n.target);}return document[l[1]]?{}:(document[l[0]]=document[c[0]]||!!document[c[2]]||!1,document[l[1]]=document[c[1]]||!1,document[l[2]]=document[c[2]]||null,document.addEventListener(c[3],r.bind(document,l[3]),!1),document.addEventListener(c[4],r.bind(document,l[4]),!1),document[l[5]]=function(){return document[c[5]]()},void(Element.prototype[l[6]]=function(){return this[c[6]].apply(this,arguments)}))}();

class FullscreenHelper {
  constructor(renderer) {
    this.renderer = renderer;

    this.lkgDevice = null;
    getFirstDevice().then((d) => {
      this.lkgDevice = d;

      const startOnLkg = this.isOnLkg();
      if (startOnLkg) {
        this.renderer.render2d = false;
        this.moveWarning.style.display = 'none';
      } else {
        this.renderer.render2d = true;
        this.moveWarning.style.display = '';
      }

      requestAnimationFrame(this.update.bind(this));
    });

    this.onLkg = null;

    this.moveWarning = this.makeMoveWarning();
    document.body.appendChild(this.moveWarning);

    this.fullscreenButton = this.makeFullscreenButton();
    document.body.appendChild(this.fullscreenButton);
  }

  isOnLkg() {
    const sameResolution =
        window.screen.width == this.lkgDevice.calibration.screenW.value &&
        window.screen.height == this.lkgDevice.calibration.screenH.value;
    const sameScreenPos =
        window.screen.availLeft == this.lkgDevice.windowCoords[0];
    return sameResolution && sameScreenPos;
  }

  update() {
    requestAnimationFrame(this.update.bind(this));

    const nowOnLkg = this.isOnLkg();
    if (nowOnLkg && !this.onLkg) {
      // just moved to lkg
      this.renderer.render2d = false;
      this.moveWarning.style.display = 'none';
    } else if (!nowOnLkg && this.onLkg) {
      // just moved OFF lkg
      this.renderer.render2d = true;
      this.moveWarning.style.display = '';
    }
    this.onLkg = nowOnLkg;

    if (this.onLkg && !document.fullscreen) {
      if (document.hasFocus()) {
        this.fullscreenButton.innerText = 'click to go fullscreen';
      } else {
        this.fullscreenButton.innerText = 'click to focus window';
      }
      this.fullscreenButton.style.display = '';
    } else {
      this.fullscreenButton.style.display = 'none';
    }
  }

  makeMoveWarning() {
    const moveWarning = document.createElement('div');
    moveWarning.innerText = 'drag this window to the Looking Glass';
    moveWarning.style.cssText = `
      background: white;
      border-radius: 8px;
      bottom: 0px;
      display: none;
      font-family: sans-serif;
      font-size: 6em;
      left: 0px;
      margin: 16px;
      opacity: 0.5;
      padding: 8px;
      position: absolute;
      z-index: ${Number.MAX_SAFE_INTEGER};
    `;
    return moveWarning;
  }

  makeFullscreenButton() {
    const fullscreenButton = document.createElement('div');
    fullscreenButton.innerText = 'go fullscreen';
    fullscreenButton.style.cssText = `
      background: white;
      border-radius: 8px;
      bottom: 0px;
      display: none;
      font-family: sans-serif;
      font-size: 6em;
      font-weight: bold;
      left: 0px;
      margin: 16px;
      opacity: 0.75;
      padding: 8px;
      pointer-events: none;
      position: absolute;
      z-index: ${Number.MAX_SAFE_INTEGER};
    `;
    window.addEventListener('click', () => {
      this.renderer.domElement.requestFullscreen();
    });
    return fullscreenButton;
  }
}

class Renderer {
  constructor(opt_options) {
    this.enforceMandatoryDocumentStyle();

    let options = opt_options || {};

    this.quiltResolution = options.quiltResolution || 4096;
    this.tileCount = options.tileCount || new THREE.Vector2(5, 9);

    this.render2d = options.render2d || false;
    this.renderQuilt = options.render2d || false;

    this.fullscreenHelper = null;
    if (!options.disableFullscreenUi) {
      this.fullscreenHelper = new FullscreenHelper(this);
    }

    this.webglRenderer = new THREE.WebGLRenderer();

    this.domElement = this.webglRenderer.domElement;

    this.quiltRenderTarget = new THREE.WebGLRenderTarget(
        this.quiltResolution, this.quiltResolution, {format: THREE.RGBFormat});

    this.quiltRenderer = new QuiltRenderer(this.tileCount, this.webglRenderer);
    this.quiltRenderer.setQuiltTexture(this.quiltRenderTarget.texture);

    if (!options.quiltResolution) {
      getIdealQuiltResolution().then((res) => {
        this.quiltResolution = res;
      });
    }

    if (!options.tileCount) {
      getIdealQuiltTileCount().then((count) => {
        this.tileCount.copy(count);
      });
    }

    this.debug2dCamera = new THREE.PerspectiveCamera();
    getIdealFov().then((fov) => {
      this.debug2dCamera.fov = fov;
      this.debug2dCamera.updateProjectionMatrix();
    });
  }

  enforceMandatoryDocumentStyle() {
    document.body.style.margin = '0px';
    document.body.style.overflow = 'hidden';
  }

  render(scene, camera) {
    this.enforceMandatoryDocumentStyle();

    if (this.render2d) {
      this.debug2dCamera.position.copy(camera.position);
      this.debug2dCamera.rotation.copy(camera.rotation);

      const aspect = window.innerWidth / window.innerHeight;
      if (aspect != this.debug2dCamera.aspect) {
        this.debug2dCamera.aspect = aspect;
        this.debug2dCamera.updateProjectionMatrix();
      }

      this.webglRenderer.domElement.style.top =
          this.webglRenderer.domElement.style.left = '0px';
      this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
      this.webglRenderer.render(scene, this.debug2dCamera);
    } else if (this.renderQuilt) {
      camera.update(this.quiltResolution, this.tileCount);

      const minWindowDimension =
          Math.min(window.innerWidth, window.innerHeight);
      this.webglRenderer.domElement.style.width =
          this.webglRenderer.domElement.style.height =
              `${minWindowDimension}px`;
      this.webglRenderer.domElement.style.top =
          this.webglRenderer.domElement.style.left = '0px';

      this.webglRenderer.setRenderTarget(null);
      this.webglRenderer.setSize(
          this.quiltResolution, this.quiltResolution, false);
      this.webglRenderer.render(scene, camera);
    } else {
      this.quiltRenderTarget.setSize(
          this.quiltResolution, this.quiltResolution);

      camera.update(this.quiltResolution, this.tileCount);
      this.webglRenderer.setRenderTarget(this.quiltRenderTarget);
      this.webglRenderer.setSize(
          this.quiltResolution, this.quiltResolution, false);
      this.webglRenderer.render(scene, camera);

      this.webglRenderer.setRenderTarget(null);
      this.quiltRenderer.update(this.quiltResolution, this.tileCount);
      this.quiltRenderer.render();
    }
  }
}

export { Buttons, calibration as Calibration, Camera, FullscreenHelper, QuiltRenderer, Renderer, detectDevice };
