
const store = new Vuex.Store({
	state:{
		'allcardsidx':{},
		'alltokensidx':{},		
		'stackstatus':{},
		'cardstatus':{},
		'tokenstatus':{},
		'playerplatestatus':{},
		'comptypecompchildren':{},
		'players':[],
		'cardstackinfo':{},
		'playerplateinfo':{},
		'myid':null,
		'roominfo':{'roomnum':null, 'myname':'', 'hostid':null, 'myplayeridx':null},
	},
	getters:{
		getCardInfo:state=>cardid=>{
			return state.allcardsidx[cardid];
		},
		getTokenInfo:state=>tokenid=>{
			return state.alltokensidx[tokenid];
		},
		getCardStackInfo:state=>stackid=>{
			if ((stackid||'').match(/^player_\d+_(.+?)$/)) stackid = 'otherplayer_'+RegExp.$1;
			return state.cardstackinfo[stackid];
		},
		getPlayerPlateInfo:state=>()=>{
			return state.playerplateinfo;
		},
		getPlayer:state=>playeridx=>{
			return state.players[playeridx];
		},
		getPlayers:state=>()=>state.players,
		getMyPlayerIndex:(state,getters)=>()=>{
			if (!state.myid) return state.roominfo.myplayeridx;
			for (let i = 0; i < state.players.length; i++) {
				if (state.players[i].id == state.myid) return i;
			}
			return null;
		},
		getMyPlayer:(state,getters)=>{
			let i = getters.getMyPlayerIndex();
			return i==null?null:state.players[i];
		},
		getMyId:state=>state.myid,
		getObjectStatus:state=>({stackid, playeridx, playerplateidx, cardid, tokenid, field, fieldidx})=>{
			let t, k;
			if (playerplateidx) {
				t = 'playerplatestatus';
				k = playerplateidx;
			} else if (stackid) {
				t = 'stackstatus';
				if (stackid && stackid.match(/^player_(\d+)_(.+?)$/)) {stackid = RegExp.$2; playeridx = RegExp.$1;}
				k = playeridx==null?stackid:'player_'+playeridx+'_'+stackid;
			} else if (cardid) {
				t = 'cardstatus';
				k = cardid;
			} else if (tokenid) {
				t = 'tokenstatus';
				k = tokenid;
			} else return null;
			if (!state[t][k]) {
				return null;
				let o;
				if (t == 'stackstatus' || t == 'playerplatestatus') o = {'targeted':false};
				else if (t == 'cardstatus') o = {'selected':false};
				else o = {};
				Vue.set(state[t], k, o);
			}
			let output = state[t][k];
			if (!field) return output;
			if (!output || typeof output != 'object') return null;
			output = output[field];
			if (fieldidx == null) return output;
			if (!output || typeof output != 'object') return null;
			output = output[fieldidx];
			return output;
		},
		getStackStatus:(state,getters)=>(stackid, playeridx, field, fieldidx)=>{
			return getters.getObjectStatus({stackid, playeridx, field, fieldidx});
		},
		getCardStatus:(state,getters)=>(cardid, field, fieldidx)=>{
			return getters.getObjectStatus({cardid, field, fieldidx});
		},
		getTokenStatus:(state,getters)=>(tokenid, field, fieldidx)=>{
			return getters.getObjectStatus({tokenid, field, fieldidx});
		},
		getPlayerPlateStatus:(state,getters)=>(playerplateidx, field, fieldidx)=>{
			return getters.getObjectStatus({playerplateidx,field, fieldidx});
		},		
		getComponentChildren:(state,getters)=>(comptype, compid, childtype)=>{
			let o = state.comptypecompchildren[comptype]; if (!o) return null;
			o = o[compid]; if (!o) return null;
			o = o[childtype]; if (!o) return null;
			return o;
		},
		getAllComponentTypeChildren:(state,getters)=>(comptype, childtype)=>{
			let o = {};
			if (!state.comptypecompchildren[comptype]) return o;
			for (let k in state.comptypecompchildren[comptype]) if (state.comptypecompchildren[comptype][k] && state.comptypecompchildren[comptype][k][childtype]) o[k] = state.comptypecompchildren[comptype][k][childtype];
			return o;
		},
		getStackCards:(state,getters)=>(stackid)=>{
			return getters.getComponentChildren('cardstack', stackid, 'card');
		},
		getStackTokens:(state,getters)=>(stackid)=>{
			return getters.getComponentChildren('cardstack', stackid, 'token');
		},
		getAllStackCards:(state,getters)=>()=>{
			return getters.getAllComponentTypeChildren('cardstack', 'card');
		},
		getAllStackTokens:(state,getters)=>()=>{
			return getters.getAllComponentTypeChildren('cardstack', 'token');
		},
	},
	mutations:{
		setAllCardsIdx (state, allcardsidx) {
			state.allcardsidx = allcardsidx;
		},
		setAllTokensIdx (state, alltokensidx) {
			state.alltokensidx = alltokensidx;
		},
		setStatus (state, prms) {
			let operations = null;
			if (typeof prms == 'object' && prms && prms.operations) operations = prms.operations;
			else operations = prms;
			if (operations && !(operations instanceof Array)) operations = [operations];

			if (operations) for (let i = 0; i < operations.length; i++) {
				let {cardid, tokenid, stackid, playeridx, playerplateidx, field, fieldidx, value} = operations[i];
				let t, k;
				if (playerplateidx) {
					t = 'playerplatestatus';
					k = playerplateidx;
				} else if (stackid) {
					t = 'stackstatus';
					k = stackid;
				} else if (cardid) {
					t = 'cardstatus';
					k = cardid;
				} else if (tokenid) {
					t = 'tokenstatus';
					k = tokenid;
				} else return null;
				if (!state[t][k]) {
					let o;
					if (t == 'stackstatus' || t == 'playerplatestatus') o = {'targeted':false};
					else if (t == 'cardstatus') o = {'selected':false};
					else o = {};
					Vue.set(state[t], k, o);
				}
				if (field && fieldidx != null) {
					if (!state[t][k][field]) Vue.set(state[t][k], field, {});
					Vue.set(state[t][k][field], fieldidx, value);
				} else if (field) {
					Vue.set (state[t][k], field, value);
				} else {
					Vue.set(state[t], k, value);
				}
			}
		},
		setComponentChildren (state, operationdata) {
			var operations;
			if (typeof operationdata == 'object' && operationdata && operationdata.operations) operations = operationdata.operations;
			else operations = operationdata;
			if (!(operations instanceof Array)) {
				if (typeof operations == 'object') operations = [operations];
				else return;
			}
			for (let i = 0; i < operations.length; i++) {
				let o = operations[i];
				let {stackid, cards, tokens, playeridx} = o;

				let comptype = null, compid = null, childtype = null, children = null;
				if (stackid) {
					comptype = 'cardstack';
					if (playeridx != null) compid = 'player_'+playeridx+'_'+stackid;
					else compid = stackid;
				}
				if (cards) {
					childtype = 'card';
					children = cards;
				}
				if (tokens) {
					childtype = 'token';
					children = tokens;
				}
				if (comptype == null || compid == null || childtype == null || children == null) continue;

				if (!state.comptypecompchildren[comptype]) Vue.set(state.comptypecompchildren, comptype, {});
				if (!state.comptypecompchildren[comptype][compid]) Vue.set(state.comptypecompchildren[comptype], compid, {});
				Vue.set(state.comptypecompchildren[comptype][compid],childtype, children);
			}
		},
		setCardStackInfo (state, cardstackinfo) {
			Vue.set(state, 'cardstackinfo', cardstackinfo);
		},
		setPlayerPlateInfo (state, playerplateinfo) {
			Vue.set(state, 'playerplateinfo', playerplateinfo);
		},
		setPlayers (state, playerdata) {
			//playerdata: {players}
			let players = null;
			if (playerdata && typeof playerdata == 'object' && playerdata.players !== undefined) players = playerdata.players;
			if (!players) {state.players = []; return;}
			for (let i in players) {
				if (!state.players[i]) {
					for (let j = 0; j < i; j++) if (!state.players[j]) state.players[j] = null;
					Vue.set(state.players, i, players[i]);
					continue;
				}
				for (let k in players[i]) {
					Vue.set(state.players[i], k, players[i][k]);
				}
			}
		},
		setMyId (state, id) {
			state.myid = id;
		},
		setRoomInfo (state, room) {
			if (typeof room == 'object' && room) for (let k in room) {
				Vue.set(state.roominfo, k, room[k]);
			}
		},
	},
	strict:true
});