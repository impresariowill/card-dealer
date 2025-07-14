<template>
	<div v-bind:class="{playertab:true, me:me, targeted:targeted, inactive:inactive}" v-on:mouseover="onmouseover" v-on:mouseout="onmouseout" v-on:touchstart="ontouchstart" v-on:touchend="ontouchend" v-on:touchmove="ontouchmove">{{displayname}}</div>
</template>

<script>
module.exports = {
	'props':['playerindex'],
	data() {
		return {
			'playerinfo':this.$store.getters.getPlayer(this.playerindex),
			'idx':this.playerindex,
			'id':'playerplate_'+this.playerindex,
			'order': this.playerindex,
		}
	},
	computed:{
		name:function() {
			return this.playerinfo?this.playerinfo.name:null;
		},
		targeted:function() {
			return this.$store.getters.getPlayerPlateStatus(this.idx, 'targeted');
		},
		me:function() {
			return this.$root.gamecontrol.getMyId() == (this.playerinfo||{}).id?true:false
		},
		displayname:function() {
			let l = '';
			if (this.name) l = this.name;
			else l = '#' + ((this.order||0)+1);
			return l ;//+ ' ' + (this.playerinfo&&this.playerinfo.id?'active':'quitted');
		},
		inactive:function() {
			return this.playerinfo&&this.playerinfo.id?false:true;
		},
	}
};
</script>


