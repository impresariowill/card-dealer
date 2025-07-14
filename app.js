var sslsettings = {};
var debug = true;
var corsorigin = '*';
if (typeof process != 'undefined' && process.argv) for (let i = 0; i < process.argv.length; i++) {
	let m = null;
	if (process.argv[i].match(/^debug=no$/)) {debug = false;}
	else if (m = process.argv[i].match(/^ssl(key|cert|ca|passphrase)file=(.+?)$/)) sslsettings[m[1]+'file'] = m[2];
	else if (m = process.argv[i].match(/^corsorigin=(.+?)$/)) corsorigin = m[1].split(',');
}

var port = 6954;
var sslport = 6958;

var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http, {
	cors:{
		origin: corsorigin=='*'?corsorigin:corsorigin.concat(corsorigin.map(item=>item+':'+port)),
	}
});
var https = require('https');
var io0 = require('socket.io');
var tls = require('tls');
var fs = require('fs');


function logm (){
	if (debug) console.log.apply(null,arguments);
}

logm ('cors origin:', corsorigin instanceof Array?corsorigin.join(', '):corsorigin); 


app.get('/', function(req, res){
	res.write (`<!DOCTYPE HTML>
<html>
<body>
<script src="/socket.io/socket.io.js"></script>
<script>
	var socket = io();
	socket.on('message', function(e) {
		console.log('message',e);
	})
</script>
This is for socket loading
		</body></html>`);
	res.end();
});

app.use (express.static('public'));

var rooms = {};
function findRoom (socket) {
	for (let k in rooms) {
		for (let i = 0; i < rooms[k].sockets.length; i++) {
			if (rooms[k].sockets[i]==socket) return [k, i];
		}
	}
	return null;
}
function printRoom () {
	for (let k in rooms) {
		let s = [];
		s.push ('Room '+k+' :');
		for (let i = 0; i < rooms[k].sockets.length; i++) s.push (rooms[k].sockets[i].id+', ');
		logm (s.join(''));
	}
}

