
<template>
<div v-bind:class="classobject" v-bind:style="{position:overlayinfo?'absolute':null, height:overlayinfo?overlayheight:null, top:overlaytop, left:overlayleft, zIndex:3}" v-bind:id="eleid">
<div v-bind:class="{cardclass:true}" v-on:mousedown="onmousedown" v-on:mouseup="onmouseup" v-on:mouseout="onmouseout" v-on:mousemove="onmousemove" v-on:mouseover="onmouseover" v-on:touchstart="ontouchstart" v-on:touchend="ontouchend" v-on:touchmove="ontouchmove">
	<svg height="100" v-bind:width="aspectratio" />
	<img v-bind:src="imagesrcuse" v-if="showImg" draggable="false" />
	<div v-if="showNum" class="number-div">{{number}}</div>
	<!-- <div v-if="showback_xx" class="back"><img v-bind:src="backimgsrc" draggable="false" /></div> -->
</div>
</div>
</template>

<script>
module.exports = {
	'props':['alwaysshowback','overlayinfo','cardid'],
	data() {
		let cardid = this.cardid;
		let cardinfo = this.$store.getters.getCardInfo(cardid) || {};
		let cardstatus = this.$store.getters.getCardStatus(cardid) || {};
		return {
			'imagesrc':cardinfo.imagesrc,
			'backimgsrc':cardinfo.backimagesrc,
			'aspectratio':(cardinfo.aspectratio||66),
			'number':cardinfo.number||'',
			'id':'card_'+cardid
		}
	},
	computed:{
		'classobject':function() {
			let o = {};
			o['cardwrap'] = true;
			o['selected'] = this.$store.getters.getCardStatus(this.cardid, 'selected');
			o['overlay'] = this.overlayinfo?true:false;
			o['beingdragged'] = this.overlayinfo?false:this.$store.getters.getCardStatus(this.cardid, 'beingdragged');
			return o;
		},
		isSelected:function() {
			return ;
		},
		'showback':function() {
			return this.alwaysshowback && !(this.alwaysshowback+'').match(/^(false|no|n|0)$/i)?true:null;
		},
		eleid:function() {
			if (this.overlayinfo) return 'overlaycard_'+this.cardid;
			else return 'card_'+this.cardid;
		},
		imagesrcuse:function() {
			return this.showback?this.backimgsrc:this.imagesrc;
		},
		showNum:function() {
			return this.number != null && !this.showback && !this.imagesrc;
		},
		showImg:function() {
			return this.imagesrc && !this.showback || this.backimgsrc && this.showback;
		},
		overlayleft:function () {
			if (!this.overlayinfo) return null;
			//console.log('!!',this.overlayinfo);
			return (this.overlayinfo.dragdev.x || 0) + this.overlayinfo.basedim.x + 'px';
		},
		overlaytop:function() {
			if (!this.overlayinfo) return null;
			return (this.overlayinfo.dragdev.y || 0) + this.overlayinfo.basedim.y + 'px';
		},
		overlayheight:function() {
			if (!this.overlayinfo) return null;
			return this.overlayinfo.basedim.height + 'px';
		}
	}
	/*
	methods:{},DefaultEventHandlers.merge({
		
		clickHandler:function(e) {
			//console.log(this);
			//this.back = !this.back;
			//this.isSelected = !this.isSelected;
			let result = this.$root.gamecontrol.oncardclick(this.cardid);
		},
		onmousedown:function(e) {
			this.mousedowninfo = {};

			let result = this.$root.gamecontrol.oncardmousedown(this, e);
		}
		
	}),
	'template':'#card-template'
	*/
};
</script>


<style>
	.cardwrap {overflow:hidden;height:100%;position:relative;}
	.cardwrap:last-child {overflow:visible;}
	.cardclass {background:#ffffff;height:100%;border-radius:5px;display:block;position:relative;margin:0px;}
	.cardclass svg {width:auto;height:100%;}
	.cardclass > div, .cardclass > img {position: absolute;top:0;left:0;height:100%;width:auto;}
	.cardclass > div.back > img {height:100%;width:auto;}
	.selected {margin-top:-20px;}
	.beingdragged svg {background:#9999ff;}
	.beingdragged img {opacity:0.4}

</style>