var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// ../deps/ecashaddr/package/dist/validation.js
var require_validation = __commonJS({
  "../deps/ecashaddr/package/dist/validation.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValidationError = class _ValidationError extends Error {
      constructor(message) {
        super(message);
        this.name = "ValidationError";
        Object.setPrototypeOf(this, _ValidationError.prototype);
      }
    };
    function validate(condition, message) {
      if (!condition) {
        throw new ValidationError(message);
      }
    }
    exports.default = {
      ValidationError,
      validate
    };
  }
});

// ../deps/ecashaddr/package/dist/base32.js
var require_base32 = __commonJS({
  "../deps/ecashaddr/package/dist/base32.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHARSET = void 0;
    var validation_1 = __importDefault(require_validation());
    var { validate } = validation_1.default;
    exports.CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    var CHARSET_INVERSE_INDEX = {
      q: 0,
      p: 1,
      z: 2,
      r: 3,
      y: 4,
      9: 5,
      x: 6,
      8: 7,
      g: 8,
      f: 9,
      2: 10,
      t: 11,
      v: 12,
      d: 13,
      w: 14,
      0: 15,
      s: 16,
      3: 17,
      j: 18,
      n: 19,
      5: 20,
      4: 21,
      k: 22,
      h: 23,
      c: 24,
      e: 25,
      6: 26,
      m: 27,
      u: 28,
      a: 29,
      7: 30,
      l: 31
    };
    function encode(data) {
      validate(data instanceof Uint8Array, "Invalid data: " + data + ".");
      let base32 = "";
      for (let i = 0; i < data.length; ++i) {
        const value = data[i];
        validate(0 <= value && value < 32, "Invalid value: " + value + ".");
        base32 += exports.CHARSET[value];
      }
      return base32;
    }
    function decode(string) {
      validate(typeof string === "string", "Invalid base32-encoded string: " + string + ".");
      const data = new Uint8Array(string.length);
      for (let i = 0; i < string.length; ++i) {
        const value = string[i];
        validate(value in CHARSET_INVERSE_INDEX, "Invalid value: " + value + ".");
        data[i] = CHARSET_INVERSE_INDEX[value];
      }
      return data;
    }
    exports.default = {
      encode,
      decode
    };
  }
});

// ../deps/ecashaddr/package/dist/convertBits.js
var require_convertBits = __commonJS({
  "../deps/ecashaddr/package/dist/convertBits.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = default_1;
    var validation_1 = __importDefault(require_validation());
    var { validate } = validation_1.default;
    function default_1(data, from, to, strictMode = false) {
      const length = strictMode ? Math.floor(data.length * from / to) : Math.ceil(data.length * from / to);
      const mask = (1 << to) - 1;
      const result = new Uint8Array(length);
      let index = 0;
      let accumulator = 0;
      let bits = 0;
      for (let i = 0; i < data.length; ++i) {
        const value = data[i];
        validate(0 <= value && value >> from === 0, "Invalid value: " + value + ".");
        accumulator = accumulator << from | value;
        bits += from;
        while (bits >= to) {
          bits -= to;
          result[index] = accumulator >> bits & mask;
          ++index;
        }
      }
      if (!strictMode) {
        if (bits > 0) {
          result[index] = accumulator << to - bits & mask;
          ++index;
        }
      } else {
        validate(bits < from && (accumulator << to - bits & mask) === 0, "Input cannot be converted to " + to + " bits without padding, but strict mode was used.");
      }
      return result;
    }
  }
});

