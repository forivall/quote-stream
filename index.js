var through = require('through2');
var strings = {
    quote: '"',
    escapeQuote: '\\"',
    escapeEscape: '\\\\',
    escapeB: '\\b',
    escapeF: '\\f',
    escapeN: '\\n',
    escapeR: '\\r',
    escapeT: '\\t',
    escapeLineSeparator: '\\u2028',
    escapeParagraphSeparator: '\\u2029'
};

for (var i = 0; i < 32; i++) {
    var s = i.toString(16);
    strings[i] = '\\u' + Array(5-s.length).join('0') + s;
}

var codes = {
    quote: '"'.charCodeAt(0),
    escape: '\\'.charCodeAt(0),
    b: '\b'.charCodeAt(0),
    f: '\f'.charCodeAt(0),
    n: '\n'.charCodeAt(0),
    r: '\r'.charCodeAt(0),
    t: '\t'.charCodeAt(0)
};

var encodings = {
  'utf8': {
      increment: 1,
      buffers: {},
      multiBytes: {
          lineSeparator: Buffer('\u2028', 'utf8'),
          paragraphSeparator: Buffer('\u2029', 'utf8')
      },
      codeToLength: {},
      multiByteMap: [],
      map: {}
  },
  'utf16le': {
      increment: 2,
      buffers: {},
      multiBytes: {
          lineSeparator: Buffer('\u2028', 'utf16le'),
          paragraphSeparator: Buffer('\u2029', 'utf16le')
      },
      codeToLength: {},
      multiByteMap: [],
      map: {}
  }
}
for (var k in strings) {
  encodings['utf8'].buffers[k] = Buffer(strings[k]);
  encodings['utf16le'].buffers[k] = Buffer(strings[k], 'utf16le');
}

encodings['utf8'].codeToLength[encodings['utf8'].multiBytes.lineSeparator[0]] = encodings['utf8'].multiBytes.lineSeparator.length;
// first byte is the same in utf8, so paragraphSeparator isn't needed
encodings['utf16le'].codeToLength[encodings['utf16le'].multiBytes.lineSeparator[0]] = encodings['utf16le'].multiBytes.lineSeparator.length;
encodings['utf16le'].codeToLength[encodings['utf16le'].multiBytes.paragraphSeparator[0]] = encodings['utf16le'].multiBytes.paragraphSeparator.length;

encodings['utf8'].multiByteMap.push({ k: encodings['utf8'].multiBytes.lineSeparator, v: Buffer(strings.escapeLineSeparator, 'utf8') });
encodings['utf8'].multiByteMap.push({ k: encodings['utf8'].multiBytes.paragraphSeparator, v: Buffer(strings.escapeParagraphSeparator, 'utf8') });
encodings['utf16le'].multiByteMap.push({ k: encodings['utf16le'].multiBytes.lineSeparator, v: Buffer(strings.escapeLineSeparator, 'utf16le') });
encodings['utf16le'].multiByteMap.push({ k: encodings['utf16le'].multiBytes.paragraphSeparator, v: Buffer(strings.escapeParagraphSeparator, 'utf16le') });

encodings['utf8'].map[codes.quote] = encodings['utf8'].buffers.escapeQuote;
encodings['utf8'].map[codes.escape] = encodings['utf8'].buffers.escapeEscape;
encodings['utf8'].map[codes.b] = encodings['utf8'].buffers.escapeB;
encodings['utf8'].map[codes.f] = encodings['utf8'].buffers.escapeF;
encodings['utf8'].map[codes.n] = encodings['utf8'].buffers.escapeN;
encodings['utf8'].map[codes.r] = encodings['utf8'].buffers.escapeR;
encodings['utf8'].map[codes.t] = encodings['utf8'].buffers.escapeT;

encodings['utf16le'].map[codes.quote] = encodings['utf8'].buffers.escapeQuote;
encodings['utf16le'].map[codes.escape] = encodings['utf8'].buffers.escapeEscape;
encodings['utf16le'].map[codes.b] = encodings['utf8'].buffers.escapeB;
encodings['utf16le'].map[codes.f] = encodings['utf8'].buffers.escapeF;
encodings['utf16le'].map[codes.n] = encodings['utf8'].buffers.escapeN;
encodings['utf16le'].map[codes.r] = encodings['utf8'].buffers.escapeR;
encodings['utf16le'].map[codes.t] = encodings['utf8'].buffers.escapeT;

encodings['ucs2'] = encodings['utf16le'];
encodings['default'] = encodings['utf8'];

module.exports = function () {
    var stream = through(write, end);
    var firstEncoding;
    return stream;

    function write (buf, enc, next) {
        if (!firstEncoding) {
          firstEncoding = enc || 'utf8';
          stream.push((encodings[firstEncoding] || encodings['default']).buffers.quote);
        }
        var offset = 0;
        var encoding = encodings[enc || 'utf8'] || encodings['default'];
        var inc = encoding.increment;
        for (var i = 0; i < buf.length; i += inc) {
            var c = buf[i];
            var m = encoding.map[c];

            if (m) {
                var bufs = [ buf.slice(offset, i + inc - 1), m ];
                this.push(Buffer.concat(bufs));
                offset = i + inc;
            }
            else if (c < 32) {
                var bufs = [ buf.slice(offset, i + inc - 1), encoding.buffers[c] ];
                this.push(Buffer.concat(bufs));
                offset = i + inc;
            }
            else if (encoding) {
                var l = encoding.codeToLength[c];
                if (l) {
                    var codeBuf = buf.slice(i, i + l);
                    for (var map_i = 0; map_i < encoding.map.length; map_i++) {
                        var map_pair = encoding.map[map_i];
                        if (codeBuf.equals(map_pair.k)) {
                            var bufs = [ buf.slice(offset, i), map_pair.v ];
                            this.push(Buffer.concat(bufs));
                            offset = i + l;
                            i += l - inc
                            break;
                        }
                    }
                }
            }
        }
        if (offset === 0) this.push(buf)
        else this.push(buf.slice(offset));
        next();
    }
    function end (next) {
        if (!firstEncoding) {
          firstEncoding = enc || 'utf8';
          stream.push((encodings[firstEncoding] || encodings['default']).buffers.quote);
        }
        stream.push((encodings[firstEncoding] || encodings['default']).buffers.quote);
        this.push(null);
    }
};
