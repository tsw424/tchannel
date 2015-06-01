// Copyright (c) 2015 Uber Technologies, Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict';

var assert = require('assert');

var TChannel = require('../channel.js');
var EndpointHandler = require('../endpoint-handler.js');
var CountedReadySignal = require('ready-signal/counted');

var server = new TChannel({
    serviceName: 'server',
    handler: EndpointHandler()
});
var client = new TChannel();

// normal response
server.handler.register('func1', function (req, res) {
    console.log('func1 responding with a small delay:' + req.arg2.toString() + ' 2:' + req.arg3.toString());
    setTimeout(function() {
        res.sendOk('result', 'indeed it did');
    }, Math.random() * 1000);
});
// err response
server.handler.register('func2', function (req, res) {
    res.sendNotOk(null, 'it failed');
});

var ready = CountedReadySignal(2);
var listening = ready(function (err) {
    if (err) {
        throw err;
    }

    client.makeSubChannel({
        serviceName: 'server',
        peers: [server.hostPort]
    });

    client
        .request({serviceName: 'server'})
        .send('func1', "arg 1", "arg 2", function (err, res) {
            if (err) {
                done(err);
            } else {
                assert.equal(res.ok, true);
                console.log('normal res: ' + res.arg2.toString() + ' ' + res.arg3.toString());
                done();
            }
        });
    client
        .request({serviceName: 'server'})
        .send('func2', "arg 1", "arg 2", function (err, res) {
            if (err) {
                done(err);
            } else {
                assert.equal(res.ok, false);
                console.log('err res: ' + res.ok + ' message: ' + String(res.arg3));
            }
        });
});

function done(err) {
    server.close();
    client.close();
    if (err) {
        throw err;
    }
}

server.listen(4040, '127.0.0.1', ready.signal);
client.listen(4041, '127.0.0.1', ready.signal);