// ../deps/ecashaddr/package/dist/cashaddr.js
var require_cashaddr = __commonJS({
  "../deps/ecashaddr/package/dist/cashaddr.js"(exports) {
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getOutputScriptFromTypeAndHash = exports.VALID_PREFIXES = void 0;
    exports.encodeCashAddress = encodeCashAddress;
    exports.decodeCashAddress = decodeCashAddress;
    exports.uint8arrayToHexString = uint8arrayToHexString;
    exports.getTypeAndHashFromOutputScript = getTypeAndHashFromOutputScript;
    exports.encodeOutputScript = encodeOutputScript;
    exports.isValidCashAddress = isValidCashAddress;
    exports.getOutputScriptFromAddress = getOutputScriptFromAddress;
    var base32_1 = __importDefault(require_base32());
    var convertBits_1 = __importDefault(require_convertBits());
    var validation_1 = __importDefault(require_validation());
    var { validate, ValidationError } = validation_1.default;
    var CHECKSUM_SIZE = 8;
    var HASH160_SIZE = 20;
    var HEX_REGEX = /^[0-9a-fA-F]+$/;
    function encodeCashAddress(prefix, type, hash) {
      validate(typeof prefix === "string" && isValidPrefix(prefix), "Invalid prefix: " + prefix + ".");
      validate(type === "p2pkh" || type === "p2sh", "Invalid type: " + type + ".");
      validate(hash instanceof Uint8Array || typeof hash === "string", "Invalid hash: " + hash + ". Must be string or Uint8Array.");
      if (typeof hash === "string") {
        hash = stringToUint8Array(hash);
      }
      const prefixData = concat(prefixToUint5Array(prefix), new Uint8Array(1));
      const versionByte = getTypeBits(type) + getHashSizeBits(hash);
      const payloadData = toUint5Array(concat(new Uint8Array([versionByte]), hash));
      const checksumData = concat(concat(prefixData, payloadData), new Uint8Array(CHECKSUM_SIZE));
      const payload = concat(payloadData, checksumToUint5Array(polymod(checksumData)));
      return prefix + ":" + base32_1.default.encode(payload);
    }
    function decodeCashAddress(address) {
      validate(typeof address === "string" && hasSingleCase(address), "Invalid address: " + address + ".");
      const pieces = address.toLowerCase().split(":");
      let prefix, payload;
      if (pieces.length === 1) {
        const prefixlessPayload = base32_1.default.decode(pieces[0]);
        validate(prefixlessPayload.length >= CHECKSUM_SIZE, `Prefixless address ${address} does not have valid checksum for any valid prefix (${exports.VALID_PREFIXES.join(", ")})`);
        let hasValidChecksum = false;
        for (let i = 0; i < exports.VALID_PREFIXES.length; i += 1) {
          const testedPrefix = exports.VALID_PREFIXES[i];
          hasValidChecksum = validChecksum(testedPrefix, prefixlessPayload);
          if (hasValidChecksum) {
            prefix = testedPrefix;
            payload = prefixlessPayload;
            break;
          }
        }
        validate(hasValidChecksum, `Prefixless address ${address} does not have valid checksum for any valid prefix (${exports.VALID_PREFIXES.join(", ")})`);
      } else {
        validate(pieces.length === 2, "Invalid address: " + address + ".");
        prefix = pieces[0];
        payload = base32_1.default.decode(pieces[1]);
        validate(payload.length >= CHECKSUM_SIZE, "Invalid checksum: " + address + ".");
        validate(validChecksum(prefix, payload), "Invalid checksum: " + address + ".");
      }
      const payloadWithoutChecksum = payload.subarray(0, -CHECKSUM_SIZE);
      validate(payloadWithoutChecksum.length * 5 >= 8, "Invalid payload: " + address + ".");
      const payloadData = fromUint5Array(payloadWithoutChecksum);
      validate(payloadData.length > 0, "Invalid payload: " + address + ".");
      const versionByte = payloadData[0];
      validate((versionByte & 128) === 0, "Invalid version byte: " + address + ".");
      const hash = payloadData.subarray(1);
      validate(getHashSize(versionByte) === hash.length * 8, "Invalid hash size: " + address + ".");
      const type = getType(versionByte);
      return {
        prefix,
        type,
        hash: uint8arrayToHexString(hash)
      };
    }
    exports.VALID_PREFIXES = [
      "ecash",
      "bitcoincash",
      "simpleledger",
      "etoken",
      "ectest",
      "ecregtest"
    ];
    function isValidPrefix(prefix) {
      return hasSingleCase(prefix) && !prefix.includes(" ");
    }
    function prefixToUint5Array(prefix) {
      const result = new Uint8Array(prefix.length);
      for (let i = 0; i < prefix.length; ++i) {
        result[i] = prefix[i].charCodeAt(0) & 31;
      }
      return result;
    }
    function checksumToUint5Array(checksum) {
      const result = new Uint8Array(CHECKSUM_SIZE);
      for (let i = 0; i < CHECKSUM_SIZE; ++i) {
        result[CHECKSUM_SIZE - 1 - i] = Number(checksum & 31n);
        checksum >>= 5n;
      }
      return result;
    }
    function getTypeBits(type) {
      switch (type) {
        case "p2pkh":
          return 0;
        case "p2sh":
          return 8;
        default:
          throw new ValidationError("Invalid type: " + type + ".");
      }
    }
    function getType(versionByte) {
      switch (versionByte & 120) {
        case 0:
          return "p2pkh";
        case 8:
          return "p2sh";
        default:
          throw new ValidationError("Invalid address type in version byte: " + versionByte + ".");
      }
    }
    function getHashSizeBits(hash) {
      switch (hash.length * 8) {
        case 160:
          return 0;
        case 192:
          return 1;
        case 224:
          return 2;
        case 256:
          return 3;
        case 320:
          return 4;
        case 384:
          return 5;
        case 448:
          return 6;
        case 512:
          return 7;
        default:
          throw new ValidationError("Invalid hash size: " + hash.length + ".");
      }
    }
    function getHashSize(versionByte) {
      switch (versionByte & 7) {
        case 0:
          return 160;
        case 1:
          return 192;
        case 2:
          return 224;
        case 3:
          return 256;
        case 4:
          return 320;
        case 5:
          return 384;
        case 6:
          return 448;
        case 7:
          return 512;
        default:
          throw new Error("Invalid input");
      }
    }
    function toUint5Array(data) {
      return (0, convertBits_1.default)(data, 8, 5);
    }
    function fromUint5Array(data) {
      return (0, convertBits_1.default)(data, 5, 8, true);
    }
    function concat(a, b) {
      const ab = new Uint8Array(a.length + b.length);
      ab.set(a);
      ab.set(b, a.length);
      return ab;
    }
    function polymod(data) {
      const GENERATOR = [
        BigInt("0x98f2bc8e61"),
        BigInt("0x79b76d99e2"),
        BigInt("0xf33e5fb3c4"),
        BigInt("0xae2eabe2a8"),
        BigInt("0x1e4f43e470")
      ];
      let checksum = 1n;
      for (let i = 0; i < data.length; i += 1) {
        const value = BigInt(data[i]);
        const topBits = checksum >> 35n;
        checksum = (checksum & 0x07ffffffffn) << 5n ^ value;
        for (let j = 0; j < GENERATOR.length; ++j) {
          if (topBits >> BigInt(j) & 1n) {
            checksum ^= GENERATOR[j];
          }
        }
      }
      return checksum ^ 1n;
    }
    function validChecksum(prefix, payload) {
      const prefixData = concat(prefixToUint5Array(prefix), new Uint8Array(1));
      const checksumData = concat(prefixData, payload);
      return polymod(checksumData) === 0n;
    }
    function hasSingleCase(string) {
      return string === string.toLowerCase() || string === string.toUpperCase();
    }
    function stringToUint8Array(string) {
      validate(string.length % 2 === 0, "Invalid hash: " + string + ". Must be an even-length hex string.");
      validate(HEX_REGEX.test(string), "Invalid hash: " + string + ". Must be a valid hex string.");
      const array = new Uint8Array(string.length / 2);
      for (let i = 0; i < string.length; i += 2) {
        array[i / 2] = parseInt(string.slice(i, i + 2), 16);
      }
      return array;
    }
    function uint8arrayToHexString(uint8Array) {
      let hexString = "";
      for (let i = 0; i < uint8Array.length; i++) {
        let hex = uint8Array[i].toString(16);
        hex = hex.length === 1 ? "0" + hex : hex;
        hexString += hex;
      }
      return hexString;
    }
    function getTypeAndHashFromOutputScript(outputScript) {
      const p2pkhPrefix = "76a914";
      const p2pkhSuffix = "88ac";
      const p2shPrefix = "a914";
      const p2shSuffix = "87";
      let hash, type;
      if (outputScript.slice(0, p2pkhPrefix.length) === p2pkhPrefix && outputScript.slice(-1 * p2pkhSuffix.length) === p2pkhSuffix) {
        type = "p2pkh";
        hash = outputScript.substring(outputScript.indexOf(p2pkhPrefix) + p2pkhPrefix.length, outputScript.lastIndexOf(p2pkhSuffix));
      } else if (outputScript.slice(0, p2shPrefix.length) === p2shPrefix && outputScript.slice(-1 * p2shSuffix.length) === p2shSuffix) {
        type = "p2sh";
        hash = outputScript.substring(outputScript.indexOf(p2shPrefix) + p2shPrefix.length, outputScript.lastIndexOf(p2shSuffix));
      } else {
        throw new ValidationError("Unsupported outputScript: " + outputScript);
      }
      if (hash.length !== HASH160_SIZE * 2 || !HEX_REGEX.test(hash)) {
        throw new ValidationError("Invalid hash size in outputScript: " + outputScript);
      }
      return { type, hash };
    }
    var getOutputScriptFromTypeAndHash = (type, hash) => {
      validate(type === "p2pkh" || type === "p2sh", "Invalid type: " + type + ".");
      validate(typeof hash === "string" && hash.length === HASH160_SIZE * 2 && HEX_REGEX.test(hash), "Invalid hash: " + hash + ". Must be a " + HASH160_SIZE * 2 + "-character hex string.");
      let outputScript;
      if (type === "p2pkh") {
        outputScript = `76a914${hash}88ac`;
      } else {
        outputScript = `a914${hash}87`;
      }
      return outputScript;
    };
    exports.getOutputScriptFromTypeAndHash = getOutputScriptFromTypeAndHash;
    function encodeOutputScript(outputScript, prefix = "ecash") {
      const { type, hash } = getTypeAndHashFromOutputScript(outputScript);
      return encodeCashAddress(prefix, type, hash);
    }
    function isValidCashAddress(cashaddress, optionalPrefix = false) {
      try {
        const { prefix, hash } = decodeCashAddress(cashaddress);
        if (hash.length !== HASH160_SIZE * 2) {
          return false;
        }
        if (optionalPrefix) {
          return prefix === optionalPrefix;
        }
        return true;
      } catch {
        return false;
      }
    }
    function getOutputScriptFromAddress(address) {
      const { type, hash } = decodeCashAddress(address);
      return (0, exports.getOutputScriptFromTypeAndHash)(type, hash);
    }
  }
});
export default require_cashaddr();