var socketconnfunc = null;
io.on('connection', socketconnfunc = function(socket){
	logm('a user connected');
	socket.emit('message', {'text':'welcome'});
	socket.on('message',function(e) {
		if (e && typeof e == 'object') {
			let content = e.content || e;
			if (e.msgtype == 'request' && e.cmd == 'hostroom') {
				let r = null;
				if (content.roomnum && !rooms[content.roomnum]) r = content.roomnum;
				else do {
					let r1 = Math.floor(Math.random() * 10000);
					if (!rooms[r1]) {r = r1; break;}
				} while (true);
				rooms[r] = {
					'id':r,
					'sockets':[socket]
				};
				socket.emit('message',{'msgtype':'response', 'cmd':'hostroom', 'result':true, 'roomnum':r});
			} else if (e.msgtype == 'request' && e.cmd == 'joinroom' && content.roomnum) {
				let roomnum = content.roomnum;
				if (rooms[roomnum]) {
					for (let i = 0; i < rooms[roomnum].sockets.length; i++) {
						rooms[roomnum].sockets[i].emit('message', {'msgtype':'notice', 'cmd':'playerjoined', 'playerid':socket.id});
					}
					rooms[roomnum].sockets.push (socket);
					socket.emit('message',{'msgtype':'response', 'cmd':'joinroom', 'result':true, 'roomnum':roomnum, 'hostid':rooms[roomnum].sockets[0].id});
				} else {
					socket.emit('message',{'msgtype':'response', 'cmd':'joinroom', 'result':false, 'roomnum':e.roomnum});
				}
			} else if (e.msgtype == 'request' && e.cmd == 'quitroom' && content.roomnum) {
				let r = content.roomnum;
				if (rooms[r]) for (let i = 0; i < rooms[r].sockets.length; i++) {
					if (rooms[r].sockets[i] == socket) {
						rooms[r].sockets.splice(i,1);
						for (let j = 0; j < rooms[r].sockets.length; j++) {
							rooms[r].sockets[j].emit('message',{'msgtype':'notice', 'cmd':'playerquitted', 'playerid':socket.id, 'hostid':rooms[r].sockets[0].id});
						}
						break;
					}
				}
				socket.emit('message',{'msgtype':'response', 'cmd':'roomquitted', 'result':true, 'roomnum':r});
			} else if (e.msgtype == 'request' && e.cmd == 'reconnectroom' && content.roomnum) {
				let r = content.roomnum;
				if (rooms[r]) {
					for (let i = 0; i < rooms[r].sockets.length; i++) {
						rooms[r].sockets[i].emit('message', {'msgtype':'notice', 'cmd':'playerjoined', 'playerid':socket.id});
					}
					rooms[r].sockets.push (socket);
					socket.emit('message',{'msgtype':'response', 'cmd':'reconnectroom', 'result':true, 'roomnum':r, 'hostid':rooms[r].sockets[0].id});
				} else {
					rooms[r] = {'id':r, 'sockets':[socket]};
					socket.emit('message', {'msgtype':'response', 'cmd':'reconnectroom', 'result':true, 'roomnum':r, 'hosted':true});
				}

			} else if (e.msgtype == 'request' && e.cmd == 'broadcast' && e.content) {
				let r = findRoom(socket);
				if (r) for (let i = 0; i < rooms[r[0]].sockets.length; i++) {
					if (i == r[1]) continue;
					rooms[r[0]].sockets[i].emit('message',{'msgtype':'playermsg', 'sender':socket.id, 'isbroadcast':true, 'content':e.content});
				}
			} else if (e.msgtype == 'request' && e.cmd == 'pm' && e.content && e.recipient) {
				let r = findRoom(socket);
				if (r) for (let i = 0; i < rooms[r[0]].sockets.length; i++) {
					if (rooms[r[0]].sockets[i].id == e.recipient) rooms[r[0]].sockets[i].emit('message',{'msgtype':'playermsg', 'sender':socket.id, 'content':e.content});
				}
			}
		}
		logm('message:',e.msgtype, e.cmd);
		printRoom();
	})
	socket.on('disconnect',function() {
		logm('a user disconnected');
		let r = findRoom(socket);
		if (!r || !rooms[r[0]].sockets) return;
		rooms[r[0]].sockets.splice(r[1],1);
		for (let i = 0; i < rooms[r[0]].sockets.length; i++) rooms[r[0]].sockets[i].emit('message',{'msgtype':'notice', 'cmd':'playerquitted', 'playerid':socket.id, 'hostid':rooms[r[0]].sockets[0].id});
		if (rooms[r[0]].sockets.length == 0) delete rooms[r[0]];
		printRoom();
	});
});


http.listen(port, function(){
	logm('listening on *:'+port);
});


if (sslsettings.keyfile && sslsettings.certfile) try {
	let server_https = null;
	let c = {}, m = null;
	for (let k in sslsettings)
			if (m = k.match(/^(key|cert|ca|passphrase)file$/))
					c[m[1]] = fs.readFileSync(sslsettings[k]).toString();
	if (c['key'] && c['cert']) {
		let securecontext = tls.createSecureContext(c).context;
		c['SNICallback'] = function (domain, cb) {
				cb(null, securecontext);
		};
		server_https = https.createServer (c, app);
		let server_https_io = io0(server_https, {cors:{
			origin: corsorigin=='*'?corsorigin:corsorigin.concat(corsorigin.map(item=>item+':'+sslport)),
		}});
		server_https.listen (sslport, function () {
			logm ('ssl listening on *:' + sslport);
		});
		//let server_https_io = io0.listen(server_https);

		if (server_https_io) server_https_io.on ('connection', socketconnfunc);
	}
} catch (err) {
	logm (err);
}

