var quote = require('../');
var concat = require('concat-stream');
var test = require('tape');

test('js string unicode separators', function (t) {
    t.plan(1);
    var q = quote();
    q.end('beep\u2028ima\u2029jeep');

    q.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), '"beep\\u2028ima\\u2029jeep"');
    }));
});

test('utf8 separators', function (t) {
    t.plan(1);
    var q = quote();
    q.end(Buffer('beep\u2028ima\u2029jeep', 'utf8'));

    q.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), '"beep\\u2028ima\\u2029jeep"');
    }));
});

test('utf16le separators', function (t) {
    t.plan(1);
    var q = quote();
    q.end(Buffer('beep\u2028ima\u2029jeep', 'utf16le'));

    q.pipe(concat(function (body) {
        console.log(body);
        t.equal(body.toString('utf16le'), '"beep\\u2028ima\\u2029jeep"');
    }));
});

test('ucs2 separators', function (t) {
    t.plan(1);
    var q = quote();
    q.end(Buffer('beep\u2028ima\u2029jeep', 'ucs2'));

    q.pipe(concat(function (body) {
        t.equal(body.toString('ucs2'), '"beep\\u2028ima\\u2029jeep"');
    }));
});
