
//===========
class GameControl {
	init(params) {
		if (params) for (let k in params) this[k] = params[k];
		var ctrl = this;
		if (this.io) {
			this.io.on('message', this.onIoMessage.bind(this));
			this.io.on('connect', this.onSocketConnect.bind(this));
			this.io.on('disconnect', this.onSocketDisconnect.bind(this));
		}
		if (this.store) this.store.subscribe(this.onstoremutation.bind(this));
	}
	constructor(params) {
		this.init(params);
	}
	onSocketConnect() {
		this.store.commit('setMyId', this.io.id);
		if (this.store.state.roominfo.roomnum) {
			this.reconnectRoom();
		}
	}
	onSocketDisconnect() {
		this.store.commit('setMyId',null);
	}
	onstoremutation (mutation, state) {
		let payload = mutation.payload || {};
		if (this.isInRoom() && payload.src != 'socketdata') {
			//console.log(mutation);
			if (mutation.type == 'setStatus') {
				let ops = payload.operations || payload;
				let op = ops instanceof Array?ops[0]:ops;
				if (op.stackid && op.field == "viewablebyplayer") {
					let changes = this.packStatusForSending(payload);
					this.sendMessage({'values':changes, 'cmd':'compstatusupdate'}, 'BROADCAST');
				}
			} else if (mutation.type == 'setPlayers') {
				this.sendMessage ({'cmd':'currentplayerlist', 'players':this.store.getters.getPlayers()}, 'BROADCAST');
			} else if (mutation.type == 'setComponentChildren') {
				let os = payload.operations || payload;
				let changedcardstacks = {}, changedtokenstacks = {};
				if (os instanceof Array) for (let i = 0; i < os.length; i++) {
					if (os[i].stackid && os[i].cards) changedcardstacks[os[i].stackid] = true;
					else if (os[i].stackid && os[i].tokens) changedtokenstacks[os[i].stackid] = true;
				}
				if (Object.keys(changedcardstacks).length > 0) {
					let scards = this.packStackItems({'targetstacks':changedcardstacks});
					this.sendMessage({'cards':scards, 'cmd':'cardlistupdate'}, 'BROADCAST');
				}
				if (Object.keys(changedtokenstacks).length > 0) {
					let scards = this.packStackItems({'targetstacks':changedtokenstacks, 'itemtype':'token'});
					this.sendMessage({'tokens':scards, 'cmd':'tokenlistupdate'}, 'BROADCAST');
				}				
			}
		}

	}
	sendMessage (data, recipient) {
console.log('SENDMESSAGE', data);		
		if (!this.io) return;
		if (recipient == 'BROADCAST') this.io.emit ('message', {'msgtype':'request', 'cmd':'broadcast', 'content':data});
		else {
			if (recipient == 'HOST') recipient = this.store.state.roominfo.hostid;
			this.io.emit('message', {'msgtype':'request', 'cmd':'pm', 'content':data, 'recipient':recipient});
		}
	}
	requestServer (cmd, prms) {
		if (!this.io) return;
		var msg = {};
		msg['msgtype'] = 'request';
		msg['cmd'] = cmd;
		if (prms) msg['content'] = prms;
		this.io.emit('message', msg);
	}
	reconnectRoom() {
		if (!this.store.state.roominfo.roomnum) return;
		var prms = {};
		prms.roomnum = this.store.state.roominfo.roomnum;
		console.log('recon', prms);;
		this.requestServer('reconnectroom', {'roomnum':prms.roomnum});
	}
	hostRoom (prms) {
		//prms: {name}
		if (prms && prms.name !== undefined) this.store.commit('setRoomInfo', {'myname':prms.name});
		this.requestServer('hostroom');
		//this.sendMessage ({'request':'hostroom'}, 'SERVER');
	}
	joinRoom (prms) {
		var rm = prms?prms.roomnum:null;
		if (!rm) {
			rm = prompt('Enter the room number');
		}
		if (prms && prms.name !== undefined) this.store.commit('setRoomInfo', {'myname':prms.name});
		this.requestServer('joinroom', {'roomnum':rm});
		//this.sendMessage ({'request':'joinroom', 'roomnum':rm}, 'SERVER');
	}
	getMyId () {
		if (!this.io) return null;
		return this.io.id;
	}
	iAmHost() {
		var myid = this.getMyId();
		return this.store.state.roominfo.hostid == myid && myid;
	}
	isInRoom () {
		return this.getMyId() && this.store.state.roominfo.roomnum?true:false;
	}
	onIoMessage (e) {
		//e: {response(str), notice(str), content(object), sender(str), playerid(int) , msgtype, cmd}
		console.log('INCOMINGMESSAGE',e);
		let myid = this.getMyId();
		if (typeof e == 'object' && e) {
			let data = e.content || e;
			if (e.msgtype == 'response') {
				if (e.cmd == 'hostroom') {
					if (data.result && data.roomnum) {
						this.store.commit('setRoomInfo', {roomnum:data.roomnum, hostid:myid, myplayeridx:0});
						this.updatePlayerList([{'id':this.getMyId(), 'name':this.store.state.roominfo.myname}]);
					} else {
						alert('Error hosting room');
					}
				} else if (e.cmd == 'joinroom') {
					if (data.result && data.roomnum) {
						this.store.commit('setRoomInfo', {roomnum:data.roomnum, hostid:data.hostid});
						this.sendMessage({'cmd':'requestjoinroom', 'myname':this.store.state.roominfo.myname, 'myid':myid, 'cardset':this.cardset}, 'BROADCAST');
					} else {
						alert('Error joining room');
					}
				} else if (e.cmd == 'reconnectroom') {
					if (data.result && data.roomnum) {
						if (data.hosted) {
							this.store.commit ('setRoomInfo', {hostid:myid});
							let players = cloneObject(this.store.getters.getPlayers());
							for (let i = 0; i < players.length; i++) {
								players[i]['id'] = i==this.store.state.roominfo.myplayeridx?myid:null;
								players[i]['name'] = i==this.store.state.roominfo.myplayeridx?this.store.state.roominfo.myname:null;
							}
							this.updatePlayerList(players);
						} else {
							this.store.commit('setRoomInfo', {hostid:data.hostid});
							this.sendMessage({'cmd':'requestjoinroom', 'myname':this.store.state.roominfo.myname, 'myid':myid, 'playerindex':this.store.state.roominfo.myplayeridx, 'cardset':this.cardset}, 'HOST');
						}
					} else {
						console.log('error reconnecting to room '+this.store.state.roominfo.roomnum);
						this.store.commit('setRoomInfo',{roomnum:null, hostid:null, myname:null, myplayeridx:null});
					}
				}
			} else if (e.msgtype == 'notice') {
				if (e.cmd == 'playerquitted') {
					if (data.hostid) this.store.commit('setRoomInfo', {hostid:data.hostid});
					if (this.iAmHost()) {
						let players = this.store.getters.getPlayers();
						for (let i = 0; i < players.length; i++) {
							if (players[i].id == e.playerid) {
								let o = cloneObject(players[i]); o.id = null; o.index = i;
								this.updatePlayerList(o);
								break;
							}
						}
						//this.sendMessage ({'cmd':'currentplayerlist', 'players':this.app.players}, 'BROADCAST');
					}
				}
			} else if (e.msgtype == 'playermsg') {
				this.handlePlayerMessage (data, e.sender);
			}
		}
	}
	updatePlayerList (player, prms) {
		//player: []=>{id, name}
		//	or    {id,name,index}
		//prms: tryindex, firstempty
		let single = true;
		if (player instanceof Array) {single = false;}
		else player = [player];
		var updates = {};
		for (let i = 0; i < player.length; i++) {
			let p = player[i];
			if (single) {
				let curplayers = this.store.getters.getPlayers() || [];
				if (p.index == null && prms && prms.tryindex != null) {
					if (!curplayers[prms.tryindex] || !curplayers[prms.tryindex].id) {
						p.index = p.order = prms.tryindex;
						p.lastid = p.id;
					}
				}
				if (p.index == null) for (let j = 0; j < curplayers.length; j++) {
					if (curplayers[j].lastid == p.id || prms && prms.firstempty && !curplayers[j].id) {
						p = {...curplayers[j], ...p};
						p.lastid = p.id;
						break;
					}
				}
				if (p.index == null) {
					p.order = p.index = curplayers.length;
					p.lastid = p.id;
				}
			} else {
				p.order = i;
				p.index = i;
				p.lastid = p.id;
				//this.app.players[i] = p;
			}
			if (p.index != null) updates[p.index] = p;
			//if (!this.app.playerplatestatus[p.order]) Vue.set(this.app.playerplatestatus, p.order, {'targeted':false});
			/*
			if (!this.app.playercards[p.order]) Vue.set(this.app.playercards, p.order, {});
			for (let k in this.app.cardstackinfo) {
				if (this.app.cardstackinfo[k].privacy == 'OTHERPLAYER_PRIVATE') {
					let sid = this.app.cardstackinfo[k].id.replace('#', p.order);
					//if (!this.app.cardstackstatus[sid]) Vue.set(this.app.cardstackstatus, sid, {'targeted':false});
				}
			}
			*/
		}
		if (Object.keys(updates).length > 0) this.store.commit('setPlayers', {'players':updates, 'src':prms?prms.src:null});
	}
	handlePlayerMessage (data, sender) {
		if (data.cmd == 'requestjoinroom' && this.iAmHost()) {
			if (data.cardset != this.cardset) {
				this.sendMessage({'cmd':'joinroomfailed'}, sender);
				return;
			}
			let playerinfo = {'id':data.myid, 'name':data.myname};
			this.updatePlayerList(playerinfo, {'tryindex':data.playerindex, 'firstempty':true});
			//this.sendMessage ({'cmd':'currentplayerlist', 'players':this.app.players}, 'BROADCAST');
			this.sendMessage({'cmd':'currentcardlist', 'cards':this.packStackItems()}, playerinfo.id);
			if (this.store.state.alltokensidx && Object.keys(this.store.state.alltokensidx).length > 0) {
				this.sendMessage({'cmd':'currenttokenlist', 'tokens':this.packStackItems({'itemtype':'token'})}, playerinfo.id);
			}
		} else if (data.cmd == 'joinroomfailed') {
			alert('Cannot join room');
			this.requestServer('quitroom', {'roomnum':this.store.state.roominfo.roomnum});
			this.store.commit('setRoomInfo', {roomnum:null, hostid:null});
		} else if (data.cmd == 'currentplayerlist') {
			this.updatePlayerList(data.players, {'src':'socketdata'});
			this.store.commit('setRoomInfo', {'hostid':sender, 'myplayeridx':this.store.getters.getMyPlayerIndex()});
			//app.players = data.players;
			//if (app.players) for (let i = 0; i < app.players.length; i++) if (!app.playerplatestatus[i]) Vue.set(app.playerplatestatus, i, {'targeted':false});
			//this.app.hostid = sender;
		} else if (data.cmd == 'currentcardlist') {
			if (data.cards) this.updateStackItemsByData(data.cards, true);
		} else if (data.cmd == 'cardlistupdate') {
			if (data.cards) this.updateStackItemsByData(data.cards, false);
		} else if (data.cmd == 'currenttokenlist') {
			if (data.tokens) this.updateStackItemsByData(data.tokens, true);
		} else if (data.cmd == 'tokenlistupdate') {
			if (data.tokens) this.updateStackItemsByData(data.tokens, false);			
		} else if (data.cmd == 'compstatusupdate') {
			if (data.values) this.updateCompStatusByData (data.values);
		} else if (data.cmd == 'stackoperations' && this.getMyId() && this.iAmHost()) {
			this.stackOperation (this.convertStackid(data['stackid']), data['prmarr']);
		}
	}
	parseCompid (compid) {
		var o = {};
		if (!compid) return o;
		if (compid.match(/^playerplate_(\d+?)$/)) o['playerplateidx'] = RegExp.$1;
		else if (compid.match(/^card_(\d+?)$/)) o['cardid'] = RegExp.$1;
		else if (compid.match(/^token_(\d+?)$/)) o['tokenid'] = RegExp.$1;
		else if (compid.match(/^cardstack_(.+?)$/)) o['stackid'] = RegExp.$1;
		else o['stackid'] = compid; //temp
		return o;
	}
	updateCompStatusByData(data) {
		var updates = {'operations':[], 'src':'socketdata'};
		let myplayeridx = this.store.getters.getMyPlayerIndex();
		if (data instanceof Array) for (let i = 0; i < data.length; i++) {
			if (data[i].stack) {
				if (data[i].playeridx != null && data[i].playeridx != myplayeridx) {
					data[i].stackid = 'player_'+data[i].playeridx+'_'+data[i].stack;
				} else {
					data[i].stackid = data[i].stack;
				}
				delete data[i].stack;
			}
			updates.operations.push (data[i]);
		}
		if (updates.operations.length > 0) this.store.commit('setStatus', updates);


		/*
		stackdata = JSON.parse(JSON.stringify(stackdata));
		if (!stackdata) return;
		let a = [];
		if (stackdata['public']) {
			for (let stackid in stackdata['public']) if(stackdata['public'][stackid]) a.push ({'stackid':stackid, 'data':stackdata['public']});
		}
		if (stackdata['players']) {
			for (let playeridx in stackdata['players']) if (stackdata['players'][playeridx]) for (let stackid in stackdata['players'][playeridx]) if (stackdata['players'][playeridx][stackid]) {
				a.push ({'stackid':stackid, 'playeridx':playeridx, 'data':stackdata['players'][playeridx][stackid]});
			}
		}
		for (let i = 0; i < a.length; i++) {
			let ss = this.app.getStackStatus(a[i].stackid, a[i].playeridx);
			for (let f in a[i].data) {
				if (a[i].data[f] && typeof a[i].data[f] == 'object') {
					if (!ss[f]) Vue.set(ss, f, {});
					for (let f1 in a[i].data[f]) {
						Vue.set(ss[f], f1, a[i].data[f][f1]);
					}
				} else {
					Vue.set(ss, f, a[i].data[f]);
				}
			}
		}
		*/
	}
	updateStackItemsByData(data, clearall) {
		//data:[]=>{cards, tokens, stack, playeridx}
		var inputs = {'operations':[], 'src':'socketdata'};
		var myid = this.getMyId();
		var myplayeridx = this.store.getters.getMyPlayerIndex();
		if (data instanceof Array) {
			for (let i = 0; i < data.length; i++) {
				let fullstackid;
				if (data[i].playeridx != null && data[i].playeridx != myplayeridx) fullstackid = 'player_'+data[i].playeridx+'_'+data[i].stack;
				else fullstackid = data[i].stack;
				inputs.operations.push ({'cards':data[i].cards, 'tokens':data[i].tokens, 'stackid':fullstackid});
			}
		}
		if (inputs.operations.length > 0) this.store.commit('setComponentChildren', inputs);


		/*
		carddata = JSON.parse(JSON.stringify(carddata));
		let playerstacks = [];
		for (let stackid in this.app.cardstackinfo) {
			if (this.app.cardstackinfo[stackid].privacy == 'OTHERPLAYER_PRIVATE') {
				playerstacks.push (this.app.cardstackinfo[stackid].purpose);
			}
			if (this.app.cardstackinfo[stackid]['privacy'] != 'PUBLIC') continue;
			let cards = carddata && carddata.public?carddata.public[stackid]:undefined;
			if (!clearall && cards === undefined) continue;
			cards = cards || [];
			let newstack = [];
			for (let cardid of cards) newstack.push ({'id':cardid});
			this.app.stackcards[stackid] = newstack;
		}
		if (this.app.players) for (let i = 0; i < this.app.players.length; i++) {
			let pcards = carddata.players?carddata.players[i]:undefined;
			if (pcards === undefined && !clearall) continue;
			pcards = pcards || {};
			for (let k in pcards) if (pcards[k]) for (let i = 0; i < pcards[k].length; i++) {
				pcards[k][i] = {'id':pcards[k][i]};
			}
			if (this.app.isMyPlayer(this.app.players[i])) {
				for (let stackid in this.app.cardstackinfo) {
					if (this.app.cardstackinfo[stackid].privacy != 'PRIVATE') continue;
					let cards = pcards[stackid];
					if (!clearall && cards === undefined) continue;
					this.app.stackcards[stackid] = cards || [];
				}
				this.app.playercards[i] = null;
			} else {
				for (let stackid2 of playerstacks) {
					let cards2 = pcards[stackid2];
					if (!clearall && cards2 === undefined) continue;
					if (!this.app.playercards[i][stackid2]) Vue.set(this.app.playercards[i], stackid2, []);
					this.app.playercards[i][stackid2] = cards2 || [];
				}
			}
		}
		*/
	}
	packStackItems (prms) {
		//prms: itemtype
		//return: []=>{stack, playeridx, cards}
		var allstackinfo = this.store.state.cardstackinfo || {};
		var players = this.store.getters.getPlayers();
		var myplayeridx = this.store.getters.getMyPlayerIndex();
		var allstackids = {};
		var output = [];
		for (let k in allstackinfo) {
			if (allstackinfo[k].privacy == 'PUBLIC') allstackids[k] = {'stack':k, 'playeridx':null, 'fullstack':k};
			else if (allstackinfo[k].privacy == 'PRIVATE') {
				allstackids[k] = {'stack':allstackinfo[k].purpose, 'playeridx':myplayeridx, 'fullstack':k};
			} else if (allstackinfo[k].privacy == 'OTHERPLAYER_PRIVATE') {
				if (players) for (let j = 0; j < players.length; j++) {
					if (j == myplayeridx) continue;
					let fk = 'player_'+j+'_'+allstackinfo[k].purpose;
					allstackids[fk] = {'stack':allstackinfo[k].purpose, 'playeridx':j, 'fullstack':fk};
				}
			}
		}
		var targetstacks = null;		
		if (prms && prms.targetstacks) {
			targetstacks = {};
			if (prms.targetstacks instanceof Array) for (let i = 0; i < prms.targetstacks.length; i++) targetstacks[prms.targetstacks[i]] = prms.targetstacks[i];
			else targetstacks = prms.targetstacks;
		}
		var itemtype = prms && prms.itemtype?prms.itemtype:'card';
		for (let k in allstackids) {
			if (targetstacks && !targetstacks[k]) continue;
			let items = cloneObject(this.store.getters.getComponentChildren('cardstack', k, itemtype)) || [];
			let o1 = {};
			if (itemtype == 'token') o1['tokens'] = items;
			else o1['cards'] = items;
			output.push ({'stack':allstackids[k].stack, 'playeridx':allstackids[k].playeridx, ...o1});
		}
		return output;


		/*
		var o = {'public':{}, 'players':{}};
		var mine = {};
		var targetstacks = null;
		if (prms && prms.targetstacks) {
			targetstacks = {};
			if (prms.targetstacks instanceof Array) for (let o of prms.targetstacks) targetstacks[o] = o;
			else targetstacks = prms.targetstacks;
		}
		for (let k in this.app.stackcards) {
			let cardids = [];
			let sinfo = this.app.cardstackinfo[k];
			if (!sinfo) continue;
			if (this.app.stackcards[k]) for (let i in this.app.stackcards[k]) cardids.push (this.app.stackcards[k][i].id);
			if (sinfo.privacy == 'PUBLIC') {
				if (targetstacks && !targetstacks[k]) continue;
				o['public'][k] = cardids;
			} else if (sinfo.privacy == 'PRIVATE') mine[k] = cardids;
		}
		if (this.app.players) for (let i = 0; i < this.app.players.length; i++) {
			let pcards = null;
			if (this.app.isMyPlayer(this.app.players[i])) {
				pcards = mine;
			} else {
				if (this.app.playercards && this.app.playercards[i]) {
					pcards = {};
					for (let k in this.app.playercards[i]) {
						pcards[k] = [];
						if (this.app.playercards[i][k]) for (let j = 0; j < this.app.playercards[i][k].length; j++) pcards[k].push (this.app.playercards[i][k][j].id);
					}
				} else pcards = {};
			}
			if (targetstacks) {
				let pcards1 = null;
				if (pcards) for (let k in pcards) {
					if (targetstacks['PLAYER_'+i] || targetstacks['PLAYER_ALL'] || targetstacks['PLAYER_'+i+'_'+k] || targetstacks['PLAYER_ALL_'+k] || this.app.players[i].id == this.getMyId() && targetstacks[k]) {
						if (!pcards1) pcards1 = {};
						pcards1[k] = pcards[k];
					}
				}
				pcards = pcards1;
			}
			if (pcards != null) o.players[i] = pcards;
		}
		return o;
		*/
	}
	packStatusForSending (obj) {
		var ops = cloneObject(obj.operations||obj);
		if (!(ops instanceof Array)) ops = [ops];
		let myplayeridx = this.store.getters.getMyPlayerIndex();
		for (let i = 0; i < ops.length; i++) {
			if (ops[i].stackid) {
				let sp = null, pi = null;
				if (ops[i].stackid.match(/^player_(\d+?)_(.+?)$/)) {sp = RegExp.$2; pi = RegExp.$1;}
				else {
					let stackinfo = this.store.getters.getCardStackInfo(ops[i].stackid) || {};
					if (stackinfo.privacy == 'PUBLIC') {sp = stackinfo.purpose || ops[i].stackid;}
					else if (stackinfo.privacy == 'PRIVATE') {sp = stackinfo.purpose || ops[i].stackid; pi = myplayeridx;}
				}
				delete ops[i].stackid;
				ops[i].stack = sp;
				ops[i].playeridx = pi;
			}
		}
		return ops;
	}
	getCardInStack (cardid) {
		let stackcards = this.store.getters.getAllComponentTypeChildren ('cardstack', 'card');
		if (stackcards) for (let fullstackid in stackcards) if (stackcards[fullstackid]) for (let i = 0; i < stackcards[fullstackid].length; i++) {
			if (stackcards[fullstackid][i] == cardid) {
				let o = {};
				if (fullstackid.match(/^player_(\d+?)_(.+?)$/)) o = {'stack':RegExp.$2, 'index':i, 'playerorder':RegExp.$1};
				else o = {'stack':fullstackid, 'index':i};
				o['fullstack'] = o['playerorder']==null?o['stack']:'player_'+o['playerorder']+'_'+o['stack'];
				return o;
			}
		}
		return null;
		/*

		for (var k in this.app.stackcards) if (this.app.stackcards[k]) for (let i = 0; i < this.app.stackcards[k].length; i++) {
			if (this.app.stackcards[k][i].id == cardid) return {'stack':k, 'index':i};
		}
		for (var p in this.app.playercards) if (this.app.playercards[p]) for (let k in this.app.playercards[p]) {
			if (this.app.playercards[p][k]) for (let i = 0; i < this.app.playercards[p][k].length; i++) {
				if (this.app.playercards[p][k][i] == cardid) return {'stack':k, 'index':i, 'playerorder':p};
			}
		}
		return null;
		*/
	}
	setCompStatusField (prms) {
		//prms: operations[]=>{stackid, playerplateidx, cardid, field, fieldidx, value, compid}
		var operations = prms.operations || prms;
		if (!(operations instanceof Array)) operations = [operations];
		for (let i = 0; i < operations.length; i++) {
			let o1 = operations[i];
			if (o1.compid) {
				operations[i] = {...o1, ...this.parseCompid(o1.compid)};
				delete operations[i].compid;
			}
		}
		this.store.commit('setStatus', {'operations':operations});
	}
	moveTokensToStack (tokenids, stack, prms) {
		//prms: returnchanges
		let stacktokens = cloneObject(this.store.getters.getAllStackTokens()) || {};
		tokenids = cloneObject(tokenids);
		let tidsidx = {}; for (let i = 0; i < tokenids.length; i++) {
			if (typeof tokenids[i] =='object') tokenids[i] = tokenids[i].id;
			tidsidx[tokenids[i]] = true;
		}
		let changed = {};
		for (let k in stacktokens) if (stacktokens[k]) for (let i = 0; i < stacktokens[k].length; i++) {
			if (tidsidx[stacktokens[k][i]]) {
				stacktokens[k].splice(i,1);
				i--;
				changed[k] = true;
			}
		}
		if (!stacktokens[stack]) stacktokens[stack] = [];
		stacktokens[stack] = stacktokens[stack].concat(tokenids);
		changed[stack] = true;
		let operations = [];
		for (let k in changed) operations.push ({stackid:k, tokens:stacktokens[k]});
		if (prms && prms.returnchanges) return operations.length == 0?null:operations;
		this.store.commit('setComponentChildren', {'operations':operations});
	}
	moveCardWithinStack (stackid, prms) {
		//prms: cardid, dest, src
		var stackcards = cloneObject(this.store.getters.getStackCards(stackid)) || [];
		var dest = prms.dest;
		var src = prms.src;
		if (src == null && prms.cardid) for (let i = 0; i < stackcards.length; i++) {
			if (stackcards[i] == prms.cardid) {src = i; break;}
		}
		if (src != null && dest != null && src != dest && stackcards.length > 0 && src < stackcards.length) {
			let card = stackcards.splice(src, 1);
			//console.log('src',src,'dest',dest,'result','stackcardslength', stackcards.length, dest);
			stackcards.splice(dest, 0, card[0]);
			let operations = [{'stackid':stackid, 'cards':stackcards}];
			this.store.commit('setComponentChildren', {'operations':operations});
		}
	}
	moveCardsToStack (cardids, stack, prms) {
		//prms: tobottom, returnchanges
		//return: (optional)[]=>{stackid, cards}
		cardids = cloneObject(cardids);
		prms = prms || {};
		if (!stack && prms.stackid) stack = prms.stackid;
		//console.log(cardids,stack,prms);
		if (typeof cardids == 'string' || typeof cardids == 'number' || typeof cardids == 'object' && !(cardids instanceof Array)) cardids = [cardids];
		//if (stack && stack.match(/^player_(\d+?)_(.+?)$/)) {prms.playeridx = RegExp.$1; stack = RegExp.$2;}
		var stackcards = cloneObject(this.store.getters.getAllStackCards()) || {};
		let tidsidx = {}; for (let i = 0; i < cardids.length; i++) {
			if (typeof cardids[i] =='object') cardids[i] = cardids[i].id;
			tidsidx[cardids[i]] = true;
		}
		var changedstacks = {};
		//var fullstackid = prms.playeridx!=null&&prms.stackpurpose?'player_'+prms.playeridx+'_'+prms.stackpurpose:stack;
		var fullstackid = stack;
		var stackinfo = this.store.getters.getCardStackInfo(fullstackid) || {};

		if (stack && stackinfo.emptycurrentcardstostackonadd) {
			/*
			let cardinstack = [];
			for (let i = 0; i < cardids.length; i++) {
				let cardid = cardids[i];
				if (cardid && typeof cardid == 'object' && cardid['id']) cardid = cardid['id'];
				cardinstack[i] = this.getCardInStack(cardid);
			}
			*/
			let samestack;
			let stack2 = stackinfo.emptycurrentcardstostackonadd;
			let result1 = this.getCardInStack(cardids[0]);
			samestack = result1 && result1.fullstack == stack2?true:false;
/*
			
			for (let i = 0; i < cardinstack.length; i++) {
				if (cardinstack[i].stack != stack2) {samestack = false; break;}
			}
			*/
			if (!samestack) {
				stackcards[stack2] = (stackcards[stack2] || []).concat(stackcards[fullstackid]||[]);
				stackcards[fullstackid] = [];
				changedstacks[fullstackid] = true;
				changedstacks[stack2] = true;
			}
		}
		if (!stackcards[fullstackid]) stackcards[fullstackid] = [];
		for (let k in stackcards) {
			if (fullstackid == k || !stackcards[k]) continue;
			for (let i = 0; i < stackcards[k].length; i++) {
				if (tidsidx[stackcards[k][i]]) {
					let cid = stackcards[k][i];
					stackcards[k].splice(i,1);
					changedstacks[k] = true;
					changedstacks[fullstackid] = true;
					if (prms && prms.tobottom) stackcards[fullstackid].unshift(cid);
					else stackcards[fullstackid].push(cid);
					i--;
				}
			}
		}
		if (Object.keys(changedstacks).length > 0) {
			let operations = [];
			for (let k in changedstacks) {
				operations.push ({'stackid':k, 'cards':stackcards[k]});
			}
			if (prms && prms['returnchanges']) return operations;
			else this.store.commit('setComponentChildren', operations);
		} else {
			if (prms && prms['returnchanges']) return null;
		}
	}
	convertStackid (stackid, toglobal) {
		var sinfo = this.store.getters.getCardStackInfo(stackid);
		if (!sinfo || sinfo['privacy'] == 'PUBLIC') return stackid;
		if (toglobal) {
			if (!stackid.match(/^player_/)) stackid = 'player_'+this.store.getters.getMyPlayerIndex()+'_'+stackid;
			return stackid;
		} else {
			let m;
			if (m = stackid.match(/^player_(\d+?)_(.+?)$/)) {
				if (m[1] * 1 == this.store.getters.getMyPlayerIndex()*1) stackid = m[2];
			}
			return stackid;
		}
	}
	stackOperation (stackid, prmarr) {
		//prmarr: string or {} or []=>string/{}
		//	{cmd, ...}
		var changedstacks = {};
		if (typeof prmarr == 'string') prmarr = {'cmd':prmarr};
		if (!prmarr) prmarr = {};
		if (!(prmarr instanceof Array)) prmarr = [prmarr];
		let allstackcards = cloneObject(this.store.getters.getAllStackCards()) || {};
		let allstacktokens = cloneObject(this.store.getters.getAllStackTokens()) || {};
		let changed = {}, changedt = {};
		let isroomguest = this.isInRoom() && !this.iAmHost();
		let requeststohost = [];
		for (let pidx = 0; pidx < prmarr.length; pidx++) {
			let prms = prmarr[pidx];
			let cmd = prms.cmd;
			switch (cmd) {
				case 'COLLECTALLCARDS': {
					if (isroomguest) {requeststohost.push (prms); break;}
					if (!allstackcards[stackid]) allstackcards[stackid] = [];
					for (let k in allstackcards) {
						if (k == stackid || prms && prms.exceptstacks instanceof Array && prms.exceptstacks.indexOf(k) >= 0) continue;
						if (allstackcards[k] && allstackcards[k].length > 0) {
							allstackcards[stackid] = allstackcards[stackid].concat(allstackcards[k]);
							allstackcards[k] = [];
							changed[k] = true;
							changed[stackid] = true;
						}
					}
				} break;
				case 'SHUFFLE': {
					if (isroomguest) {requeststohost.push (prms); break;}
				    if (allstackcards[stackid] && allstackcards[stackid].length > 0) {
				    	let a = allstackcards[stackid], j, x, i;
					    for (i = a.length - 1; i > 0; i--) {
					        j = Math.floor(Math.random() * (i + 1));
					        x = a[i];
					        a[i] = a[j];
					        a[j] = x;
					    }
					    changed[stackid] = true;
					    this.store.commit('setComponentChildren', {'stackid':stackid, 'cards':a});
					    //changedstacks[stackid] = true;
					}
				} break;
				case 'DISTRIBUTE': {
					if (isroomguest) {requeststohost.push (prms); break;}
					let coll = prms.comptype=='token'?allstacktokens:allstackcards;
					let changedside = prms.comptype=='token'?changedt:changed;
					let stackid1 = prms.fromstack || stackid;
					let items = coll[stackid1];
					let itemsperplayer = prms['itemsperplayer'] || prms['cardsperplayer'];
					if (typeof itemsperplayer == 'function') {
						itemsperplayer = itemsperplayer({'playercount':this.store.getters.getPlayers().length});
					}
					let myplayeridx = this.store.getters.getMyPlayerIndex();
					if (items && items.length > 0) {
						let curplayer = 0;
						let curturn = 0;
						let targetstack = prms.targetstack||'handstack';
						let inroom = this.isInRoom();
						while (items.length > 0) {
							let card = items.pop();
							let k = null;
							if (!inroom || curplayer == myplayeridx) {
								k = targetstack;
							} else {
								k = 'player_'+curplayer+'_'+targetstack;
							}
							if (!coll[k]) coll[k] = [];
							coll[k].push (card);
							changedside[k] = true;
							curplayer++;
							if (!inroom || curplayer >= this.store.getters.getPlayers().length) {
								curplayer = 0;
								curturn++;
							}
							if (itemsperplayer && curturn >= itemsperplayer) break;
						}
						changedside[stackid1] = true;
					}

				} break;
				case 'MOVECARDS':{
					if (isroomguest) {requeststohost.push (prms); break;}
					let result1 = this.moveCardsToStack (prms['cardids'], stackid, {'returnchanges':true, ...prms});
					if (result1 && result1.length > 0) for (let i = 0; i < result1.length; i++) {
						allstackcards[result1[i]['stackid']] = result1[i]['cards'];
						changed[result1[i]['stackid']] = true;
					}
				} break;
				case 'MOVETOKENS':{
					if (isroomguest) {requeststohost.push (prms); break;}
					let result1 = this.moveTokensToStack (prms['tokenids'], stackid, {'returnchanges':true, ...prms});
					if (result1 && result1.length > 0) for (let i = 0; i < result1.length; i++) {
						allstacktokens[result1[i]['stackid']] = result1[i]['tokens'];
						changedt[result1[i]['stackid']] = true;
					}
				} break;
				case 'SORT': {
					if (isroomguest) {requeststohost.push (prms); break;}
					let sortprior = prms.sortprior;
					if (sortprior && allstackcards[stackid] && allstackcards[stackid].length > 0) {
						let cards = allstackcards[stackid];
						let allcardsidx1 = this.store.state.allcardsidx;
						cards.sort(function(a,b) {
							let aid = a && typeof a == 'object'?a.id:a;
							let bid = b && typeof b == 'object'?b.id:b;							
							let card1 = allcardsidx1[aid];
							let card2 = allcardsidx1[bid];
							for (let i = 0; i < sortprior.length; i++) {
								let c1 = card1[sortprior[i]];
								let c2 = card2[sortprior[i]];
								if (c1 != c2) return c1<c2?-1:1;
							}
							return aid = bid;
						});
						changed[stackid] = true;
					}
				} break;
				case 'SHOWIMAGE':{
					if (prms.cardid) {
						let imgsrc = this.store.state.allcardsidx[prms.cardid].imagesrc;
						setTimeout(function(){
							ChoiceOverlay.getInstance().showImage(imgsrc);
						},100); //prevent influence from simulated click from touchend
					}
				} break;
				case 'SHOWSTACKINDETAIL':{
					this.app['reflectingstackid'] = stackid;
					DetailPane.getInstance().show();
				} break;
				case 'SETSTACKSTATUS': {
					let o1 = {};
					o1['stackid'] = stackid;
					o1['field'] = prms['field'];
					o1['fieldidx'] = prms['fieldidx'];
					o1['value'] = prms['value'];
					this.store.commit ('setStatus', o1);
					if (prms['revertafterseconds']) {
						setTimeout(()=>{
							o1['value'] = !prms['value'];
							this.store.commit ('setStatus', o1);
						}, prms['revertafterseconds']*1000);
					}
				} break;
			}
		}
		let operations = [];
		if (Object.keys(changed).length > 0) {
			for (let k in changed) operations.push ({'stackid':k, 'cards':allstackcards[k]});
		}
		if (Object.keys(changedt).length > 0) {
			for (let k in changedt) operations.push ({'stackid':k, 'tokens':allstacktokens[k]});
		}
		if (operations.length > 0) this.store.commit('setComponentChildren', operations);

		if (requeststohost.length > 0) {
			this.sendMessage ({'cmd':'stackoperations', 'stackid':this.convertStackid(stackid, true), 'prmarr':requeststohost}, 'HOST');
		}
	}
	
}