
function getPositionRelativeTo (ele, ctn) {
	var x = 0, y = 0;
	while (ele && ele != ctn) {
		x += ele.offsetLeft;
		y += ele.offsetTop;
		ele = ele.offsetParent;
	};
	return {'x':x,'y':y};
}

function setObjectValue (o, k, v) {
    var ks = [];
    if ((k+'').match(/\./)) ks = (k+'').split('.');
    else for (var i = 1; i < arguments.length - 1; i++) ks.push (arguments[i]);
    if (ks.length < 0) return;
    if (ks.length == 1) o[ks[0]] = v;
    else {
        if (o[ks[0]] == null || typeof o[ks[0]] != 'object') o[ks[0]] = {};
        ks[0] = o[ks[0]];
        ks.push (arguments[arguments.length-1]);
        setObjectValue.apply(null, ks);
    }
}
function getObjectValue (o, k) {
    var a = [];
    if (arguments.length == 2 && (k+'').match(/\./)) a = k.split('.');
    else for (var i = 1; i < arguments.length; i++) a.push (arguments[i]);
      //console.log(a);
    if (o == null || typeof o != 'object') return null;
    if (a.length >= 2) {
      a[0] = o[a[0]];
      return getObjectValue.apply(null,a);
    } else return o[a[0]];
}
function htmlEscape (s) {
    s = s + '';
    return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function cloneObject (o) {
	return JSON.parse(JSON.stringify(o));
}

class DetailPane {
	makePane () {
		this.addEventHandlers();
		return document.getElementById('detailpane');
	}
	addEventHandlers() {
		if (this.addedeventhandlers) return;
		var d = document.getElementById('detailpane');
		var ctrl = this;
		d.addEventListener('click', function (evt) {
			if (!evt.target) return;
			if (evt.target.matches('.close')) {
				ctrl.close();
			}
		});
		this.addedeventhandlers = true;
	}
	show (prms) {
		var d = this.makePane();
		d.style.display = '';
	}
	close(){
		var d = this.makePane();
		d.style.display = 'none';
	}	
	static getInstance () {
		if (!DetailPane.instance) DetailPane.instance = new DetailPane();
		return DetailPane.instance;
	}	
}

class ChoiceOverlay {
	makeOverlay () {
		var d = document.querySelector('#choiceoverlay div.choicediv');
		if (!d) {
			let d0 = document.createElement('div');
			d0.id = 'choiceoverlay';
			d0.style.cssText = 'position:absolute;top:0;bottom:0;left:0;right:0;display:none;';
			d0.innerHTML = '<div class="close"></div><div class="choicediv"></div>';
			d = d0.querySelector('.choicediv');
			document.body.appendChild(d0);
		}
		this.addEventHandlers();
		return d; 
	}
	isShowing() {
		var e = document.querySelector('#choiceoverlay');
		if (!e) return false;
		return e.style.display=='none'?false:true;
	}
	close(){
		if (this.resolve_onchoice) this.resolve_onchoice(null);
		if (this.resolve_oninput) this.resolve_oninput(null);
		document.querySelector('#choiceoverlay').style.display = 'none';
		this.resolve_onchoice = null;
		this.resolve_oninput = null;
		this.activechoices = null;
		this.activeinputs = null;
		this.showingimage = null;
	}
	showImage (imagesrc) {
		var d = this.makeOverlay();
		d.innerHTML = '<img src="'+imagesrc+'" style="object-fit:contain" />';
		document.querySelector('#choiceoverlay').style.display = '';
		this.showingimage = true;
	}
	showChoice (choices, prms) {
		var ctrl = this;
		var d = this.makeOverlay();
		d.innerHTML = '';
		if (typeof choices == 'string') choices = choices.split(',');
		let activechoices = [];
		for (let i = 0; i < choices.length; i++) {
			let d1 = document.createElement('div');
			d1.className = 'choicebtn btn';
			let c = choices[i];
			if (i == choices.length) {
				if (!prms || !prms.addcancel) continue;
				c = {'display':'Cancel', 'value':null};
			} else if (typeof c == 'string') {
				let s = c.split('=');
				c = {};
				c.value = s[0];
				c.display = s[1] || s[0];
			}
			activechoices.push (c);
			d1.innerHTML = c.display;
			d1.value = i;
			d.appendChild(d1);
		}
		this.activechoices = activechoices;
		this.resolve_onchoice = null;
		document.querySelector('#choiceoverlay').style.display = '';
		return new Promise (function (resolve, reject) {
			ctrl.resolve_onchoice = resolve;
		});
	}
	showInput (inputs, prms) {
		var d = this.makeOverlay();
		d.innerHTML = '';
		for (let i =0; i < inputs.length; i++) {
			let d1 = document.createElement('div');
			d1.className = 'inputrow';
			let h = "<span>"+inputs[i].display+":</span>";
			h += "<input type='text' class='inputfield input_"+i+"' size='8' value='"+(inputs[i].value?htmlEscape(inputs[i].value+''):'')+"'/>";
			d1.innerHTML = h;
			d.appendChild(d1);
		}
		let d2 = document.createElement('div');
		d2.className = 'inputsubmitbtnarea';
		d2.innerHTML = '<div class="confirminputbtn btn">Confirm</div> <div class="cancel btn">Cancel</div>';
		d.appendChild(d2);
		this.activeinputs = inputs;
		this.resolve_oninput = null;
		document.getElementById('choiceoverlay').style.display = '';
		let ip = d.querySelector('input[type="text"]'); if (ip) ip.focus();
		return new Promise((resolve, rejcet)=>{
			this.resolve_oninput = resolve;
		});
	}
	onChoice (idx) {
		let val = null;
		if (this.activechoices && this.activechoices[idx]) val = this.activechoices[idx].value;
		if (this.resolve_onchoice) this.resolve_onchoice(val);
		this.close();
	}
	onInputConfirm () {
		let inputvalues = {};
		let inputs = document.querySelectorAll('#choiceoverlay .inputfield');
		for (let i = 0; i < inputs.length; i++) {
			//console.log(inputs[i].className);
			let c = inputs[i].className.match(/\binput_(\d+?)\b/);
			if (!c) continue;
			c = c[1];
			inputvalues[this.activeinputs[c].name] = inputs[i].value;
		}
		if (this.resolve_oninput) this.resolve_oninput(inputvalues);
		this.close();
	}
	addEventHandlers() {
		if (this.addedeventhandlers) return;
		var d = document.querySelector('#choiceoverlay');
		var ctrl = this;
		d.addEventListener('click', function (evt) {
			if (!evt.target) return;
			if (evt.target.matches('.confirminputbtn')) {
				ctrl.onInputConfirm ();
			} else if (evt.target.matches('.choicebtn')) {
				ctrl.onChoice (evt.target.value);
			} else if (evt.target.matches('.close, .cancel') || ctrl.showingimage) {
				ctrl.close();
			}
		});
		this.addedeventhandlers = true;
	}
	static getInstance () {
		if (!ChoiceOverlay.instance) ChoiceOverlay.instance = new ChoiceOverlay();
		return ChoiceOverlay.instance;
	}

}


//=============
const DefaultEventHandlers = {
	eventhandlers:{
		elevate:function (evt, evtname, comp) {
			if (!comp) comp = this;
			if (!evtname) evtname = evt.evtname || evt.type;
			if (this.$parent && this.$parent.onchildevent) this.$parent.onchildevent(comp,evtname,evt);
		},
		onchildevent:function(comp,evtname,evt) {
			if (this.$parent && this.$parent.onchildevent) this.$parent.onchildevent(comp,evtname,evt);
		},
		onmouseover:function (evt, evtname) {
			this.elevate(evt, evtname);
			//this.$root.gamecontrol.oncardstackmousein (this, evt);
		},
		onmouseout:function (evt, evtname) {
			if (this.mousedowninfo) this.mousedowninfo.out = true;
			this.elevate(evt, evtname);
		},
		onmousedown:function(evt, evtname) {
			if (evt.which && evt.which > 1) return;
			//if (!this.stackinfo || !this.stackinfo.longpressoperations) return;
			if (DefaultEventHandlers.touchsupported && !evt.fromtouch) {
				return;
			}
			if (this.mousedowninfo && !evt.fromtouch && this.mousedowninfo.fromtouch) return;
			let ts = (new Date()).getTime();
			this.mousedowninfo = {initClientX:evt.clientX, initClientY:evt.clientY,lastClientX:evt.clientX, lastClientY:evt.clientY, timestamp:ts, fromtouch:evt.fromtouch};
			let ctrl = this;
			setTimeout(async function() {
				if (ctrl.mousedowninfo) {
					let o = ctrl.mousedowninfo;
					if (!o.out && !o.moved && o.timestamp == ts) {
						//long press
						if (ctrl.onlongpress) ctrl.onlongpress(evt);
						else ctrl.elevate(evt, 'longpress');

						/*ctrl.$root.dragstatus.active = null;
						let result = await choiceoverlay.showChoice (ctrl.stackinfo.longpressoperations, {'addcancel':true});
						if (result) ctrl.$root.gamecontrol.stackOperation (ctrl.id, result);
						*/
					}
				}
			},500);
			this.elevate(evt, evtname);
		},
		makechildrendims:function() {
			let childrendims = {};
			if (this.$children && this.$children.length > 0) for (let i = 0; i < this.$children.length; i++) {
				if (!this.$children[i].id) continue;
				let childel = this.$children[i].$el;
				let pos = getPositionRelativeTo(childel, document.body) || {};
				pos.width = childel.offsetWidth;
				pos.height = childel.offsetHeight;
				childrendims[this.$children[i].id] = pos;
			}
			return childrendims;
		},
		ontouchstart:function (evt, evtname) {
			evt.clientX = evt.changedTouches[0].clientX;
			evt.clientY = evt.changedTouches[0].clientY;
			evt.fromtouch = true;
			DefaultEventHandlers.touchsupported = true;

			this.childrendims = this.makechildrendims();

			this.onmousedown (evt, 'mousedown');
		},
		onmousemove:function(evt, evtname) {
			if (this.mousedowninfo) {
				let o = this.mousedowninfo;
				o.lastClientX = evt.clientX;
				o.lastClientY = evt.clientY;
				if (!o.moved && (Math.abs(o.initClientY - o.lastClientY) > 1 || Math.abs(o.initClientX - o.lastClientX) > 1)) {
					o.moved = true;
				}
			}
			this.elevate(evt, evtname);
		},
		ontouchmove:function (evt, evtname) {
			evt.clientX = evt.changedTouches[0].clientX;
			evt.clientY = evt.changedTouches[0].clientY;
			//evt.evtname = 'mousemove';
			evt.fromtouch = true;
			//console.log(this.id);

			if (!this.childrendims) this.childrendims = this.makechildrendims();
			if (this.childrendims) {
				let childrendims = this.childrendims;
				if (this.$children && this.$children.length > 0) for (let i = 0; i < this.$children.length; i++) {
					let dim = childrendims[this.$children[i].id];
					if (!dim) continue;
					let inside = evt.clientX >= dim.x && evt.clientX < dim.x + dim.width && evt.clientY >= dim.y && evt.clientY < dim.y + dim.height?true:false;
					if (dim.inside && !inside) {
						this.$children[i].onmouseout(evt, 'mouseout');
					} else if (!dim.inside && inside) {
						this.$children[i].onmouseover(evt, 'mouseover');
						this.$children[i].onmousemove(evt, 'mousemove');
					} else if (dim.inside && inside) {
						this.$children[i].onmousemove(evt, 'mousemove');
					}
					dim.inside = inside;
				}
			}

			this.onmousemove(evt, 'mousemove');
		},
		onmouseup:function(evt, evtname) {
			if (evt.which && evt.which > 1) return;
			if (DefaultEventHandlers.touchsupported && !evt.fromtouch) {
				return;
			}
			if (this.mousedowninfo && !this.mousedowninfo.out && !this.mousedowninfo.moved) {
				//console.log(this.$options.name,'CLICK');
				if (this.onclick) this.onclick(evt);
				else this.elevate(evt, 'click');
			}
			this.mousedowninfo = null;
			this.elevate(evt, evtname);
		},
		ontouchend:function (evt, evtname) {
			//evt.evtname = 'mouseup';
			evt.clientX = evt.changedTouches[0].clientX;
			evt.clientY = evt.changedTouches[0].clientY;
			evt.fromtouch = true;
			this.childrendims = null;
			this.onmouseup(evt, 'mouseup');
		}
	},
	merge:function (o) {
		for (let k in this.eventhandlers) if (!o[k]) o[k] = this.eventhandlers[k];
		return o;
	}
}

///=============
async function loadComponent(comp) {
	let dataf = window.httpVueLoader('./' +comp+'.vue');
	let result;
	try {
		result = await dataf();
	} catch (e) {
		console.log ('error loading ' + comp);
		throw e;
	}
	result.methods = {...DefaultEventHandlers.eventhandlers, ...result.methods};
	return result;
}


async function loadComponents () {
	var toload = ['card','cardstack','playerplate','token'];
	var ps = {};
	for (let i = 0; i < toload.length; i++) {
		let cd = await loadComponent(toload[i]);
		ps[toload[i]] = cd;
	}
	/*
	ps['card'].components = {
		'token':ps['token']
	};
	ps['cardstack'].components = {
		'card':ps['card'],
		'token':ps['token']
	};
	ps['playerplate'].components = {
		'token':ps['token']
	};
	*/
	return ps;
}

//===============

function generateLayoutHtml (data) {
	var props = data.props || {};
	var h = [], t;
	h.push ("<");
	if (data.type == 'cardstack') h.push (t = "cardstack");
	else h.push (t = "div");
	if (data.type == 'cardstack') {
		if (data.key) h.push (' key="'+data.key+'"');
		for (let k in props) h.push (' '+k+'="'+props[k]+'"');
	}
	if (data.styleobject) h.push (' style="'+( data.styleobject)+'"');
	if (data.classobject) h.push (' class="'+data.classobject+'"');
	if (data.eleid) h.push (' id="'+data.eleid+'"');
	h.push (">");
	var cs = data.children;
	if (cs) for (let i = 0; i < cs.length; i++) {
		h.push (generateLayoutHtml (cs[i]));
	}

	if (data.showotherplayerareas) {
		h.push ("<div class='stackdescription'></div>");
		h.push (`<div v-for="player in players" v-if="!isMyPlayer(player)" class="aplayerarea">
		<div class='playername'>{{player.name || '#' + (player.order + 1)}}</div>
		<cardstack v-bind:key="'player_'+player.order+'_handstack'" v-bind:stackid="'player_'+player.order+'_handstack'">
		</cardstack>
		<cardstack v-bind:key="'player_'+player.order+'_effectstack'" v-bind:stackid="'player_'+player.order+'_effectstack'">
		</cardstack>
	</div>`);
	}

	h.push ("</"+t+">");
	return h.join('');
}


function prepareAppOptions (prms) {
	//prms: gameControl, allcardsidx, playerplateinfo, cardstackinfo, layoutinfo
	//var cardstackstatus = {};
	//var cardstatus = {};
	var stacktokens = {};
	//for (let k in prms.allcardsidx) cardstatus[k] = {'selected':false};
	var stackcards = {};
	/*
	for (let k in prms.cardstackinfo) if (prms.cardstackinfo[k].privacy == 'PRIVATE' || prms.cardstackinfo[k].privacy == 'PUBLIC') {
		//cardstackstatus[k] = {'targeted':false};
		stackcards[k] = [];
		stacktokens[k] = [];
	}
	*/
	stackcards['overlaystack'] = [];
	stacktokens['overlaystack'] = [];




var output = {
	el:'#bb',
	data:{
		'gamecontrol':prms.gameControl,
		//'roominfo':{'roomnum':null, 'myname':'', 'hostid':null},
		//'players':[],
		//'allcardsidx':prms.allcardsidx,
		//'alltokensidx':prms.alltokensidx,
		//'cardstatus':cardstatus,
		//'hostid':null,
		//'myid':prms.gameControl.getMyId(),
		/*'layoutdata':prms.layoutinfo || {
			'styleobject':'display:flex;flex:1 1 0;overflow:hidden;flex-direction:column',
			'children':[
				{
					'type':'container',
					'key':'div_otherplayerarea',
					'props':{
						'eleid':'otherplayerarea',
						'styleobject':'flex: 0 1 40%;display: flex;border: solid 1px black;background: #ffffee;overflow: hidden',
						'classobject':'otherplayerarea',
						'showotherplayerareas':true
					}
				},
				{
					'type':'container',
					'key':'div_publicarea',
					'props':{
						'eleid':'publicarea',
						'styleobject':'flex: 0 1 20%; background: #f3fff3; display: flex; overflow: hidden;',
						'children':[
							{'type':'cardstack', 'key':'discardstack2', 'props':{'stackid':'discardstack2', 'eleid':'discardstack2', 'styleobject':'flex: 0 1 10%;overflow:hidden;height:80%; border:solid 1px black; padding:1vh; display:flex;flex-direction:row;align-items:flex-start;'}},
							{'type':'cardstack', 'key':'discardstack', 'props':{'stackid':'discardstack', 'eleid':'discardstack', 'styleobject':'flex: 1 1 auto;overflow:hidden; border:solid 1px black; padding:1vh; display:flex; flex-direction:row; align-items:flex-start;'}},
							{'type':'cardstack', 'key':'drawstack', 'props':{'stackid':'drawstack', 'eleid':'drawstack', 'styleobject':'flex:0 0 10vh; border:solid 1px black;padding:1vh; display:flex;flex-direction:column;align-items:flex-start;'}},
						]
					},
				},
				{
					'type':'cardstack',
					'key':'effectstack',
					'props':{'stackid':'effectstack', 'eleid':'effectstack', 'styleobject':'flex:0 1 20%;border:solid 1px black; background: #f3f3f3;padding:1vh; display:flex;'},
				},
				{
					'type':'cardstack',
					'key':'handstack',
					'props':{'stackid':'handstack', 'eleid':'handstack', 'styleobject':'flex:0 1 20%;border:solid 1px black; background: #dddddd;padding:1vh; display:flex;'},
				}
			]

		},*/
		'playercards':{

		},
		//'playerplatestatus':{		},
		//'playerplateinfo':prms.playerplateinfo,
		//'cardstackinfo':prms.cardstackinfo,
		//'cardstackstatus':cardstackstatus,
		'stacktokens':stacktokens,
		'stackcards':stackcards,
		'dragstatus':{
			'active':false,
			'fromstack':null,
			'itemstodrag':[],
			'pos0':{'x':null,'y':null},
			'devi':{'x':null,'y':null},
			'dest':null
		},
		'reflectingstackid':null,
	},
	computed:{
		'players':function() {
			return this.$store.getters.getPlayers();
		},
		'roominfo':function() {
			return this.$store.state.roominfo;
		},
		'myid':function() {
			return this.$store.state.myid;
		}
	},
	methods:{
		...DefaultEventHandlers.eventhandlers,
		isMyPlayer:function (player) {
			let i = typeof player=='object'?player.order:player;
			return this.$store.getters.getMyPlayerIndex()==i?true:false;
		},
		myPlayerIndex:function() {
			if (this.players) for (let i = 0; i < this.players.length; i++) {
				if (this.isMyPlayer(this.players[i])) return i;
			}
			return null;
		},
		/*
		getStackInfo:function (stackid, playeridx) {
			if (playeridx != null && !this.isMyPlayer(playeridx)) {
				stackid = 'otherplayer_'+stackid;
			}
			return this.cardstackinfo[stackid.replace(/^player_\d+_/, 'otherplayer_')];
		},
		getStackStatus:function (stackid, playeridx) {
			if (playeridx != null && !this.isMyPlayer(playeridx)) {
				stackid = 'player_'+playeridx+'_'+stackid;
			}
			if (!this.cardstackstatus[stackid]) Vue.set (this.cardstackstatus, stackid, {});
			return this.cardstackstatus[stackid];
		},
		stackIsFaceDown:function (stackid) {
			let stackinfo = this.getStackInfo(stackid);
			let stackstatus = this.$store.getters.getStackStatus(stackid);//this.getStackStatus(stackid);
			if (!stackinfo || !stackinfo.cardalwaysshowback) return false;
			else {
				let myplayerindex = this.myPlayerIndex();
				if (myplayerindex != null && stackstatus && stackstatus.viewablebyplayer && stackstatus.viewablebyplayer[myplayerindex]) return false;
				else return true;
			}
		},
		stackkey:function (stackid) {
			let stackinfo = this.getStackInfo(stackid);
			let k = stackinfo.id;
			//if (this.$store.getters.getStackStatus(stackid).targeted) k += '/TARGETED';
			//if (this.stackIsFaceDown(stackid)) k += '/BACK';
			return k;
		},
		playerplatekey:function (playeridx) {
			let k = playeridx + '';
			k += '('+(this.players[playeridx].name||'')+')';
			k += this.$store.getters.getPlayerPlateStatus(playeridx).targeted?'/TARGETED':'';
			return k;
		},
		isMyPlayer:function (player) {
			if (typeof player == 'number' || typeof player == 'string') player = this.players[player];
			if (!player) return null;
			if (player.id == this.myid) return true;
			return false;
		},
		*/
		hostBtnClick:async function() {
			let userinputs = await ChoiceOverlay.getInstance().showInput([{'name':'name', 'display':'Your name', 'value':this.roominfo.myname}]);
			if (!userinputs) return;
			//if (userinputs['name']) this.roominfo.myname = userinputs['name'];
			this.gamecontrol.hostRoom(userinputs);
		},
		joinBtnClick:async function() {
			let userinputs = await ChoiceOverlay.getInstance().showInput([{'name':'roomnum', 'display':'Room'},{'name':'name', 'display':'Your name', 'value':this.roominfo.myname}]);
			if (!userinputs) return;
			//if (userinputs['name']) this.roominfo.myname = userinputs['name'];
			this.gamecontrol.joinRoom(userinputs);
		},


		onmouseup:function (e) {
			if (this.dragstatus.active) {
				this.dragstatus.active = false;
				let moved = false;
				let destinfo = this.gamecontrol.parseCompid(this.dragstatus.dest);
				let itemstodrag = this.dragstatus.itemstodrag;
				if (this.dragstatus.dest) {
					if (itemstodrag && itemstodrag.length > 0) {
						let targetstack;
						let setcompstatusops = [];
						if (destinfo.playerplateidx != null) {
							targetstack = 'player_'+destinfo.playerplateidx+'_'+this.$store.getters.getPlayerPlateInfo().dragdefaultstack;
						} else if (destinfo.stackid) {
							targetstack = destinfo.stackid;
						}
						if (targetstack) {
							if (itemstodrag[0].comptype == 'token') {
								this.gamecontrol.stackOperation(targetstack, {'cmd':'MOVETOKENS', 'tokenids':itemstodrag});
							} else {
								this.gamecontrol.stackOperation(targetstack, {'cmd':'MOVECARDS', 'cardids':itemstodrag});
							}
							setcompstatusops.push({...destinfo, field:'targeted', value:false});
						}
						for (let i = 0; i < itemstodrag.length; i++) {
							if (itemstodrag[i].comptype != 'card') continue;
							let cardid = itemstodrag[i]; if (typeof cardid == 'object') cardid = cardid.id;
							if (this.$store.getters.getCardStatus(cardid, 'selected'))
								setcompstatusops.push({'cardid':cardid, field:'selected', value:false});
						}
						if (setcompstatusops.length > 0) this.gamecontrol.setCompStatusField({'operations':setcompstatusops});
					}
				}
				let setcompstatusops1 = [];
				if (itemstodrag) for (let i = 0; i < itemstodrag.length; i++) {
					if (itemstodrag[i].comptype == 'card' && this.$store.getters.getCardStatus(itemstodrag[i].id, 'beingdragged'))
						setcompstatusops1.push({'cardid':itemstodrag[i].id, field:'beingdragged', value:false});
				}
				if (setcompstatusops1.length > 0) this.gamecontrol.setCompStatusField({'operations':setcompstatusops1});
				if (this.dragstatus.cardreordered && !moved) {
					//this.gamecontrol.moveCardsToStack (this.dragstatus.cardstodrag, null, {'notifychange':true});
				}
				this.dragstatus.itemstodrag = [];
				this.dragstatus.dest = null;
				this.stackcards['overlaystack'] = [];
				this.stacktokens['overlaystack'] = [];
			}
		},
		onmousemove:function (e) {
			if (this.dragstatus.active) {
				this.dragstatus.devi.x = e.clientX - this.dragstatus.pos0.x;
				this.dragstatus.devi.y = e.clientY - this.dragstatus.pos0.y;
				if (this.dragstatus.active == 'READY' && (Math.abs(this.dragstatus.devi.x) > 2 || Math.abs(this.dragstatus.devi.y) > 2)) {
					this.dragstatus.active = 'ACTIVE';
					let selecteditems, itemtype, stackitems;

					if (this.dragstatus.itemstodrag&&this.dragstatus.itemstodrag.length > 0) {
						selecteditems = this.dragstatus.itemstodrag;
						itemtype = selecteditems[0].comptype;
						stackitems = this[itemtype=='token'?'stacktokens':'stackcards']['overlaystack'] = [];
					}

					let setcardstatus = [];
					if (selecteditems) for (var i = 0; i < selecteditems.length; i++) {
						let itemid = selecteditems[i].id;
						let basedim;
						let ele = document.getElementById(itemtype+'_'+itemid);
						if (ele) basedim = getPositionRelativeTo(ele, this.$el);
						else basedim = {};
						basedim.height = ele.offsetHeight;
						basedim.width = ele.offsetWidth;
						stackitems.push ({'id':itemid, 'showback':selecteditems[i].showback, 'overlayinfo':{'order':i, 'basedim':basedim, 'dragdev':this.dragstatus.devi}});
						if (selecteditems[i].comptype=='card') {
							setcardstatus.push ({'cardid':selecteditems[i].id, 'field':'beingdragged', 'value':true});
						}
					}
					if (setcardstatus.length > 0) this.gamecontrol.setCompStatusField ({'operations':setcardstatus});

				}
			}
		},

		oncardclick (cardid) {
			let app = this;
			let v = this.gamecontrol.getCardInStack(cardid);
			let c = null;
			if (v) {c = v.fullstack;} else return;
			let stackinfo = app.$store.getters.getCardStackInfo(c) || {};
			if (stackinfo.onclickaction) {
				if (stackinfo.onclickaction.action == 'MOVECARD') {
					let s = app.$store.getters.getStackCards(v.fullstack);
					let cardid1 = s[s.length-1];
					//if(app.cardstatus[cardid1]) app.cardstatus[cardid1].selected = null;
					this.gamecontrol.stackOperation (stackinfo.onclickaction.dest, {'cmd':'MOVECARDS', 'cardids':cardid1, 'tobottom':stackinfo.onclickaction.tobottom});
				}
			} else if (stackinfo.cardselectable) {
				let cs = app.$store.getters.getCardStatus(cardid, 'selected');
				app.gamecontrol.setCompStatusField({'cardid':cardid, 'field':'selected', 'value':!cs});
				/*
				if (!app.cardstatus[cardid]) app.cardstatus[cardid] = {};
				let b = !app.cardstatus[cardid].selected;
				app.cardstatus[cardid].selected = b;
				*/
			}

		},
		oncardmousedown (cardcomp, evt) {
			let app = this;
			let stackid = cardcomp.$parent.id;
			let stackinfo = app.$store.getters.getCardStackInfo(stackid) || {};
			if (stackid && stackinfo.carddraggable) {
				let seled = [];
				let stackcards = this.$store.getters.getStackCards(stackid) || [];
				for (let i = 0; i < stackcards.length; i++) if (this.$store.getters.getCardStatus(stackcards[i], 'selected')) seled.push ({'id':stackcards[i], 'comptype':'card'});
				let todrag = [];
				if (seled.length == 0) todrag.push ({'id':cardcomp.cardid, 'showback':cardcomp.showback, 'comptype':'card'});
				else if (seled.length > 0 && this.$store.getters.getCardStatus(cardcomp.cardid, 'selected')) todrag = seled;
				else return;
				app.dragstatus.fromstack = stackid;
				app.dragstatus.itemstodrag = todrag;
				app.dragstatus.active = 'READY';
				app.dragstatus.pos0.x = evt.clientX;
				app.dragstatus.pos0.y = evt.clientY;
				app.dragstatus.devi.x = 0;
				app.dragstatus.devi.y = 0;
				app.dragstatus.comptype = 'card';
			}
		},
		oncardmousemove (comp, evt) {
			//console.log(comp.$options.name, this.dragstatus.active, this.dragstatus.itemstodrag[0].comptype, this.dragstatus.itemstodrag.length, this.dragstatus.itemstodrag[0].id, comp.cardid);
			if (comp.$options.name == 'card' && this.dragstatus.active == 'ACTIVE' && this.dragstatus.itemstodrag[0].comptype == 'card' && this.dragstatus.itemstodrag.length == 1 && this.dragstatus.itemstodrag[0].id != comp.cardid) {
				let result1 = this.gamecontrol.getCardInStack(this.dragstatus.itemstodrag[0].id);
				let result2 = this.gamecontrol.getCardInStack(comp.cardid);
				if (result1 && result2 && result1.fullstack == result2.fullstack) {
					let cardele = comp.$el;
					let dragcardele = document.getElementById('card_'+this.dragstatus.itemstodrag[0].id);
					let cardeleimg = cardele.querySelector('img');
					let offsetWidth = Math.max(cardele.offsetWidth, cardeleimg?cardeleimg.offsetWidth:0);
					let offsetHeight = Math.max(cardele.offsetHeight, cardeleimg?cardeleimg.offsetHeight:0);
					let eoffsetX = evt.offsetX, eoffsetY = evt.offsetY;
					let pos = getPositionRelativeTo(cardele, document.body);
					let pos1 = getPositionRelativeTo(dragcardele, document.body);
					if (eoffsetX == null || eoffsetY == null) {
						eoffsetX = evt.clientX - pos.x;
						eoffsetY = evt.clientY - pos.y;
					}
					let useratio = Math.abs(pos.x - pos1.x) >= Math.abs(pos.y - pos1.y)?eoffsetX / offsetWidth:eoffsetY / offsetHeight;
					let targetindex;
					if (result2.index < result1.index) {
						targetindex = useratio < 0.3?result2.index:result2.index+1;
					} else {
						targetindex = useratio > 0.7?result2.index:result2.index-1;
					}
					if (targetindex != result1.index) {
						this.gamecontrol.moveCardWithinStack (result1.fullstack, {'src':result1.index, 'dest':targetindex});
						comp.$parent.childrendims = null;
						this.dragstatus.cardreordered = true;
					}
				}
			}
		},
		onComponentMouseIn (comp) {
			let compid = comp.id;
			let compname = comp.$options.name;
			if (this.dragstatus.active) {

				if (this.dragstatus.fromstack == compid || this.dragstatus.dest == compid) return;
				let newdest = null;


				if (compid != this.dragstatus.fromstack && this.dragstatus.dest != compid) {
					if (comp.$options.name == 'cardstack') {
						let stackinfo = this.$store.getters.getCardStackInfo(comp.stackid) || {};
						if (stackinfo.dragtargetable || this.dragstatus.itemstodrag[0].comptype == 'token') {
							newdest = compid;
						}
					} else if (comp.$options.name == 'playerplate') {
						if (this.$store.getters.getPlayerPlateInfo().dragtargetable) {
							newdest = compid;
						}
					}
					if (newdest) this.gamecontrol.setCompStatusField({...this.gamecontrol.parseCompid(compid), field:'targeted', value:true});
				}
				if (newdest && this.dragstatus.dest) {
					this.gamecontrol.setCompStatusField({ ...this.gamecontrol.parseCompid(this.dragstatus.dest), 'field':'targeted', 'value':false});
				}
				if (newdest) this.dragstatus.dest = newdest;

			}
		},
		onComponentMouseOut (comp) {
			let compid = comp.id;
			if (this.dragstatus.active && this.dragstatus.dest == compid) {
				this.dragstatus.dest = null;
				this.gamecontrol.setCompStatusField({'stackid':compid, 'field':'targeted', 'value':false});
				//cardstackcomp.$forceUpdate();
			}
		},	
		ontokenmousedown:function (comp, evt) {
			let stackid = comp.$parent.id;
			if (stackid) {
				this.dragstatus.fromstack = stackid;
				this.dragstatus.itemstodrag = [{'id':comp.tokenid, 'comptype':'token'}];
				this.dragstatus.active = 'READY';
				this.dragstatus.pos0.x = evt.clientX;
				this.dragstatus.pos0.y = evt.clientY;
				this.dragstatus.devi.x = 0;
				this.dragstatus.devi.y = 0;
				this.dragstatus.comptype = 'token';
			}
		},
		onchildevent:function (comp, evtname, evt) {
			let evtname0 = evtname;
			if (!evtname && evt) evtname = evt.evtname || evt.type;
			let comptype = comp.$options.name;
			//console.log(evtname,comp.$options.name);
			if (ChoiceOverlay.getInstance().isShowing()) return;

			if (comptype == 'card') {
				if (evtname == 'click') this.oncardclick(comp.cardid);
				else if (evtname == 'mousedown') this.oncardmousedown(comp, evt);
				else if (evtname == 'mouseover' && this.dragstatus.active) {
					this.onComponentMouseIn(comp);
				} else if (evtname == 'mousemove' && this.dragstatus.active) {
					this.oncardmousemove(comp,evt);
				}
			} else if (comptype == 'token') {
				if (evtname == 'mousedown') this.ontokenmousedown(comp,evt);
			} else if (comptype == 'cardstack') {
				if (evtname == 'mouseover') this.onComponentMouseIn(comp);//this.gamecontrol.oncardstackmousein (comp, evt);
				else if (evtname == 'mouseout') this.onComponentMouseOut(comp);//this.gamecontrol.oncardstackmouseout (comp, evt);
				//else if (evtname == 'longpress') this.dragstatus.active = null;
			} else if (comptype == 'playerplate') {
				if (evtname == 'mouseover') this.onComponentMouseIn(comp);
				else if (evtname == 'mouseout') this.onComponentMouseOut(comp);
			}
		}
	}
	
};
return output;


}