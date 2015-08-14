var through = require('through2');
var buffers = {
    quote: Buffer('"'),
    escapeQuote: Buffer('\\"'),
    escapeEscape: Buffer('\\\\'),
    escapeB: Buffer('\\b'),
    escapeF: Buffer('\\f'),
    escapeN: Buffer('\\n'),
    escapeR: Buffer('\\r'),
    escapeT: Buffer('\\t'),
    escapeLineSeparator: Buffer('\\u2028'),
    escapeParagraphSeparator: Buffer('\\u2029')
};

for (var i = 0; i < 32; i++) {
    var s = i.toString(16);
    buffers[i] = Buffer('\\u' + Array(5-s.length).join('0') + s);
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

var multiByte = {
  'utf8': {
      buffer: {
          lineSeparator: Buffer('\u2028', 'utf8'),
          paragraphSeparator: Buffer('\u2029', 'utf8')
      },
      codeToLength: {},
      map: []
  }
}

multiByte['utf8'].codeToLength[multiByte['utf8'].buffer.lineSeparator[0]] = multiByte['utf8'].buffer.lineSeparator.length;
// first byte is the same in utf8, so paragraphSeparator isn't needed

multiByte['utf8'].map.push({ k: multiByte['utf8'].buffer.lineSeparator, v: buffers.escapeLineSeparator });
multiByte['utf8'].map.push({ k: multiByte['utf8'].buffer.paragraphSeparator, v: buffers.escapeParagraphSeparator });

multiByte['buffer'] = multiByte['utf8'];


var map = {};
map[codes.quote] = buffers.escapeQuote;
map[codes.escape] = buffers.escapeEscape;
map[codes.b] = buffers.escapeB;
map[codes.f] = buffers.escapeF;
map[codes.n] = buffers.escapeN;
map[codes.r] = buffers.escapeR;
map[codes.t] = buffers.escapeT;

module.exports = function () {
    var stream = through(write, end);
    stream.push(buffers.quote);
    return stream;
    
    function write (buf, enc, next) {
        var offset = 0;
        var encoding = multiByte[enc || 'utf8'];
        for (var i = 0; i < buf.length; i++) {
            var c = buf[i];
            var m = map[c];
            if (m) {
                var bufs = [ buf.slice(offset, i), m ];
                this.push(Buffer.concat(bufs));
                offset = i + 1;
            }
            else if (c < 32) {
                var bufs = [ buf.slice(offset, i), buffers[c] ];
                this.push(Buffer.concat(bufs));
                offset = i + 1;
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
                            i += l - 1
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
        this.push(buffers.quote);
        this.push(null);
    }
};
