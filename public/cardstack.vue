<template>
<div v-bind:id="showeleid" v-bind:class="classObject" v-on:mouseover="onmouseover" v-on:mouseout="onmouseout" v-on:mousedown="onmousedown" v-on:mouseup="onmouseup" v-on:mousemove="onmousemove" v-on:touchstart="ontouchstart" v-on:touchend="ontouchend" v-on:touchmove="ontouchmove">
	<div style="position:absolute;top:0;right:0;z-index:10;" class="stacktokenarea">
		<token v-for="item in tokens" v-bind:tokenid="item" v-bind:key="item">
		</token>
	</div>
	<div class='stackdescription'></div>
	<card v-for="item in cards" v-bind:cardid="item" v-bind:key="item" v-bind:alwaysshowback="showbackstack">
		</card>

</div>
</template>



<script>
module.exports = {
	'props':['stackid', 'eleid', 'classes', 'flags'],
	data() {
		return {
			'id':this.stackid,
			//'purpose':(this.stackinfo||{}).purpose,
			//'playerorder':(this.playerinfo||{}).order,
		}
	},
	computed:{
		'playeridx':function () {
			return (this.stackid||'').match(/^player_(\d+?)_/)?RegExp.$1:null;
		},
		'showeleid':function () {
			return this.eleid || 'cardstack_'+this.stackid;
		},
		'stackinfo':function () {
			if (!this.stackid) return null;
			return this.$store.getters.getCardStackInfo(this.stackid);
		},
		'playerinfo':function() {
			return this.playeridx==null?null:this.$store.getters.getPlayer(this.playeridx);
		},
		'cards':function () {
			if (!this.stackid) return null;
			return this.$store.getters.getStackCards(this.stackid);
		},
		'tokens':function () {
			if (!this.stackid) return null;
			return this.$store.getters.getStackTokens(this.stackid);
		},
		'stackstatus':function() {
			if (!this.stackid) return null;
			return this.$store.getters.getStackStatus(this.stackid);
		},
		'classObject':function () {
			let o = {
				'cardstack':true,
				'verticalctn':this.stackinfo&&this.stackinfo.carddirection=='vertical',
				'targeted':this.stackstatus?this.stackstatus.targeted:null
			};
			if (this.classes && typeof this.classes=='object') for (let k in this.classes) o[k] = this.classes[k];
			else if (typeof this.classes == 'string' && this.classes) {
				let s = this.classes.split(/\s+/);
				for (let i = 0; i < s.length; i++) o[s[i]] = true;
			}
			if (this.stackinfo && this.stackinfo.purpose) o[this.stackinfo.purpose] = true;
			return o;
		},
		'showbackstack':function () {
			if (!this.stackid) return null;
			let stackinfo = this.stackinfo;
			let stackstatus = this.stackstatus; //$store.getters.getStackStatus(stackid);//this.getStackStatus(stackid);
			let s;
			if (!stackinfo || !stackinfo.cardalwaysshowback) s = false;
			else {
				let myplayerindex = this.$store.getters.getMyPlayerIndex();
				if (myplayerindex != null && stackstatus && stackstatus.viewablebyplayer && stackstatus.viewablebyplayer[myplayerindex]) s = false;
				else s = true;
			}
			return s;
		}
	},
	methods:{
		cardkey:function (card) {
			var k = card.id;
			var cstatus = this.$store.getters.getCardStatus(card.id);

			k += (cstatus&&cstatus.selected?'/SELECTED':'')+(this.showbackstack?'/BACK':'');
			//console.log(k);
			return k;
		},
		onlongpress:async function () {
			if (!this.stackinfo || !this.stackinfo.longpressoperations) return;
			this.$root.dragstatus.active = null;
			let choices = [];
			for (let i = 0; i < this.stackinfo.longpressoperations.length; i++) {
				let o = this.stackinfo.longpressoperations[i];
				if (o.generateperplayer) {
					let myplayeridx = this.$store.getters.getMyPlayerIndex();
					let players = this.$store.getters.getPlayers();
					if (players) for (let j = 0; j < players.length; j++) {
						if (j == myplayeridx) continue;
						let o1 = JSON.parse(JSON.stringify(o));
						delete o1['generateperplayer'];
						if (o1.value) for (let k in o1.value) {
							if (o1.value[k] == "[PLAYERINDEX]") o1.value[k] = j;
						}
						if ((o1['display']+'').match(/\[PLAYERNAME\]/)) {
							let p = this.$root.players[j];
							o1['display'] = o1['display'].replace(/\[PLAYERNAME\]/, p.name || '#'+((p.order||0)+1));
						}
						choices.push (o1);
					}
				} else
					choices.push (o);
			}
			if (choices.length == 0) return;
			let result = await ChoiceOverlay.getInstance().showChoice (choices);
			if (result) this.$root.gamecontrol.stackOperation (this.id, result);
		},
		onchildevent:function (comp, evtname, evt) {
			let processed = false;
			if (comp.$options.name == 'card' && evtname == 'click') {
				let stackinfo = this.stackinfo;
				if (stackinfo && stackinfo.oncardclickaction) {
					while (stackinfo.oncardclickaction.cmd) {
						let prm = JSON.parse(JSON.stringify(stackinfo.oncardclickaction));
						if (prm.cmd == 'SHOWSTACKINDETAIL' && this.flags && typeof this.flags == 'object' && this.flags.reflecting) {
							break;
						}
						prm.cardid = comp.cardid;
						let ctrl = this;
						setTimeout(function() {
							ctrl.$root.gamecontrol.stackOperation (ctrl.id, prm);
						}, 10);
						processed = true;
						break;
					}
				}
			}
			if (!processed) this.elevate(evt,evtname,comp);
		}
	}
};
</script>

<style scoped>
div.cardstack {
	/*overflow:hidden;*/
}
.cardstack {position:relative;}
.cardstack.verticalctn {flex-direction:column;}

div.verticalctn .cardclass > img, div.verticalctn .cardclass, div.verticalctn .cardwrap {width:100%;height:auto;}
div.verticalctn svg {width:100%;height:inherit;}

.stacktokenarea {pointer-events: none;max-width:100%;max-height:33%;overflow:hidden;}
.stacktokenarea > * {pointer-events: all;}

</style>
